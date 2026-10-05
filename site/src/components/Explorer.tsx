import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth } from "d3-geo";
import { ROWS, colorOf, fmt, km, loadPhotos, scaleWord, type Photo } from "../data";
import { WorldMap } from "./WorldMap";
import { arc } from "../geo";

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
          <div className="kicker"><b>06</b> Every photo</div>
          <h2>Play along</h2>
          <p className="lead">All {photos.length || "the"} photos, in game order. Guess first, then open one to see where every model pinned it and why.</p>
        </div>
        <div className="lb-ctl">
          <div className="chips">
            {(["game", "hard", "easy"] as Sort[]).map((s) => (
              <button key={s} className="chip" aria-pressed={sort === s} onClick={() => setSort(s)}>{s === "game" ? "Game order" : s === "hard" ? "Hardest first" : "Easiest first"}</button>
            ))}
          </div>
          <div className="chips">
            {(["all", "city", "town"] as Tier[]).map((t) => (
              <button key={t} className="chip" aria-pressed={tier === t} onClick={() => setTier(t)}>{t === "all" ? "All" : t === "city" ? "Big cities" : "Small towns"}</button>
            ))}
          </div>
        </div>
        <div className="grid">
          {list.map((p) => (
            <button key={p.id} className="tile" onClick={() => setOpen(p)} aria-label={`Open photo ${p.game}.${p.round}`}>
              <img src={`${base}photos/${p.id}.webp`} alt="" loading="lazy" width={p.w} height={p.h} />
              <span className="tile-meta small">
                <span className="num">{sort === "game" ? `Game ${p.game} · ${p.round}` : `${p.flag} ${p.country}`}</span>
                <span className="num avg" style={{ background: `rgba(27,26,23,${0.25 + (1 - p.avgPts / 5000) * 0.6})` }}>{fmt(p.avgPts)}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="small muted foot">The number on each photo is the average score across all models, out of 5,000.</p>
      </div>
      {open && <PhotoPanel p={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function PhotoPanel({ p, onClose }: { p: Photo; onClose: () => void }) {
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
          <img src={`${base}photos/${p.id}.webp`} alt="Street-level photo" width={p.w} height={p.h} />
          <div className="small panel-truth">
            {reveal ? (
              <span><b>{p.flag} {p.place}, {p.country}</b> <span className="muted">· {p.tier === "town" ? "small town" : "city"}</span></span>
            ) : (
              <button className="chip" onClick={() => setReveal(true)}>Reveal where this is</button>
            )}
            <span className="muted">Photo: <a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.source}</a>{p.author ? ` by ${p.author}` : ""}, {p.license}</span>
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
                    {(() => { const [x, y] = pr([p.lng, p.lat]) ?? [0, 0]; return <g transform={`translate(${x},${y})`}><circle r={7} fill="var(--card)" stroke="var(--ink)" strokeWidth={2.5} /><circle r={2} fill="var(--ink)" /></g>; })()}
                    {order.map(({ r, g }) => {
                      if (g.lat == null || g.lng == null) return null;
                      const [x, y] = pr([g.lng, g.lat]) ?? [0, 0];
                      return <circle key={r.key} cx={x} cy={y} r={hover === r.key ? 7 : 5} fill={colorOf(r.key)} stroke="var(--card)" strokeWidth={1.6} opacity={hover && hover !== r.key ? 0.2 : 1} />;
                    })}
                  </g>
                )}
              </WorldMap>
              <ol className="said">
                {order.map(({ r, g }) => (
                  <li key={r.key} onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)}>
                    <div className="said-top">
                      <span className="dot" style={{ background: colorOf(r.key) }} />
                      <b>{r.name}</b>
                      <span className="muted small">{g.place ?? "no answer"}</span>
                      <span className="num small said-km">{km(g.km)} · {fmt(g.pts)}</span>
                    </div>
                    <p className="small ink2">{g.said || <span className="muted">(no explanation given)</span>}</p>
                    <span className="small muted">{scaleWord(g.km)}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="guess-first">
              <h3>Where do you think it is?</h3>
              <p className="ink2">Take a look first. When you reveal it, you will see every model's pin and the reasoning it gave.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
