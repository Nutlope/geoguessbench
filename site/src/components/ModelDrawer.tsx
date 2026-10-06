import { useEffect, useMemo, useState } from "react";
import { ROWS, META, colorOf, fmt, km, pct, money, loadPhotos, type Photo, type Row } from "../data";
import { Mark } from "./Mark";

const REGIONS = ["Europe", "Asia", "Americas", "Oceania", "Africa"];
const BANDS = [
  { km: 1, label: "Street" },
  { km: 25, label: "City" },
  { km: 200, label: "Region" },
  { km: 750, label: "Country" },
  { km: 2500, label: "Continent" },
];
const base = import.meta.env.BASE_URL;

/** Everything about one model, opened from the ranking. */
export function ModelDrawer({ k, onClose }: { k: string; onClose: () => void }) {
  const r = ROWS.find((x) => x.key === k) as Row;
  const rank = ROWS.findIndex((x) => x.key === k) + 1;
  const [photos, setPhotos] = useState<Photo[]>([]);
  useEffect(() => { loadPhotos().then(setPhotos); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const { best, worst } = useMemo(() => {
    const mine = photos.filter((p) => p.guesses[k]).map((p) => ({ p, g: p.guesses[k] }));
    // Best: hardest photos (low field average) that this model still nailed.
    const best = [...mine].sort((a, b) => (b.g.pts - b.p.avgPts) - (a.g.pts - a.p.avgPts)).slice(0, 3);
    const worst = [...mine].sort((a, b) => (a.g.pts - a.p.avgPts) - (b.g.pts - b.p.avgPts)).slice(0, 3);
    return { best, worst };
  }, [photos, k]);

  const c = colorOf(k);
  const city = r.byTier.city, town = r.byTier.town;

  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${r.name} details`} onClick={(e) => e.stopPropagation()}>
        <header className="dr-head">
          <Mark k={k} size={44} />
          <div>
            <h3>{r.name}</h3>
            <p className="small muted">{r.maker} · {r.mode}{r.open ? " · open weights" : ""}</p>
          </div>
          <button className="chip dr-close" onClick={onClose} aria-label="Close">Close</button>
        </header>

        <div className="dr-rank">
          <span className="dr-rank-n tnum">#{rank}</span>
          <span className="small muted">of {ROWS.length} models</span>
          <span className="dr-rank-score tnum" style={{ color: c }}>{fmt(r.gameMean)}</span>
          <span className="small muted">points per game, out of 25,000</span>
        </div>

        <div className="dr-stats">
          <div><span className="small muted">Right country</span><b className="tnum">{pct(r.countryAcc)}</b></div>
          <div><span className="small muted">Typical miss</span><b className="tnum">{km(r.medianKm)}</b></div>
          <div><span className="small muted">Cost per game</span><b className="tnum">{money(r.costPerGame)}</b></div>
          <div><span className="small muted">Time per guess</span><b className="tnum">{r.latencyMedianS}s</b></div>
        </div>

        <section className="dr-sec">
          <h4>Cities vs small towns <span className="muted small">score per game · typical miss</span></h4>
          {[["Big cities", city], ["Small towns", town]].map(([label, t]) => t && typeof t !== "string" && (
            <div className="dr-bar" key={label as string}>
              <span className="small">{label as string}</span>
              <span className="track"><span className="fill" style={{ width: `${(t.gameMean / 25000) * 100}%`, background: c }} /></span>
              <b className="small tnum">{fmt(t.gameMean)}</b>
              <span className="small muted tnum">{km(t.medianKm)}</span>
            </div>
          ))}
        </section>

        <section className="dr-sec">
          <h4>By region <span className="muted small">points per round, out of 5,000</span></h4>
          {REGIONS.filter((g) => r.byRegion[g]).map((g) => (
            <div className="dr-bar" key={g}>
              <span className="small">{g} <span className="muted">{META.regions[g]}</span></span>
              <span className="track"><span className="fill" style={{ width: `${(r.byRegion[g].mean / 5000) * 100}%`, background: c, opacity: (META.regions[g] ?? 0) < 15 ? 0.45 : 1 }} /></span>
              <b className="small tnum">{fmt(r.byRegion[g].mean)}</b>
              <span />
            </div>
          ))}
        </section>

        <section className="dr-sec">
          <h4>How close its guesses land</h4>
          <div className="dr-ladder">
            {BANDS.map((b) => (
              <div key={b.km}>
                <b className="tnum">{pct(r.within[b.km])}</b>
                <span className="small muted">{b.label}</span>
                <span className="dr-col"><i style={{ height: `${r.within[b.km] * 100}%`, background: c }} /></span>
              </div>
            ))}
          </div>
        </section>

        {photos.length > 0 && (
          <section className="dr-sec">
            <h4>Standout rounds</h4>
            {([["Beat the field", best, "best"], ["Trailed the field", worst, "worst"]] as const).map(([title, list, kind]) => (
              <div key={kind} className="dr-group">
                <span className="small muted">{title}</span>
                <div className="dr-rounds">
                  {list.map(({ p, g }) => (
                    <figure key={p.id} className={`dr-round ${kind}`}>
                      <img src={`${base}photos/${p.id}.webp`} alt="" loading="lazy" />
                      <figcaption className="small">
                        <b>{p.flag} {p.place}</b>
                        <span className="tnum">{fmt(g.pts)} pts · {km(g.km)}</span>
                        <span className="muted tnum">field avg {fmt(p.avgPts)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}
