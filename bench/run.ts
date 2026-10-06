/**
 * Runs entries over the frozen dataset. Resumable: answers already in
 * data/runs/<entry>.jsonl are skipped, so rerunning only fills gaps.
 *
 *   pnpm bench --entries kimi-k3,claude-opus-5-5 --limit 10
 *   pnpm bench --all
 *
 * API failures retry with backoff and, if they keep failing, are left out
 * (and retried next run). An answer we cannot parse scores zero: that one is
 * on the model.
 */
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import pLimit from "p-limit";
import { loadEnv } from "./lib/env";
import { ENTRIES, entryByKey, type Entry } from "./entries";
import { callModel } from "./lib/call";
import { parseGuess } from "./lib/prompt";
import type { Location } from "./build-dataset";

loadEnv();
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const all = process.argv.includes("--all");
const keys = all ? ENTRIES.map((e) => e.key) : (arg("entries") ?? "").split(",").filter(Boolean);
const limitN = Number(arg("limit") ?? Infinity);
if (!keys.length) { console.log("pass --entries a,b or --all"); process.exit(1); }

const rejected = new Set<string>(existsSync("data/rejected.json") ? JSON.parse(readFileSync("data/rejected.json", "utf8")).map((r: { id: string }) => r.id) : []);
const dataset: Location[] = (JSON.parse(readFileSync("data/dataset.json", "utf8")) as Location[]).filter((l) => !rejected.has(l.id));
mkdirSync("data/runs", { recursive: true });

export type RunRow = {
  entry: string; loc: string; ts: number;
  text: string; guess: { lat: number; lng: number; country?: string; place?: string } | null;
  latencyMs: number; inTok: number; outTok: number; reasoningChars: number; costUsd: number; stop?: string;
};

function done(key: string): Set<string> {
  const f = `data/runs/${key}.jsonl`;
  if (!existsSync(f)) return new Set();
  return new Set(readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).loc));
}

async function runEntry(e: Entry) {
  const have = done(e.key);
  const todo = dataset.filter((l) => !have.has(l.id)).slice(0, limitN === Infinity ? undefined : Math.max(0, limitN - have.size));
  if (!todo.length) { console.log(`${e.key}: complete (${have.size})`); return; }
  console.log(`${e.key}: ${todo.length} to run`);
  const lim = pLimit(e.concurrency ?? 6);
  let ok = 0, failed = 0, spent = 0;
  await Promise.all(todo.map((loc) => lim(async () => {
    const b64 = readFileSync(`data/images/${loc.id}.jpg`).toString("base64");
    for (let attempt = 0; attempt < 4; attempt++) {
      const t0 = Date.now();
      try {
        const r = await callModel(e, b64);
        // Provider-side failures are retried, not scored: a stream that ended in
        // an error, or an empty reply. If the last try is still empty it counts.
        // A reply cut off by the token cap ("length", "max_tokens", "incomplete") is
        // the model's own doing and is scored as is.
        const capped = ["length", "max_tokens", "incomplete"].includes(r.stop ?? "");
        if (attempt < 3 && (r.stop === "error" || (!r.text.trim() && !capped))) throw new Error(`retryable: ${r.stop ?? "empty"} reply`);
        const latencyMs = Date.now() - t0;
        const costUsd = (r.inTok * e.inPerM + r.outTok * e.outPerM) / 1e6;
        const row: RunRow = { entry: e.key, loc: loc.id, ts: Date.now(), text: r.text, guess: parseGuess(r.text), latencyMs, inTok: r.inTok, outTok: r.outTok, reasoningChars: r.reasoningChars, costUsd, stop: r.stop };
        appendFileSync(`data/runs/${e.key}.jsonl`, JSON.stringify(row) + "\n");
        ok++; spent += costUsd;
        if (!row.guess) console.log(`  ${e.key} ${loc.id}: unparsable (${r.stop}) ${JSON.stringify(r.text.slice(-120))}`);
        return;
      } catch (err) {
        const msg = String((err as Error).message ?? err);
        const wait = /429|rate|overloaded|529|503|502|500|timeout|ECONN|fetch failed|retryable/i.test(msg) ? 4000 * 2 ** attempt : 1500;
        if (attempt === 3) { failed++; console.log(`  ${e.key} ${loc.id}: gave up: ${msg.slice(0, 160)}`); return; }
        console.log(`  ${e.key} ${loc.id}: retry ${attempt + 1} after ${((Date.now() - t0) / 1000).toFixed(0)}s: ${msg.slice(0, 120)}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  })));
  console.log(`${e.key}: +${ok} ok, ${failed} failed, $${spent.toFixed(3)}`);
}

await Promise.all(keys.map((k) => {
  const e = entryByKey.get(k);
  if (!e) { console.log(`unknown entry ${k}`); return; }
  return runEntry(e);
}));
