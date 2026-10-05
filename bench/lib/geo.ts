/**
 * Geography and scoring, shared by the dataset builder, the scorer and the site.
 * Points use the GeoGuessr world-map curve: 5000 * exp(-km / 1492.7).
 */
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { createRequire } from "node:module";
import type { FeatureCollection, Geometry } from "geojson";

const require = createRequire(import.meta.url);

export type LatLng = { lat: number; lng: number };
const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const MAX_POINTS = 5000;
export const SCALE_KM = 1492.7;
export const points = (km: number) => (Number.isFinite(km) ? Math.round(MAX_POINTS * Math.exp(-km / SCALE_KM)) : 0);

/** Offset a point by `km` on a bearing, for coastline tolerance. */
function offset(p: LatLng, km: number, deg: number): LatLng {
  const d = km / R, b = rad(deg), la = rad(p.lat), lo = rad(p.lng);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: (la2 * 180) / Math.PI, lng: (((lo2 * 180) / Math.PI + 540) % 360) - 180 };
}

export type CountryInfo = { iso2: string; name: string; region: string; subregion: string; flag: string };

type WC = { name: { common: string }; cca2: string; ccn3: string; region: string; subregion: string; flag: string; altSpellings: string[] };
const WORLD: WC[] = require("world-countries");
const byNum = new Map(WORLD.map((c) => [c.ccn3, c]));
const byName = new Map<string, WC>();
for (const c of WORLD) for (const n of [c.name.common, ...c.altSpellings]) byName.set(n.toLowerCase(), c);
// world-atlas names that do not match world-countries spellings
const ALIAS: Record<string, string> = {
  "kosovo": "XK", "n. cyprus": "CY", "somaliland": "SO", "w. sahara": "EH", "bosnia and herz.": "BA", "dominican rep.": "DO",
  "central african rep.": "CF", "dem. rep. congo": "CD", "eq. guinea": "GQ", "s. sudan": "SS", "solomon is.": "SB", "czechia": "CZ",
  "macedonia": "MK", "north macedonia": "MK", "eswatini": "SZ", "côte d'ivoire": "CI", "united states of america": "US",
  "falkland is.": "FK", "fr. s. antarctic lands": "TF", "antarctica": "AQ", "siachen glacier": "IN",
};
const byIso2 = new Map(WORLD.map((c) => [c.cca2, c]));

function info(c: WC | undefined): CountryInfo | null {
  if (!c) return null;
  return { iso2: c.cca2, name: c.name.common, region: c.region, subregion: c.subregion, flag: c.flag };
}

type Shape = { geom: Geometry; info: CountryInfo };
let SHAPES: Shape[] | null = null;
function shapes(): Shape[] {
  if (SHAPES) return SHAPES;
  const topo = require("world-atlas/countries-50m.json");
  const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  SHAPES = [];
  for (const f of fc.features) {
    const nm = f.properties.name.toLowerCase();
    const c = (f.id ? byNum.get(String(f.id).padStart(3, "0")) : undefined) ?? (ALIAS[nm] ? byIso2.get(ALIAS[nm]) : undefined) ?? byName.get(nm);
    const i = info(c) ?? { iso2: "??", name: f.properties.name, region: "Other", subregion: "", flag: "" };
    SHAPES.push({ geom: f.geometry, info: i });
  }
  return SHAPES;
}

/** Country containing a point; tolerates guesses up to ~15 km offshore. */
export function countryAt(p: LatLng): CountryInfo | null {
  const S = shapes();
  const hit = (q: LatLng) => S.find((s) => geoContains(s.geom as never, [q.lng, q.lat]))?.info ?? null;
  const direct = hit(p);
  if (direct) return direct;
  for (const km of [5, 15]) for (let b = 0; b < 360; b += 45) {
    const h = hit(offset(p, km, b));
    if (h) return h;
  }
  return null;
}

export function countryByName(name: string): CountryInfo | null {
  const n = name.toLowerCase();
  return info(byName.get(n) ?? (ALIAS[n] ? byIso2.get(ALIAS[n]) : undefined));
}
