import { geoEqualEarth, geoPath, geoInterpolate, type GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import topo from "world-atlas/countries-110m.json";
import type { Feature, MultiLineString, Geometry } from "geojson";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = topo as any;
export const LAND = feature(t, t.objects.land) as unknown as Feature<Geometry>;
export const BORDERS = mesh(t, t.objects.countries, (a: unknown, b: unknown) => a !== b) as unknown as MultiLineString;

export function makeProjection(width: number, height: number, pad = 4): GeoProjection {
  return geoEqualEarth().fitExtent([[pad, pad], [width - pad, height - pad]], { type: "Sphere" }).precision(0.2);
}
export const pathFor = (p: GeoProjection) => geoPath(p);

/** Geodesic line as GeoJSON, so arcs bend like they should on a flat map. */
export function arc(a: [number, number], b: [number, number]) {
  const interp = geoInterpolate(a, b);
  return { type: "LineString" as const, coordinates: Array.from({ length: 33 }, (_, i) => interp(i / 32)) };
}
