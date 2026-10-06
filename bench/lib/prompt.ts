/**
 * One prompt for every model. A short spoken analysis (shown on the site as
 * the model's "read" of the scene), then a delimiter and one line of JSON.
 */
export const DELIM = ">>>";

export const SYSTEM = `You are a world-class geolocation expert playing GeoGuessr. You see ONE street-level photograph and must place it on the map as precisely as possible.

Use every clue: language and script on signs, driving side, road markings, bollards, guardrails, licence plates, utility poles, architecture, vegetation, soil, climate, sun position, vehicles, shop names, phone codes.

Answer in exactly two parts.

PART 1: Your analysis in 2 to 4 short sentences. Name the strongest clues and how they narrow it down. No headings, bullet points or markdown.

PART 2: On a new line write exactly ${DELIM} and then a single-line JSON object:
{"country":"Country","place":"City, town or region","lat":12.3456,"lng":-12.3456}

lat and lng are decimal degrees for your single best point guess. Never refuse and never say you cannot know. Always commit to one best guess.`;

export const USER = "Where on Earth was this photo taken?";

export type Guess = { country?: string; place?: string; lat: number; lng: number };

/** Pulls the pin out of a reply. Tolerant of fences, prose after the JSON and a missing delimiter. */
export function parseGuess(text: string): Guess | null {
  text = text.replace(/\\"/g, '"');
  const idx = text.lastIndexOf(DELIM);
  const tail = idx >= 0 ? text.slice(idx + DELIM.length) : text;
  const blocks = (s: string) => [...s.matchAll(/\{[^{}]*\}/g)].map((m) => m[0]);
  const cands = blocks(tail).length ? blocks(tail) : blocks(text);
  for (let i = cands.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(cands[i]);
      const lat = Number(j.lat ?? j.latitude), lng = Number(j.lng ?? j.lon ?? j.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      return { lat, lng, country: typeof j.country === "string" ? j.country : undefined, place: typeof j.place === "string" ? j.place : undefined };
    } catch { /* next */ }
  }
  // Lenient fallback: any explicit lat/lng pair still counts, e.g. JSON with a
  // typo ("lng":135.50"}) or plain text (lat:32.84 lng:-60.17).
  const loose = /"?lat(?:itude)?"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?\s*(?:,\s*|\s+(?="?(?:lng|lon)))(?:"?(?:lng|lon|long|longitude)"?\s*[:=]\s*)?"?(-?\d+(?:\.\d+)?)/i.exec(tail);
  if (loose) {
    const lat = Number(loose[1]), lng = Number(loose[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng, country: /"country"\s*:\s*"([^"]+)"/.exec(tail)?.[1], place: /"place"\s*:\s*"([^"]+)"/.exec(tail)?.[1] };
    }
  }
  return null;
}

export function narration(text: string): string {
  const idx = text.indexOf(DELIM);
  const head = idx >= 0 ? text.slice(0, idx) : text.replace(/\{[\s\S]*\}\s*$/, "");
  return head
    .replace(/```[a-z]*\n?/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*PART\s*1[:.]?\s*/i, "")
    .replace(/\s*PART\s*2[:.]?\s*$/i, "")
    .trim();
}
