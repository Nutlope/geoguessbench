import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth } from "d3-geo";
import { ROWS, META, colorOf, fmt, km, loadPhotos, type Photo } from "../data";
import { WorldMap } from "./WorldMap";
import { Mark, MarkPin } from "./Mark";
import { arc } from "../geo";

const W = 640, H = 460;

/** Rounds where the field splits: someone nails it and someone is lost. */
function featured(photos: Photo[]): Photo[] {
  const scored = photos.map((p) => {
    const pts = Object.values(p.guesses).map((g) => g.pts);
    const avg = pts.reduce((x, y) => x + y, 0) / pts.length;
    // Standard deviation: high when the field genuinely splits, not when one model is lost.
    const spread = Math.sqrt(pts.reduce((x, y) => x + (y - avg) ** 2, 0) / pts.length);
    return { p, spread, best: Math.max(...pts) };
  });
  const pick = scored.filter((s) => s.best > 4600 && s.spread > 1200).sort((a, b) => b.spread - a.spread);
  // Alternate towns and cities so the reel shows both.
  const towns = pick.filter((s) => s.p.tier === "town"), cities = pick.filter((s) => s.p.tier !== "town");
  const out: Photo[] = [];
  for (let i = 0; out.length < 14 && (i < towns.length || i < cities.length); i++) {
    if (towns[i]) out.push(towns[i].p);
    if (cities[i]) out.push(cities[i].p);
  }
  return out.length ? out : photos.slice(0, 10);
}

function fitFor(p: Photo) {
  const pts: [number, number][] = [[p.lng, p.lat]];
  for (const g of Object.values(p.guesses)) if (g.lat != null && g.lng != null && (g.km ?? 0) < 4000) pts.push([g.lng, g.lat]);
  // Keep at least a country-sized window around the truth.
  const pad = 13;
  pts.push([p.lng - pad, p.lat - pad * 0.6], [p.lng + pad, p.lat + pad * 0.6]);
  return geoEqualEarth().rotate([-p.lng, 0]).fitExtent([[24, 24], [W - 24, H - 24]], { type: "MultiPoint", coordinates: pts });
}

const DWELL = 7000;

