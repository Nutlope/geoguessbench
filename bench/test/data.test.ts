/**
 * Checks the frozen dataset and the published results agree with each other.
 * Run after `pnpm score`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { countryAt } from "../lib/geo";
import { ENTRIES } from "../entries";

const dataset = JSON.parse(readFileSync("data/dataset.json", "utf8")) as { id: string; lat: number; lng: number; iso2: string; tier: string }[];
const rejected = new Set((JSON.parse(readFileSync("data/rejected.json", "utf8")) as { id: string }[]).map((r) => r.id));
const results = JSON.parse(readFileSync("site/src/data/results.json", "utf8"));
const photos = JSON.parse(readFileSync("site/public/data/photos.json", "utf8")) as { id: string; game: number; round: number; guesses: Record<string, { pts: number }> }[];

test("every photo is unique, on disk and in the country it claims", () => {
  assert.equal(new Set(dataset.map((d) => d.id)).size, dataset.length);
  for (const d of dataset) {
    assert.ok(existsSync(`data/images/${d.id}.jpg`), `missing image ${d.id}`);
    assert.equal(countryAt(d)?.iso2, d.iso2, `${d.id} truth country`);
  }
});

test("hand-rejected photos never reach the site", () => {
  for (const p of photos) assert.ok(!rejected.has(p.id), `${p.id} was rejected`);
});

test("the site shows whole games, one photo per round", () => {
  assert.equal(photos.length, results.meta.games * 5);
  assert.equal(results.meta.photos, photos.length);
  const slots = new Set(photos.map((p) => `${p.game}.${p.round}`));
  assert.equal(slots.size, photos.length);
});

test("every model answered every published photo", () => {
  for (const p of photos) for (const e of results.rows) assert.ok(p.guesses[e.key], `${e.key} missing on ${p.id}`);
  assert.equal(results.rows.length, ENTRIES.length);
});

test("leaderboard numbers can be recomputed from the photos", () => {
  for (const r of results.rows) {
    const mean = photos.reduce((a, p) => a + p.guesses[r.key].pts, 0) / photos.length;
    assert.equal(r.meanPts, Math.round(mean), r.key);
    assert.ok(Math.abs(r.gameMean - mean * 5) <= 1, r.key);
    assert.ok(r.gameCi[0] <= r.gameMean && r.gameMean <= r.gameCi[1], `${r.key} interval contains its mean`);
  }
  for (let i = 1; i < results.rows.length; i++) assert.ok(results.rows[i - 1].gameMean >= results.rows[i].gameMean, "sorted by score");
});

test("the leader is tied with itself and the tie flag matches its interval", () => {
  for (const r of results.rows) assert.equal(r.tiedWithTop, r.key === results.rows[0].key || r.gapCi[0] <= 0, r.key);
});
