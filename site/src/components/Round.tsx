import { useEffect, useMemo, useRef, useState } from "react";
import { geoEqualEarth } from "d3-geo";
import { ROWS, colorOf, fmt, km, loadPhotos, type Photo } from "../data";
import { WorldMap } from "./WorldMap";
import { Mark, MarkPin } from "./Mark";
import { arc } from "../geo";

const W = 640, H = 480; // 4:3, the same shape as the photo
const REEL = 25;
const DWELL = 8000;
const base = import.meta.env.BASE_URL;

/** Rounds where the field splits: someone nails it and someone is lost. */
function featured(photos: Photo[]): Photo[] {
  const scored = photos.map((p) => {
    const pts = Object.values(p.guesses).map((g) => g.pts);
    const avg = pts.reduce((x, y) => x + y, 0) / pts.length;
    const spread = Math.sqrt(pts.reduce((x, y) => x + (y - avg) ** 2, 0) / pts.length);
    return { p, spread, best: Math.max(...pts) };
  });
  const pick = scored.filter((s) => s.best > 4600 && s.spread > 1000).sort((a, b) => b.spread - a.spread);
  const towns = pick.filter((s) => s.p.tier === "town"), cities = pick.filter((s) => s.p.tier !== "town");
  const out: Photo[] = [];
  for (let i = 0; out.length < REEL && (i < towns.length || i < cities.length); i++) {
    if (towns[i]) out.push(towns[i].p);
    if (cities[i]) out.push(cities[i].p);
  }
  return (out.length ? out : photos).slice(0, REEL);
}

function fitFor(p: Photo) {
  const pts: [number, number][] = [[p.lng, p.lat]];
  for (const g of Object.values(p.guesses)) if (g.lat != null && g.lng != null && (g.km ?? 0) < 4000) pts.push([g.lng, g.lat]);
  const pad = 13;
  pts.push([p.lng - pad, p.lat - pad * 0.6], [p.lng + pad, p.lat + pad * 0.6]);
  return geoEqualEarth().rotate([-p.lng, 0]).fitExtent([[24, 24], [W - 24, H - 24]], { type: "MultiPoint", coordinates: pts });
}

