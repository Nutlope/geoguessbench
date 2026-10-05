/**
 * Builds the frozen GeoGuessBench location set.
 *
 *   pnpm dataset --target 200 --seed 2026
 *
 * One photo per seed place (so no two rounds share a city), at most
 * --per-country places per country. Every photo is re-encoded to 1024 px
 * JPEG, which also strips EXIF (GPS tags never reach a model), then gated by
 * a vision check for "outdoor, street-level, guessable, no location overlay".
 * Resumable: rerun to top up; existing entries are kept.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import { loadEnv } from "./lib/env";
import { countryAt, countryByName } from "./lib/geo";
import { mulberry32, shuffle } from "./lib/rng";
import { createRequire } from "node:module";
import { PLACES as SEEDS, type SeedPlace } from "./sources/seed-places";
import { panoramax, kartaview, type Candidate } from "./sources";

loadEnv();
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TARGET = Number(arg("target", "200"));
const SEED = Number(arg("seed", "2026"));
const PER_COUNTRY = Number(arg("per-country", "3"));
/** city: one photo per famous seed city. town: random GeoNames towns of 1k to 100k people. */
const TIER = arg("tier", "city") as "city" | "town";
const OUT = "data/dataset.json";
const IMG = "data/images";
mkdirSync(IMG, { recursive: true });

export type Location = {
  id: string;
  lat: number; lng: number;
  country: string; iso2: string; region: string; subregion: string; flag: string;
  place: string;
  source: string; sourceUrl: string; author?: string; license: string; capturedAt?: string;
  width: number; height: number;
  tier: "city" | "town";
  gate: { model: string; note: string };
};

const anthropic = new Anthropic();
const GATE_MODEL = "claude-haiku-4-5";
const GATE_PROMPT = `You are screening photos for a geolocation benchmark. Look at this photo and answer in JSON only:
{"outdoor_street": true|false, "overlay": true|false, "quality": "good"|"poor", "note": "max 12 words"}
outdoor_street: an outdoor photo taken at ground level on or beside a road, street or path, showing enough surroundings (buildings, road, vegetation, signs) that a person could reason about where it is.
overlay: the image has a watermark, timestamp, coordinates, map, or caption burned into it by the camera or uploader (ordinary street signs and shop names are NOT overlays).
quality: poor if mostly blurred, very dark, overexposed, mostly sky, mostly ground, mostly a car dashboard or windshield frame, an obstructed view, or a close-up of a single sign or object that fills most of the frame.`;

async function gate(jpeg: Buffer): Promise<{ ok: boolean; note: string }> {
  const r = await anthropic.messages.create({
    model: GATE_MODEL, max_tokens: 200,
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } }, { type: "text", text: GATE_PROMPT }] }],
  });
  const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return { ok: false, note: `unparsable: ${text.slice(0, 60)}` };
  const j = JSON.parse(m[0]);
  return { ok: j.outdoor_street === true && j.overlay === false && j.quality === "good", note: String(j.note ?? "") };
}

