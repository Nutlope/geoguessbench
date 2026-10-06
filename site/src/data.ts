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

/** One colour per entry; a maker's models share a family (Claude rust, OpenAI ink). */
export const COLOR: Record<string, string> = {
  "claude-fable-5-1": "#9a3412",
  "claude-opus-5-5": "#d9572b",
  "claude-sonnet-5-5": "#f0965e",
  "gpt-6-astra": "#111110",
  "gpt-6-1-sol": "#55565c",
  "gpt-6-luna": "#a3a4aa",
  "kimi-k3": "#d6336c",
  "qwen3-8-flash": "#0e9aa7",
  "qwen3-5-9b": "#7cb518",
  "deepseek-v4-1-flash": "#2f6bff",
  "minimax-m3": "#9b51e0",
  "glm-5-3-flash": "#0f9d58",
  "muse-glimmer-30b": "#1e3a8a",
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
  if (n < 0.01) return `$${+n.toFixed(4)}`;
  if (n < 1) return `$${+n.toFixed(3)}`;
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