export function Round() {
  const [reel, setReel] = useState<Photo[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPhotos().then((ps) => setReel(featured(ps))); }, []);
  useEffect(() => {
    if (!reel.length || paused) return;
    const t = setTimeout(() => setI((x) => (x + 1) % reel.length), DWELL);
    return () => clearTimeout(t);
  }, [i, reel, paused]);
  useEffect(() => {
    const el = strip.current?.children[i] as HTMLElement | undefined;
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - strip.current.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [i]);

  const p = reel[i];
  const proj = useMemo(() => (p ? fitFor(p) : undefined), [p]);
  const order = useMemo(
    () => (p ? ROWS.map((r) => ({ r, g: p.guesses[r.key] })).filter((x) => x.g).sort((a, b) => b.g.pts - a.g.pts || (a.g.km ?? 1e9) - (b.g.km ?? 1e9)) : []),
    [p],
  );
  const winner = order[0];
  const step = (d: number) => setI((x) => (x + d + reel.length) % reel.length);

  return (
    <section className="block" id="round">
      <div className="wrap">
        <div className="head">
          <div>
            <span className="label">Example round</span>
            <h2>One photo, every guess</h2>
            <p className="desc">A single round from the benchmark, not the overall ranking. Pick any of {reel.length || REEL} rounds below.</p>
          </div>
          <div className="reel-ctl">
            <button className="chip icon" onClick={() => step(-1)} aria-label="Previous round">←</button>
            <span className="small muted tnum">{i + 1} of {reel.length || REEL}</span>
            <button className="chip icon" onClick={() => step(1)} aria-label="Next round">→</button>
          </div>
        </div>

        <div className="round card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {p && proj && winner ? (
            <>
              <div className="round-top">
                <figure className="round-photo" key={p.id}>
                  <img src={`${base}photos/${p.id}.webp`} alt="A street-level photo from the benchmark" width={p.w} height={p.h} className="fade-in" />
                  <figcaption>
                    <span className="truth-label">{p.flag} {p.place}, {p.country}</span>
                    <span className="small cap-sub">Game {p.game}, round {p.round} · {p.tier === "town" ? "small town" : "city"}</span>
                  </figcaption>
                  <div className="reel-bar"><i key={`${p.id}-${paused}`} style={{ animationDuration: `${DWELL}ms`, animationPlayState: paused ? "paused" : "running" }} /></div>
                </figure>
                <div className="round-map">
                  <WorldMap width={W} height={H} projection={proj} label={`Guesses for a photo taken in ${p.place}, ${p.country}`}>
                    {(pr, path) => (
                      <g key={p.id}>
                        {order.map(({ r, g }, k) =>
                          g.lat != null && g.lng != null ? (
                            <path key={r.key} d={path(arc([g.lng, g.lat], [p.lng, p.lat])) ?? ""} fill="none" stroke={colorOf(r.key)} strokeWidth={hover === r.key ? 2.2 : 1.1} strokeDasharray="3 3" opacity={hover && hover !== r.key ? 0.1 : 0.6} className="draw" style={{ animationDelay: `${300 + k * 70}ms` }} />
                          ) : null,
                        )}
                        {[...order].reverse().map(({ r, g }, k) => {
                          if (g.lat == null || g.lng == null) return null;
                          const [x, y] = pr([g.lng, g.lat]) ?? [0, 0];
                          const on = hover === r.key;
                          return (
                            <g key={r.key} transform={`translate(${x},${y})`}>
                              <g className="drop" style={{ animationDelay: `${200 + (order.length - k) * 60}ms` }}>
                                <MarkPin k={r.key} r={on ? 12 : 9.5} dim={!!hover && !on} />
                              </g>
                            </g>
                          );
                        })}
                        {(() => { const [x, y] = pr([p.lng, p.lat]) ?? [0, 0]; return (
                          <g transform={`translate(${x},${y})`}>
                            <circle r={6} fill="var(--ink)" stroke="#fff" strokeWidth={2} />
                            <circle r={2} fill="#fff" />
                          </g>
                        ); })()}
                      </g>
                    )}
                  </WorldMap>
                  <div className="map-key small">
                    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden><circle r="6" fill="var(--ink)" stroke="#fff" strokeWidth="2" /><circle r="2" fill="#fff" /></svg>
                    Where the photo was taken
                  </div>
                </div>
              </div>

              <div className="round-bottom">
                <div className="verdict">
                  <Mark k={winner.r.key} size={28} />
                  <p><b>{winner.r.name}</b> wins this round, {km(winner.g.km)} from the spot.</p>
                </div>
                <ol className="ranking" style={{ gridTemplateRows: `repeat(${Math.ceil(order.length / 2)}, auto)` }}>
                  {order.map(({ r, g }, k) => (
                    <li
                      key={r.key}
                      tabIndex={0}
                      className={hover && hover !== r.key ? "dim" : ""}
                      onMouseEnter={() => setHover(r.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(r.key)}
                      onBlur={() => setHover(null)}
                    >
                      <span className="rk tnum">{k + 1}</span>
                      <Mark k={r.key} size={26} />
                      <span className="who-col">
                        <span className="nm">{r.name}</span>
                        <span className="gp small muted">{g.place ?? (g.lat == null ? "No answer" : g.country ?? "Somewhere else")}</span>
                      </span>
                      <span className="sc">
                        <b className="tnum">{fmt(g.pts)}</b>
                        <span className="small muted tnum">{km(g.km)}</span>
                      </span>
                      <span className="pbar" aria-hidden><i key={p.id} style={{ width: `${(g.pts / 5000) * 100}%`, background: colorOf(r.key) }} /></span>
                    </li>
                  ))}
                </ol>
                <p className="small muted round-note">Points this round, out of 5,000. Hover a model to find its pin.</p>
              </div>
            </>
          ) : (
            <div className="round-loading muted">Loading rounds…</div>
          )}
        </div>

        <div className="strip" ref={strip} role="tablist" aria-label="Choose a round">
          {reel.map((r, k) => (
            <button key={r.id} role="tab" aria-selected={k === i} className={`strip-item${k === i ? " on" : ""}`} onClick={() => { setI(k); setPaused(true); }} aria-label={`Round ${k + 1}: ${r.place}, ${r.country}`}>
              <img src={`${base}photos/${r.id}.webp`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
