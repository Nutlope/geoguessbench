/**
 * Turns raw runs into the site's data files.
 *
 *   pnpm score
 *
 * Fairness rule: only photos that every included entry answered are scored,
 * so every row is measured on exactly the same set. A reply with no usable
 * coordinate scores 0 points at 20,000 km. Games are fixed groups of five
 * photos in a seeded order, the same for every model.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import sharp from "sharp";
import { ENTRIES } from "./entries";
import { haversineKm, points, countryAt } from "./lib/geo";
import { parseGuess, narration } from "./lib/prompt";
import { mulberry32, shuffle } from "./lib/rng";
import type { Location } from "./build-dataset";
import type { RunRow } from "./run";

const OUT = "site/src/data";
const IMG_OUT = "site/public/photos";
mkdirSync(OUT, { recursive: true });
mkdirSync(IMG_OUT, { recursive: true });

const rejected = new Set<string>(existsSync("data/rejected.json") ? JSON.parse(readFileSync("data/rejected.json", "utf8")).map((r: { id: string }) => r.id) : []);
const dataset: Location[] = (JSON.parse(readFileSync("data/dataset.json", "utf8")) as Location[]).filter((l) => !rejected.has(l.id));
const runs = new Map<string, Map<string, RunRow>>();
for (const e of ENTRIES) {
  const f = `data/runs/${e.key}.jsonl`;
  if (!existsSync(f)) continue;
  const m = new Map<string, RunRow>();
  for (const l of readFileSync(f, "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l) as RunRow; m.set(r.loc, r); }
  runs.set(e.key, m);
}
// Only entries that answered every photo are scored; a half-finished run is
// left out rather than shrinking the photo set for everyone else.
const entries = ENTRIES.filter((e) => {
  const m = runs.get(e.key);
  const missing = dataset.filter((l) => !m?.has(l.id)).length;
  if (missing) console.log(`skipping ${e.key}: ${missing} of ${dataset.length} photos not answered yet`);
  return m && !missing;
});
// Photos answered by every entry, in dataset order.
const common = dataset.filter((l) => entries.every((e) => runs.get(e.key)!.has(l.id)));
// Whole games only.
const nGames = Math.floor(common.length / 5);
const order = shuffle(common, mulberry32(7)).slice(0, nGames * 5);
const locs = order;
console.log(`${entries.length} entries, ${locs.length} photos, ${nGames} games`);

type Res = { km: number; pts: number; countryOk: boolean; guessCountry: string | null; parsed: boolean };
const res = new Map<string, Res[]>(); // entry -> per loc (aligned with locs)
for (const e of entries) {
  res.set(e.key, locs.map((l) => {
    const r = runs.get(e.key)!.get(l.id)!;
    const g = parseGuess(r.text);
    if (!g) return { km: 20000, pts: 0, countryOk: false, guessCountry: null, parsed: false };
    const km = haversineKm(l, g);
    const c = countryAt(g);
    return { km, pts: points(km), countryOk: c?.iso2 === l.iso2, guessCountry: c?.name ?? null, parsed: true };
  }));
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };

function bootstrap(vals: number[], B = 4000): [number, number] {
  const rng = mulberry32(99);
  const ms: number[] = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < vals.length; i++) s += vals[Math.floor(rng() * vals.length)]; ms.push(s / vals.length); }
  return [quant(ms, 0.025), quant(ms, 0.975)];
}

const THRESH = [1, 25, 200, 750, 2500];
const REGIONS = ["Europe", "Asia", "Americas", "Africa", "Oceania"];

const rows = entries.map((e) => {
  const r = res.get(e.key)!;
  const raw = locs.map((l) => runs.get(e.key)!.get(l.id)!);
  const pts = r.map((x) => x.pts);
  const games = Array.from({ length: nGames }, (_, g) => pts.slice(g * 5, g * 5 + 5).reduce((a, b) => a + b, 0));
  const [lo, hi] = bootstrap(pts);
  const byRegion: Record<string, { n: number; mean: number }> = {};
  for (const reg of REGIONS) {
    const idx = locs.map((l, i) => (l.region === reg ? i : -1)).filter((i) => i >= 0);
    if (idx.length) byRegion[reg] = { n: idx.length, mean: Math.round(mean(idx.map((i) => pts[i]))) };
  }
  const byTier: Record<string, { n: number; meanPts: number; gameMean: number; gameCi: [number, number]; medianKm: number; countryAcc: number }> = {};
  for (const tier of ["city", "town"]) {
    const idx = locs.map((l, i) => (l.tier === tier ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    const m = mean(idx.map((i) => pts[i]));
    const [tlo, thi] = bootstrap(idx.map((i) => pts[i]));
    byTier[tier] = { n: idx.length, meanPts: Math.round(m), gameMean: Math.round(m * 5), gameCi: [Math.round(tlo * 5), Math.round(thi * 5)], medianKm: Math.round(median(idx.map((i) => r[i].km)) * 10) / 10, countryAcc: mean(idx.map((i) => (r[i].countryOk ? 1 : 0))) };
  }
  return {
    byTier,
    key: e.key, name: e.name, maker: e.maker, open: e.open, mode: e.mode, provider: e.provider, model: e.model,
    n: r.length,
    meanPts: Math.round(mean(pts)),
    ci: [Math.round(lo), Math.round(hi)],
    gameMean: Math.round(mean(games)),
    gameCi: [Math.round(lo * 5), Math.round(hi * 5)],
    gameBest: Math.max(...games),
    perfectish: r.filter((x) => x.km < 1).length,
    medianKm: Math.round(median(r.map((x) => x.km)) * 10) / 10,
    countryAcc: mean(r.map((x) => (x.countryOk ? 1 : 0))),
    within: Object.fromEntries(THRESH.map((t) => [t, mean(r.map((x) => (x.km <= t ? 1 : 0)))])),
    parseFail: r.filter((x) => !x.parsed).length,
    costPerGame: mean(raw.map((x) => x.costUsd)) * 5,
    costTotal: raw.reduce((a, x) => a + x.costUsd, 0),
    latencyMedianS: Math.round(median(raw.map((x) => x.latencyMs)) / 100) / 10,
    outTokMean: Math.round(mean(raw.map((x) => x.outTok))),
    byRegion,
    games,
  };
}).sort((a, b) => b.meanPts - a.meanPts);

// Paired bootstrap: every model saw the same photos, so resample photos and
// recompute each model's gap to the leader on the same draw. If the 95%
// interval of the gap includes zero, that model is tied with the leader.
{
  const lead = rows[0].key;
  const lp = res.get(lead)!.map((x) => x.pts);
  for (const r of rows) {
    const rp = res.get(r.key)!.map((x) => x.pts);
    const rng = mulberry32(123);
    const diffs: number[] = [];
    for (let b = 0; b < 4000; b++) {
      let d = 0;
      for (let i = 0; i < lp.length; i++) { const j = Math.floor(rng() * lp.length); d += lp[j] - rp[j]; }
      diffs.push((d / lp.length) * 5);
    }
    const lo = quant(diffs, 0.025), hi = quant(diffs, 0.975);
    Object.assign(r, { gapToTop: Math.round((r.key === lead ? 0 : mean(lp) - mean(rp)) * 5), gapCi: [Math.round(lo), Math.round(hi)], tiedWithTop: r.key === lead || lo <= 0 });
  }
}

// Distance curve: share of guesses within d km, d log-spaced 0.1..20000.
const DS = Array.from({ length: 61 }, (_, i) => Math.round(10 ** (-1 + (i * 5.3) / 60) * 100) / 100);
const curves = Object.fromEntries(entries.map((e) => {
  const kms = res.get(e.key)!.map((x) => x.km);
  return [e.key, DS.map((d) => Math.round((kms.filter((k) => k <= d).length / kms.length) * 1000) / 1000)];
}));

// Head to head: share of games A outscored B (ties count half).
const h2h: Record<string, Record<string, number>> = {};
for (const a of rows) {
  h2h[a.key] = {};
  for (const b of rows) {
    if (a.key === b.key) continue;
    let w = 0;
    for (let g = 0; g < nGames; g++) w += a.games[g] > b.games[g] ? 1 : a.games[g] === b.games[g] ? 0.5 : 0;
    h2h[a.key][b.key] = Math.round((w / nGames) * 1000) / 1000;
  }
}

/** Keep explanations readable: cut long ones at a sentence end and say so. */
function clip(t: string, max = 520): string {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > 200 ? cut.slice(0, end + 1) : cut.trimEnd()) + " …";
}

