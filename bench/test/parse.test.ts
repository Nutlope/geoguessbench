import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGuess, narration } from "../lib/prompt";

test("reads the requested format", () => {
  const g = parseGuess(`Cyrillic signs and a trolleybus.\n>>> {"country":"Russia","place":"Perm","lat":58.01,"lng":56.25}`);
  assert.deepEqual(g, { lat: 58.01, lng: 56.25, country: "Russia", place: "Perm" });
});

test("tolerates code fences and a missing delimiter", () => {
  assert.equal(parseGuess('```json\n{"country":"Chile","lat":-33.45,"lng":-70.66}\n```')?.lat, -33.45);
  assert.equal(parseGuess('I think Chile. {"lat":-33.45,"lng":-70.66}')?.lng, -70.66);
});

test("takes the final answer when a model writes more than one", () => {
  const g = parseGuess(`At first {"lat":10,"lng":10} but no.\n>>> {"lat":20,"lng":30}`);
  assert.equal(g?.lat, 20);
});

test("accepts explicit coordinates in slightly broken JSON", () => {
  assert.equal(parseGuess(`>>> {"country":"Japan","lat":34.69,"lng":135.50"}`)?.lng, 135.5); // stray quote
  assert.equal(parseGuess(`>>> {"country":"Portugal","lat":38.710,-9.139"}`)?.lng, -9.139); // missing lng key
  assert.equal(parseGuess(`>>>"{\\"lat\\":48.2,\\"lng\\":16.37}"`)?.lat, 48.2); // escaped JSON string
  assert.equal(parseGuess(`best guess lat:32.84 lng:-60.17`)?.lng, -60.17); // plain text
});

test("refuses to invent a pin", () => {
  assert.equal(parseGuess("I cannot determine the location from this image."), null);
  assert.equal(parseGuess(""), null);
  assert.equal(parseGuess(`{"lat":123,"lng":10}`), null); // latitude out of range
  assert.equal(parseGuess(`{"country":"Sweden","place":"Stockholm, 59.33, 18.06"}`), null); // numbers only inside a name
});

test("narration drops section labels the model wrote", () => {
  assert.equal(narration(`PART 1: Fjords and sheep. PART 2:\n>>> {"lat":62,"lng":-6.8}`), "Fjords and sheep.");
});

test("narration drops the answer line and markdown", () => {
  assert.equal(narration(`**Left-hand traffic** and a Kiwi flag.\n>>> {"lat":1,"lng":2}`), "Left-hand traffic and a Kiwi flag.");
});
