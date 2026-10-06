import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth } from "d3-geo";
import { ROWS, colorOf, fmt, km, loadPhotos, scaleWord, type Photo } from "../data";
import { WorldMap } from "./WorldMap";
import { arc } from "../geo";
import { Mark, MarkPin } from "./Mark";

type Sort = "game" | "hard" | "easy";
type Tier = "all" | "city" | "town";
const base = import.meta.env.BASE_URL;

export function Explorer() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sort, setSort] = useState<Sort>("game");
  const [tier, setTier] = useState<Tier>("all");
  const [open, setOpen] = useState<Photo | null>(null);
  useEffect(() => { loadPhotos().then(setPhotos); }, []);

  const list = useMemo(() => {
    const l = photos.filter((p) => tier === "all" || p.tier === tier);
    if (sort === "hard") return [...l].sort((a, b) => a.avgPts - b.avgPts);
    if (sort === "easy") return [...l].sort((a, b) => b.avgPts - a.avgPts);
    return l;
  }, [photos, sort, tier]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(null);
      const i = list.findIndex((p) => p.id === open.id);
      if (e.key === "ArrowRight") setOpen(list[(i + 1) % list.length]);
      if (e.key === "ArrowLeft") setOpen(list[(i - 1 + list.length) % list.length]);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = open ? "hidden" : "";
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list]);

  return (
    <section className="block" id="photos">
      <div className="wrap">
        <div className="head">
          <div>
            <span className="label">Play along</span>
            <h2>Every photo in the benchmark</h2>
            <p className="desc">Guess first, then open a photo to see where each model put its pin and why.</p>
          </div>
          <div className="ex-ctl">
            <div className="seg" role="group" aria-label="Order">
              {(["game", "hard", "easy"] as Sort[]).map((s) => (
                <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{s === "game" ? "Game order" : s === "hard" ? "Hardest" : "Easiest"}</button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Photo set">
              {(["all", "city", "town"] as Tier[]).map((t) => (
                <button key={t} aria-pressed={tier === t} onClick={() => setTier(t)}>{t === "all" ? "All" : t === "city" ? "Cities" : "Towns"}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid">
          {list.map((p) => (
            <button key={p.id} className="tile" onClick={() => setOpen(p)} aria-label={`Open photo ${p.game}.${p.round}`}>
              <img src={`${base}photos/${p.id}.webp`} alt="" loading="lazy" width={p.w} height={p.h} />
              <span className="tile-meta small">
                <span className="num">{sort === "game" ? `Game ${p.game} · ${p.round}` : `${p.flag} ${p.country}`}</span>
                <span className="avg" title="Average score across all models, out of 5,000">avg {fmt(p.avgPts)}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="small muted ex-foot">The badge on each photo is the average score across all models, out of 5,000.</p>
      </div>
      {open && (() => {
        const i = list.findIndex((p) => p.id === open.id);
        return <PhotoPanel p={open} pos={`${i + 1} of ${list.length}`} onClose={() => setOpen(null)} onPrev={() => setOpen(list[(i - 1 + list.length) % list.length])} onNext={() => setOpen(list[(i + 1) % list.length])} />;
      })()}
    </section>
  );
}

function PhotoPanel({ p, pos, onClose, onPrev, onNext }: { p: Photo; pos: string; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  useEffect(() => setReveal(false), [p.id]);
  const order = ROWS.map((r) => ({ r, g: p.guesses[r.key] })).filter((x) => x.g).sort((a, b) => (a.g.km ?? 1e9) - (b.g.km ?? 1e9));
  const proj = useMemo(() => {
    const pts: [number, number][] = [[p.lng, p.lat], [p.lng - 6, p.lat - 4], [p.lng + 6, p.lat + 4]];
    for (const { g } of order) if (g.lat != null && g.lng != null) pts.push([g.lng, g.lat]);
    return geoEqualEarth().rotate([-p.lng, 0]).fitExtent([[20, 20], [580, 380]], { type: "MultiPoint", coordinates: pts });
  }, [p, order]);

  return (
    <div className="panel-bg" onClick={onClose}>
      <div className="panel card" role="dialog" aria-modal="true" aria-label="Photo detail" onClick={(e) => e.stopPropagation()}>
        <button className="chip close" onClick={onClose} aria-label="Close">Close</button>
        <div className="panel-photo">
         <div className="panel-photo-in">
          <img src={`${base}photos/${p.id}.webp`} alt="Street-level photo" width={p.w} height={p.h} />
          <div className="small panel-truth">
            {reveal ? (
              <span><b>{p.flag} {p.place}, {p.country}</b> <span className="muted">· {p.tier === "town" ? "small town" : "city"}</span></span>
            ) : (
              <span className="muted">Location hidden until you reveal it.</span>
            )}
            <div className="panel-nav">
              <button className="chip" onClick={onPrev} aria-label="Previous photo">← Previous</button>
              <span className="muted">{pos}</span>
              <button className="chip" onClick={onNext} aria-label="Next photo">Next →</button>
            </div>
            <span className="muted">Photo{p.author ? ` by ${p.author}` : ""} on <a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.source}</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Resized for this page.</span>
          </div>
         </div>
        </div>
        <div className="panel-side">
          {reveal ? (
            <>
              <WorldMap width={600} height={400} projection={proj} label="Where each model pinned this photo">
                {(pr, path) => (
                  <g>
                    {order.map(({ r, g }) => g.lat != null && g.lng != null && (
                      <path key={r.key} d={path(arc([g.lng, g.lat], [p.lng, p.lat])) ?? ""} fill="none" stroke={colorOf(r.key)} strokeWidth={hover === r.key ? 2.2 : 1} strokeDasharray="3 3" opacity={hover && hover !== r.key ? 0.12 : 0.7} />
                    ))}
                    {[...order].reverse().map(({ r, g }) => {
                      if (g.lat == null || g.lng == null) return null;
                      const [x, y] = pr([g.lng, g.lat]) ?? [0, 0];
                      return <g key={r.key} transform={`translate(${x},${y})`}><MarkPin k={r.key} r={hover === r.key ? 12 : 9} dim={!!hover && hover !== r.key} /></g>;
                    })}
                    {(() => { const [x, y] = pr([p.lng, p.lat]) ?? [0, 0]; return <g transform={`translate(${x},${y})`}><circle r={6} fill="var(--ink)" stroke="var(--card)" strokeWidth={2} /><circle r={2} fill="var(--card)" /></g>; })()}
                  </g>
                )}
              </WorldMap>
              <ol className="said">
                {order.map(({ r, g }) => (
                  <li key={r.key} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)}>
                    <div className="said-top">
                      <Mark k={r.key} size={22} />
                      <b>{r.name}</b>
                      <span className="muted small">{g.place ?? (g.lat == null ? "no answer" : g.country ?? "")}</span>
                      <span className="small said-km">{fmt(g.pts)} pts · {km(g.km)}, {scaleWord(g.km)}</span>
                    </div>
                    <p className="small ink2">{g.said || <span className="muted">(no explanation given)</span>}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="guess-first">
              <h3>Where do you think it is?</h3>
              
              <button className="chip reveal-cta" onClick={() => setReveal(true)}>Reveal the answer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
