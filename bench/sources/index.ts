/**
 * Keyless street-level photo sources (both CC BY-SA 4.0). Each returns a few
 * candidate photos near a seed place; the dataset builder picks and gates them.
 */
import type { SeedPlace } from "./seed-places";

export type Candidate = {
  source: "Panoramax" | "KartaView";
  photoId: string;
  lat: number;
  lng: number;
  imageUrl: string;
  pageUrl: string;
  author?: string;
  license: string;
  capturedAt?: string;
};

const UA = "GeoGuessBench/0.1 (open AI geolocation benchmark)";

export async function panoramax(place: SeedPlace, rng: () => number): Promise<Candidate[]> {
  const lat = place.lat + (rng() - 0.5) * 0.04;
  const lng = place.lng + (rng() - 0.5) * 0.04;
  const d = 0.015;
  const res = await fetch(`https://api.panoramax.xyz/api/search?limit=80&bbox=${lng - d},${lat - d},${lng + d},${lat + d}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  type F = { id: string; geometry: { coordinates: [number, number] }; assets: Record<string, { href: string }>; properties: Record<string, unknown> };
  const j = (await res.json()) as { features?: F[] };
  return (j.features ?? [])
    .filter((f) => (f.properties["pers:interior_orientation"] as { field_of_view?: number } | undefined)?.field_of_view !== 360 && (f.assets.sd?.href || f.assets.hd?.href))
    .map((f) => ({
      source: "Panoramax" as const,
      photoId: f.id,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      imageUrl: f.assets.sd?.href ?? f.assets.hd.href,
      pageUrl: `https://api.panoramax.xyz/#focus=pic&pic=${f.id}`,
      author: f.properties["geovisio:producer"] as string | undefined,
      license: (f.properties.license as string) ?? "CC BY-SA 4.0",
      capturedAt: f.properties.datetime as string | undefined,
    }));
}

export async function kartaview(place: SeedPlace, rng: () => number): Promise<Candidate[]> {
  const lat = place.lat + (rng() - 0.5) * 0.05;
  const lng = place.lng + (rng() - 0.5) * 0.05;
  const res = await fetch("https://api.openstreetcam.org/1.0/list/nearby-photos/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({ lat: String(lat), lng: String(lng), radius: "2000", page: "1", ipp: "80" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  type I = { id: string; sequence_id: string; lat: string; lng: string; shot_date?: string; field_of_view?: string; projection?: string; lth_name?: string; name?: string; username?: string };
  const j = (await res.json()) as { currentPageItems?: I[] };
  return (j.currentPageItems ?? [])
    .filter((it) => it.lth_name && it.projection !== "SPHERE" && it.field_of_view !== "360")
    .map((it) => ({
      source: "KartaView" as const,
      photoId: String(it.id),
      lat: Number(it.lat),
      lng: Number(it.lng),
      imageUrl: `https://kartaview.org/${it.lth_name}`,
      pageUrl: `https://kartaview.org/details/${it.sequence_id}/${it.id}`,
      author: it.username,
      license: "CC BY-SA 4.0",
      capturedAt: it.shot_date,
    }));
}