export function Hero() {
  const [reel, setReel] = useState<Photo[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => { loadPhotos().then((ps) => setReel(featured(ps))); }, []);
  useEffect(() => {
    if (!reel.length || paused) return;
    const t = setTimeout(() => setI((x) => (x + 1) % reel.length), DWELL);
    return () => clearTimeout(t);
  }, [i, reel, paused]);

  const p = reel[i];
  const proj = useMemo(() => (p ? fitFor(p) : undefined), [p]);
  const order = useMemo(
    () => (p ? ROWS.map((r) => ({ r, g: p.guesses[r.key] })).filter((x) => x.g).sort((a, b) => (a.g.km ?? 1e9) - (b.g.km ?? 1e9)) : []),
    [p],
  );

  return (
    <header className="hero">
      <nav className="wrap nav">
        <a href="#top" className="wordmark" aria-label="GeoGuessBench home">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden><circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M2.5 16h27M16 2.5c-5 4-5 23 0 27M16 2.5c5 4 5 23 0 27" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="22.5" cy="9.5" r="4.6" fill="var(--red)" /></svg>
          GeoGuessBench
        </a>
        <span className="ver">{META.version} · {META.updated}</span>
        <div className="links">
          <a href="#leaderboard">Leaderboard</a>
          <a href="#photos">Photos</a>
          <a href="#method">Method</a>
        </div>
      </nav>

      <div className="wrap hero-copy" id="top">
        <h1>Can AI play GeoGuessr?</h1>
        <p className="lead">
          We showed {ROWS.length} AI models the same {META.photos} street photos, from capital cities to farm tracks in {META.countries} countries, and scored every pin like the real game.
        </p>
        <p className="meta-line small muted">
          {META.games} games · {fmt(META.totalCalls)} guesses · ${META.totalCost.toFixed(2)} of API time · updated {META.updated}
        </p>
      </div>

      <div className="wrap">
        <div className="round card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {p && proj ? (
            <>
              <figure className="round-photo" key={p.id}>
                <img src={`${import.meta.env.BASE_URL}photos/${p.id}.webp`} alt="A street-level photo from the benchmark" width={p.w} height={p.h} className="fade-in" />
                <figcaption>
                  <span className="truth-label">{p.flag} {p.place}, {p.country}</span>
                  <span className="muted small">{p.tier === "town" ? "Small town" : "City"} · {p.source}{p.author ? `, ${p.author}` : ""}</span>
                </figcaption>
                <div className="reel-bar"><i key={`${p.id}-${paused}`} style={{ animationDuration: `${DWELL}ms`, animationPlayState: paused ? "paused" : "running" }} /></div>
              </figure>
              <div className="round-map">
                <WorldMap width={W} height={H} projection={proj} label={`Guesses for a photo taken in ${p.place}, ${p.country}`}>
                  {(pr, path) => (
                    <g key={p.id}>
                      {order.map(({ r, g }, k) =>
                        g.lat != null && g.lng != null ? (
                          <path key={r.key} d={path(arc([g.lng, g.lat], [p.lng, p.lat])) ?? ""} fill="none" stroke={colorOf(r.key)} strokeWidth={hover === r.key ? 2.4 : 1.2} strokeDasharray="3 3" opacity={hover && hover !== r.key ? 0.15 : 0.7} className="draw" style={{ animationDelay: `${300 + k * 90}ms` }} />
                        ) : null,
                      )}
                      {/* farthest first, so the closest pins sit on top */}
                      {[...order].reverse().map(({ r, g }, k) => {
                        if (g.lat == null || g.lng == null) return null;
                        const [x, y] = pr([g.lng, g.lat]) ?? [0, 0];
                        const on = hover === r.key;
                        return (
                          <g key={r.key} transform={`translate(${x},${y})`}>
                            <g className="drop" style={{ animationDelay: `${200 + (order.length - k) * 80}ms` }}>
                              <MarkPin k={r.key} r={on ? 12 : 9.5} dim={!!hover && !on} />
                            </g>
                          </g>
                        );
                      })}
                      {(() => { const [x, y] = pr([p.lng, p.lat]) ?? [0, 0]; return (
                        <g transform={`translate(${x},${y})`} className="truth-pin">
                          <circle r={6} fill="var(--ink)" stroke="var(--card)" strokeWidth={2} />
                          <circle r={2} fill="var(--card)" />
                        </g>
                      ); })()}
                    </g>
                  )}
                </WorldMap>
                <div className="map-key small"><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden><circle r="6" fill="var(--ink)" stroke="var(--card)" strokeWidth="2" /><circle r="2" fill="var(--card)" /></svg> Where the photo was taken</div>
              </div>
              <div className="round-list-head small muted">
                <span>Game {p.game}, round {p.round}</span>
                <span>Points this round, out of 5,000</span>
              </div>
              <ol className="round-list">
                {order.map(({ r, g }, k) => (
                  <li key={r.key} tabIndex={0} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.key)} onBlur={() => setHover(null)} className="fade-in" style={{ animationDelay: `${200 + k * 60}ms` }}>
                    <Mark k={r.key} size={22} />
                    <span className="nm">{r.name}</span>
                    <span className="gp muted">{g.place ?? (g.lat == null ? "no answer" : g.country ?? "somewhere else")}</span>
                    <span className="km num">{km(g.km)}</span>
                    <span className="pts num">{fmt(g.pts)}</span>
                  </li>
                ))}
              </ol>
              <div className="round-ctl">
                <button className="chip" onClick={() => setI((x) => (x - 1 + reel.length) % reel.length)} aria-label="Previous photo">←</button>
                <span className="small muted num">{i + 1} / {reel.length}</span>
                <button className="chip" onClick={() => setI((x) => (x + 1) % reel.length)} aria-label="Next photo">→</button>
              </div>
            </>
          ) : (
            <div className="round-loading muted">Loading rounds…</div>
          )}
        </div>
      </div>

    </header>
  );
}
