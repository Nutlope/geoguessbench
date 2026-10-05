import results from "./data/results.json";

export type Row = {
  key: string; name: string; maker: string; open: boolean; mode: string; provider: string; model: string;
  n: number; meanPts: number; ci: [number, number]; gameMean: number; gameCi: [number, number];
  byTier: Record<string, { n: number; meanPts: number; gameMean: number; gameCi: [number, number]; medianKm: number; countryAcc: number }>; gameBest: number; perfectish: number;
  medianKm: number; countryAcc: number; within: Record<string, number>; parseFail: number;
  gapToTop: number; gapCi: [number, number]; tiedWithTop: boolean;
  costPerGame: number; costTotal: number; latencyMedianS: number; outTokMean: number;
  byRegion: Record<string, { n: number; mean: number }>;
};
export type Meta = {
  version: string; updated: string; photos: number; games: number; countries: number;
  regions: Record<string, number>; tiers: Record<string, number>; sources: Record<string, number>; totalCalls: number; totalCost: number; rejectedByHand: number;
  thresholds: number[]; curveKm: number[];
};
export type Guess = { lat: number | null; lng: number | null; km: number | null; pts: number; place: string | null; country: string | null; said: string };
export type Photo = {
  id: string; game: number; round: number; lat: number; lng: number; country: string; iso2: string; flag: string; region: string; place: string;
  source: string; sourceUrl: string; author: string | null; license: string; capturedAt: string | null; tier: string; w: number; h: number; avgPts: number;
  guesses: Record<string, Guess>;
};

export const DATA = results as unknown as { meta: Meta; rows: Row[]; curves: Record<string, number[]>; h2h: Record<string, Record<string, number>> };
export const ROWS = DATA.rows;
export const META = DATA.meta;
export const byKey = new Map(ROWS.map((r) => [r.key, r]));

/** One colour per entry; makers keep a family resemblance. */
export const COLOR: Record<string, string> = {
  "claude-fable-5-1": "#8F2D0E",
  "claude-opus-5-5": "#C2410C",
  "claude-sonnet-5-5": "#E8793F",
  "claude-haiku-4-5": "#D9A27C",
  "kimi-k3": "#D0306F",
  "qwen3-8-flash": "#0B8FA8",
  "qwen3-5-9b": "#6B9A12",
  "deepseek-v4-1-flash": "#2E62E0",
  "minimax-m3": "#8E44E0",
  "glm-5-3-flash": "#0A9363",
  "inkling": "#57534E",
  "muse-glimmer-30b": "#1E3A8A",
  "gpt": "#111111",
};
export const colorOf = (k: string) => COLOR[k] ?? "#888";

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export function km(n: number | null): string {
  if (n == null) return "no answer";
  if (n < 1) return `${Math.round(n * 1000)} m`;
  if (n < 10) return `${n.toFixed(1)} km`;
  return `${fmt(n)} km`;
}
export function money(n: number): string {
  if (n === 0) return "free";
  if (n < 1) return `$${+n.toPrecision(2)}`;
  return `$${n.toFixed(2)}`;
}
export function scaleWord(k: number | null): string {
  if (k == null) return "no answer";
  if (k < 1) return "on the spot";
  if (k < 25) return "same city";
  if (k < 200) return "same region";
  if (k < 750) return "same country, roughly";
  if (k < 2500) return "right continent";
  return "way off";
}

let photosPromise: Promise<Photo[]> | null = null;
export function loadPhotos(): Promise<Photo[]> {
  photosPromise ??= fetch(`${import.meta.env.BASE_URL}data/photos.json`).then((r) => r.json());
  return photosPromise;
}
