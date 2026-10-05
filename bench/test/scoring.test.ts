import { test } from "node:test";
import assert from "node:assert/strict";
import { points, haversineKm, countryAt } from "../lib/geo";

test("points follow GeoGuessr's world curve", () => {
  assert.equal(points(0), 5000);
  assert.equal(points(100), 4676); // the site says "100 km off is about 4,680"
  assert.equal(points(1000), 2559); // and "1,000 km off is about 2,560"
  assert.equal(points(5000), 175);
  assert.equal(points(20000), 0); // the far side of the planet scores nothing
  assert.equal(points(NaN), 0);
});

test("points only go down as the miss grows", () => {
  let prev = Infinity;
  for (let km = 0; km <= 20000; km += 250) {
    assert.ok(points(km) <= prev);
    prev = points(km);
  }
});

test("haversine matches known city distances", () => {
  const paris = { lat: 48.8566, lng: 2.3522 }, london = { lat: 51.5074, lng: -0.1278 };
  assert.ok(Math.abs(haversineKm(paris, london) - 344) < 2);
  assert.equal(haversineKm(paris, paris), 0);
  // across the antimeridian: Fiji to Samoa is about 1,150 km, not 30,000
  assert.ok(haversineKm({ lat: -18.1, lng: 178.4 }, { lat: -13.8, lng: -171.8 }) < 1300);
});

test("right country is judged from the pin's coordinates", () => {
  assert.equal(countryAt({ lat: 48.85, lng: 2.35 })?.iso2, "FR");
  assert.equal(countryAt({ lat: 38.709, lng: -9.147 })?.iso2, "PT");
  assert.equal(countryAt({ lat: 42.66, lng: 21.16 })?.iso2, "XK"); // Kosovo has no ISO number in the map data
  assert.equal(countryAt({ lat: 0, lng: -30 }), null); // mid-Atlantic
  // a pin a few km off the Lisbon waterfront still counts as Portugal
  assert.equal(countryAt({ lat: 38.68, lng: -9.2 })?.iso2, "PT");
});