async function prepare(c: Candidate): Promise<{ jpeg: Buffer; width: number; height: number } | null> {
  const res = await fetch(c.imageUrl, { headers: { "User-Agent": "GeoGuessBench/0.1" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  const raw = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(raw).metadata();
  if (!meta.width || meta.width < 800) return null;
  // .rotate() applies EXIF orientation; sharp drops all metadata on output by default.
  const out = await sharp(raw).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const ratio = out.info.width / out.info.height;
  if (ratio < 1.1 || ratio > 2.2) return null; // landscape, not a pano strip or a portrait phone shot
  return { jpeg: out.data, width: out.info.width, height: out.info.height };
}

type Town = { name: string; country: string; population: number; loc: { coordinates: [number, number] } };
function townPlaces(): SeedPlace[] {
  const towns = (createRequire(import.meta.url)("all-the-cities") as Town[]).filter((t) => t.population >= 1000 && t.population <= 100000);
  const r = mulberry32(SEED + 1);
  const byIso = new Map<string, Town[]>();
  for (const t of towns) byIso.set(t.country, [...(byIso.get(t.country) ?? []), t]);
  const out: SeedPlace[] = [];
  // Up to 8 random towns per country; the round robin below interleaves countries.
  for (const [iso, list] of byIso) {
    const name = WORLD_NAME(iso);
    if (!name) continue;
    for (const t of shuffle(list, r).slice(0, 8)) out.push({ name: t.name, country: name, lat: t.loc.coordinates[1], lng: t.loc.coordinates[0], px: true, kv: true });
  }
  return out;
}
const WORLD_NAME = (iso: string) => (createRequire(import.meta.url)("world-countries") as { cca2: string; name: { common: string } }[]).find((c) => c.cca2 === iso)?.name.common;
const PLACES = TIER === "town" ? townPlaces() : SEEDS;

const rejectedIds = new Set<string>(existsSync("data/rejected.json") ? JSON.parse(readFileSync("data/rejected.json", "utf8")).map((r: { id: string }) => r.id) : []);
const existing: Location[] = (existsSync(OUT) ? (JSON.parse(readFileSync(OUT, "utf8")) as Location[]) : []).filter((l) => !rejectedIds.has(l.id));
const usedPlaces = new Set(existing.map((l) => l.place + "|" + l.country));
const perCountry = new Map<string, number>();
for (const l of existing) if (l.tier === TIER) perCountry.set(l.iso2, (perCountry.get(l.iso2) ?? 0) + 1);
// Photos removed by hand review: drop them and never refill those places.
const REJECTED: { id: string; place: string; country: string }[] = existsSync("data/rejected.json") ? JSON.parse(readFileSync("data/rejected.json", "utf8")) : [];
for (const r of REJECTED) usedPlaces.add(r.place + "|" + r.country);
const tierCount = () => results.filter((l) => l.tier === TIER).length;

const rng = mulberry32(SEED);
// Round-robin by country so the first places taken span as many countries as possible.
const byCountry = new Map<string, SeedPlace[]>();
for (const p of shuffle(PLACES, rng)) byCountry.set(p.country, [...(byCountry.get(p.country) ?? []), p]);
const order: SeedPlace[] = [];
for (let round = 0; order.length < PLACES.length; round++) {
  let added = false;
  for (const list of byCountry.values()) if (list[round]) { order.push(list[round]); added = true; }
  if (!added) break;
}

const results = [...existing];
const stats = { tried: 0, noPhotos: 0, badImage: 0, gated: 0, wrongCountry: 0, kept: 0 };
const limit = pLimit(12);

async function tryPlace(place: SeedPlace) {
  if (tierCount() >= TARGET) return;
  if (usedPlaces.has(place.name + "|" + place.country)) return;
  const iso = countryByName(place.country)?.iso2;
  if (iso && (perCountry.get(iso) ?? 0) >= PER_COUNTRY) return;
  stats.tried++;
  const prng = mulberry32(SEED ^ createHash("sha1").update(place.name).digest().readUInt32LE(0));
  const sources = [place.px && panoramax, place.kv && kartaview].filter(Boolean) as ((p: SeedPlace, r: () => number) => Promise<Candidate[]>)[];
  for (let attempt = 0; attempt < (TIER === "town" ? 2 : 4) && tierCount() < TARGET; attempt++) {
    const src = sources[(attempt + Math.floor(prng() * 2)) % sources.length];
    let cands: Candidate[] = [];
    try { cands = await src(place, prng); } catch { /* source hiccup */ }
    if (cands.length < 3) { stats.noPhotos++; continue; }
    const c = cands[Math.floor(prng() * cands.length)];
    const found = countryAt(c);
    if (!found || (iso && found.iso2 !== iso)) { stats.wrongCountry++; continue; }
    let img: Awaited<ReturnType<typeof prepare>> = null;
    try { img = await prepare(c); } catch { /* bad bytes */ }
    if (!img) { stats.badImage++; continue; }
    const g = await gate(img.jpeg).catch((e) => ({ ok: false, note: `gate error ${String(e).slice(0, 60)}` }));
    if (!g.ok) { stats.gated++; console.log(`  x ${place.name}: ${g.note}`); continue; }
    if (tierCount() >= TARGET || (perCountry.get(found.iso2) ?? 0) >= PER_COUNTRY) return;
    const id = createHash("sha1").update(c.source + c.photoId).digest("hex").slice(0, 10);
    writeFileSync(`${IMG}/${id}.jpg`, img.jpeg);
    results.push({
      id, lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6),
      country: found.name, iso2: found.iso2, region: found.region, subregion: found.subregion, flag: found.flag,
      place: place.name, source: c.source, sourceUrl: c.pageUrl, author: c.author, license: c.license, capturedAt: c.capturedAt,
      width: img.width, height: img.height, tier: TIER, gate: { model: GATE_MODEL, note: g.note },
    });
    perCountry.set(found.iso2, (perCountry.get(found.iso2) ?? 0) + 1);
    usedPlaces.add(place.name + "|" + place.country);
    stats.kept++;
    console.log(`+ ${TIER} ${tierCount()}/${TARGET} ${found.flag} ${place.name} (${c.source}) ${g.note}`);
    writeFileSync(OUT, JSON.stringify(results, null, 1));
    return;
  }
}

await Promise.all(order.map((p) => limit(() => tryPlace(p))));
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(stats, `countries: ${new Set(results.map((r) => r.iso2)).size}`);
