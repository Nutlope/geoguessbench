import { useMemo, useState } from "react";
import { ROWS, META, colorOf, fmt, km, pct, money, type Row } from "../data";
import { Mark } from "./Mark";
import { ModelDrawer } from "./ModelDrawer";

type Who = "all" | "closed" | "open";
type Tier = "all" | "city" | "town";
const MAX = 25000;

type View = { r: Row; game: number; ci: [number, number]; medianKm: number; country: number };

/** Strict order: score, then the smaller typical miss. No shared places. */
function rank(view: View[]): View[] {
  return [...view].sort((a, b) => b.game - a.game || a.medianKm - b.medianKm);
}

export function Leaderboard() {
  const [who, setWho] = useState<Who>("all");
  const [tier, setTier] = useState<Tier>("all");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const view: View[] = ROWS.filter((r) => who === "all" || (who === "open") === r.open).map((r) => {
      const t = tier === "all" ? null : r.byTier[tier];
      return {
        r,
        game: t ? t.gameMean : r.gameMean,
        ci: t ? t.gameCi : r.gameCi,
        medianKm: t ? t.medianKm : r.medianKm,
        country: t ? t.countryAcc : r.countryAcc,
      };
    });
    return rank(view);
  }, [who, tier]);

  const photos = tier === "all" ? META.photos : META.tiers[tier];

  return (
    <div className="lb card" id="leaderboard">
      <div className="lb-top">
        <div className="lb-title">
          <h3>Overall ranking</h3>
          <p className="small muted">Average score per five-round game, out of 25,000 · {photos} photos · select a model for details</p>
        </div>
        <div className="lb-filters">
          <div className="seg" role="group" aria-label="Model type">
            {(["all", "closed", "open"] as Who[]).map((f) => (
              <button key={f} aria-pressed={who === f} onClick={() => setWho(f)}>
                {f === "all" ? "All models" : f === "closed" ? "Closed" : "Open weights"}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Photo set">
            {(["all", "city", "town"] as Tier[]).map((t) => (
              <button key={t} aria-pressed={tier === t} onClick={() => setTier(t)}>
                {t === "all" ? "All photos" : t === "city" ? "Cities" : "Small towns"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lb-table" role="table" aria-label="Leaderboard">
        <div className="lb-row lb-hd" role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Model</span>
          <span role="columnheader">Score</span>
          <span role="columnheader" className="r">Right country</span>
          <span role="columnheader" className="r">Typical miss</span>
          <span role="columnheader" className="r">Cost / game</span>
        </div>
        {rows.map(({ r, game, ci, medianKm, country }, i) => (
          <div
            className={`lb-row clickable${i < 3 ? " podium" : ""}`}
            role="row"
            key={r.key}
            tabIndex={0}
            onClick={() => setOpen(r.key)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(r.key); } }}
            aria-label={`${r.name}, rank ${i + 1}. Open details`}
          >
            <span className="rank tnum" role="cell">{i + 1}</span>
            <span className="who" role="cell">
              <Mark k={r.key} size={30} />
              <span className="who-txt">
                <b>{r.name}</b>
                <span className="small muted">{r.maker}{r.open && <span className="tag open">Open</span>}</span>
              </span>
            </span>
            <span className="bar" role="cell" title={`95% range ${fmt(ci[0])} to ${fmt(ci[1])}`}>
              <span className="track">
                <span className="fill" style={{ width: `${(game / MAX) * 100}%`, background: colorOf(r.key) }} />
                <span className="ci" style={{ left: `${(ci[0] / MAX) * 100}%`, width: `${((ci[1] - ci[0]) / MAX) * 100}%` }} />
              </span>
              <b className="tnum">{fmt(game)}</b>
            </span>
            <span className="r tnum" role="cell">{pct(country)}</span>
            <span className="r tnum" role="cell">{km(medianKm)}</span>
            <span className="r tnum" role="cell">{money(r.costPerGame)}</span>
          </div>
        ))}
      </div>
      {open && <ModelDrawer k={open} onClose={() => setOpen(null)} />}
      <p className="lb-foot small muted">
        Every model saw the same photos at medium reasoning effort. The thin bracket on each bar is the 95% range across photos.
      </p>
    </div>
  );
}
