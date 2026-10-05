import { useEffect, useMemo, useState } from "react";
import { ROWS, colorOf, loadPhotos, fmt, km, type Photo } from "../data";
import { WorldMap } from "./WorldMap";
import { arc } from "../geo";
import { Mark } from "./Mark";

/** Every miss drawn as a line from where the photo was taken to where the model pinned it. */
export function MissMap() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [key, setKey] = useState(ROWS[0].key);
  useEffect(() => { loadPhotos().then(setPhotos); }, []);
  const row = ROWS.find((r) => r.key === key)!;

  const stats = useMemo(() => {
    const g = photos.map((p) => p.guesses[key]).filter(Boolean);
    const far = photos
      .map((p) => ({ p, g: p.guesses[key] }))
      .filter((x) => x.g && x.g.km != null)
      .sort((a, b) => (b.g.km ?? 0) - (a.g.km ?? 0))[0];
    return { onSpot: g.filter((x) => x.km != null && x.km < 25).length, total: g.length, far };
  }, [photos, key]);

  return (
    <section className="block" id="misses">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>03</b> Where the misses land</div>
          <h2>Every guess, one line each</h2>
          <p className="lead">Each ring is a photo. A line runs from it to where the model put its pin, so short lines are good. Pick a model.</p>
        </div>
        <div className="chips miss-chips">
          {ROWS.map((r) => (
            <button key={r.key} className="chip" aria-pressed={key === r.key} onClick={() => setKey(r.key)}>
              <Mark k={r.key} size={18} />{r.name}
            </button>
          ))}
        </div>
        <div className="card miss">
          <WorldMap width={1000} height={500} label={`Guesses by ${row.name}`}>
            {(proj, path) => (
              <g>
                {photos.map((p) => {
                  const g = p.guesses[key];
                  if (!g || g.lat == null || g.lng == null) return null;
                  return (
                    <g key={p.id}>
                      <path d={path(arc([p.lng, p.lat], [g.lng, g.lat])) ?? ""} fill="none" stroke={colorOf(key)} strokeWidth={1.1} opacity={(g.km ?? 0) > 750 ? 0.75 : 0.45} />
                      {(g.km ?? 0) >= 25 && (() => { const [gx, gy] = proj([g.lng, g.lat]) ?? [0, 0]; return <circle cx={gx} cy={gy} r={2.2} fill={colorOf(key)} />; })()}
                    </g>
                  );
                })}
                {photos.map((p) => {
                  const [x, y] = proj([p.lng, p.lat]) ?? [0, 0];
                  const g = p.guesses[key];
                  const hit = g && g.km != null && g.km < 25;
                  return <circle key={p.id} cx={x} cy={y} r={hit ? 2.6 : 3.2} fill={hit ? "var(--ink)" : "var(--card)"} stroke="var(--ink)" strokeWidth={1} />;
                })}
              </g>
            )}
          </WorldMap>
          <div className="miss-legend small">
            <span><i className="lg-dot solid" /> Photo, pinned within 25 km</span>
            <span><i className="lg-dot hollow" /> Photo, missed by more</span>
            <span><i className="lg-dot" style={{ background: colorOf(key), borderColor: colorOf(key) }} /> Where the model pinned it</span>
            <span><b>{stats.onSpot}</b> of {stats.total} photos pinned within 25 km</span>
            {stats.far && <span className="muted">Biggest miss: {stats.far.p.place}, {stats.far.p.country}, pinned {km(stats.far.g.km)} away in {stats.far.g.place ?? stats.far.g.country ?? "the wrong place"} ({fmt(stats.far.g.pts)} pts)</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