// Per-photo detail for the explorer, plus web-sized photos.
const photos = await Promise.all(locs.map(async (l, i) => {
  const dest = `${IMG_OUT}/${l.id}.webp`;
  if (!existsSync(dest)) await sharp(`data/images/${l.id}.jpg`).resize({ width: 960 }).webp({ quality: 72 }).toFile(dest);
  const guesses = Object.fromEntries(entries.map((e) => {
    const r = runs.get(e.key)!.get(l.id)!;
    const g = parseGuess(r.text);
    const x = res.get(e.key)![i];
    return [e.key, g ? { lat: +g.lat.toFixed(4), lng: +g.lng.toFixed(4), km: Math.round(x.km * 10) / 10, pts: x.pts, place: g.place ?? null, country: x.guessCountry, said: clip(narration(r.text)) } : { lat: null, lng: null, km: null, pts: 0, place: null, country: null, said: clip(narration(r.text)) }];
  }));
  const avg = mean(Object.values(guesses).map((g) => g.pts));
  return {
    id: l.id, game: Math.floor(i / 5) + 1, round: (i % 5) + 1,
    lat: l.lat, lng: l.lng, country: l.country, iso2: l.iso2, flag: l.flag, region: l.region, place: l.place,
    source: l.source, sourceUrl: l.sourceUrl, author: l.author ?? null, license: l.license, capturedAt: l.capturedAt ?? null,
    tier: l.tier ?? "city", w: l.width, h: l.height, avgPts: Math.round(avg), guesses,
  };
}));

const meta = {
  version: "v2",
  updated: new Date().toISOString().slice(0, 10),
  photos: locs.length,
  games: nGames,
  countries: new Set(locs.map((l) => l.iso2)).size,
  regions: Object.fromEntries(REGIONS.map((r) => [r, locs.filter((l) => l.region === r).length])),
  tiers: { city: locs.filter((l) => l.tier !== "town").length, town: locs.filter((l) => l.tier === "town").length },
  sources: Object.fromEntries(["Panoramax", "KartaView"].map((s) => [s, locs.filter((l) => l.source === s).length])),
  totalCalls: rows.length * locs.length,
  rejectedByHand: rejected.size,
  totalCost: rows.reduce((a, r) => a + r.costTotal, 0),
  thresholds: THRESH,
  curveKm: DS,
};

writeFileSync(`${OUT}/results.json`, JSON.stringify({ meta, rows: rows.map(({ games, ...r }) => r), curves, h2h }));
mkdirSync("site/public/data", { recursive: true });
writeFileSync(`site/public/data/photos.json`, JSON.stringify(photos));
console.table(rows.map((r) => ({ name: r.name, mean: r.meanPts, ci: r.ci.join("-"), game: r.gameMean, medKm: r.medianKm, country: (r.countryAcc * 100).toFixed(0) + "%", fail: r.parseFail, "$/game": r.costPerGame.toFixed(4), s: r.latencyMedianS })));
