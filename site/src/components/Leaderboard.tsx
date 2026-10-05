import { useMemo, useState } from "react";
import { ROWS, META, colorOf, fmt, km, pct, money } from "../data";
import { Mark } from "./Mark";

type Filter = "all" | "open" | "closed";
type Tier = "all" | "city" | "town";
const MAX = 25000;

export function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("all");
  const [tier, setTier] = useState<Tier>("all");

  const rows = useMemo(() => {
    const view = ROWS.filter((r) => filter === "all" || (filter === "open") === r.open).map((r) => {
      const t = tier === "all" ? null : r.byTier[tier];
      return {
        r,
        game: t ? t.gameMean : r.gameMean,
        ci: t ? t.gameCi : r.gameCi,
        medianKm: t ? t.medianKm : r.medianKm,
        country: t ? t.countryAcc : r.countryAcc,
      };
    });
    return view.sort((a, b) => b.game - a.game);
  }, [filter, tier]);

  return (
    <section className="block" id="leaderboard">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>01</b> Leaderboard</div>
          <h2>Who finds the spot</h2>
          <p className="lead">Average score for a five-round game, out of 25,000. A pin on the exact spot earns 5,000 a round; 1,000 km off earns about 2,500.</p>
        </div>

        <div className="lb-ctl">
          <div className="chips" role="group" aria-label="Model type">
            {(["all", "open", "closed"] as Filter[]).map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All models" : f === "open" ? "Open weights" : "Closed"}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Photo set">
            {(["all", "city", "town"] as Tier[]).map((t) => (
              <button key={t} className="chip" aria-pressed={tier === t} onClick={() => setTier(t)}>
                {t === "all" ? `All ${META.photos} photos` : t === "city" ? `Big cities (${META.tiers.city})` : `Small towns (${META.tiers.town})`}
              </button>
            ))}
          </div>
        </div>

        <div className="lb card" role="table" aria-label="Leaderboard">
          <div className="lb-row lb-hd small muted" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Model</span>
            <span role="columnheader">Score per game, out of 25,000</span>
            <span role="columnheader" className="r">Right country</span>
            <span role="columnheader" className="r">Typical miss</span>
            <span role="columnheader" className="r">Cost per game</span>
          </div>
          {rows.map(({ r, game, ci, medianKm, country }, i) => (
            <div className="lb-row" role="row" key={r.key}>
              <span className="rank" role="cell">
                {filter === "all" && tier === "all" && r.tiedWithTop ? "1" : i + 1}
                {filter === "all" && tier === "all" && r.tiedWithTop && ROWS.filter((x) => x.tiedWithTop).length > 1 && <span className="tie small">tied</span>}
              </span>
              <span className="who" role="cell">
                <Mark k={r.key} size={30} />
                <span>
                  <b>{r.name}</b>
                  <span className="small muted meta">{r.maker} · {r.mode}{r.open && <span className="tag open"> · open weights</span>}</span>
                </span>
              </span>
              <span className="bar" role="cell" title={ci ? `95% interval ${fmt(ci[0])} to ${fmt(ci[1])}` : undefined}>
                <span className="track">
                  <span className="fill" style={{ width: `${(game / MAX) * 100}%`, background: colorOf(r.key) }} />
                  {ci && <span className="ci" style={{ left: `${(ci[0] / MAX) * 100}%`, width: `${((ci[1] - ci[0]) / MAX) * 100}%` }} />}
                </span>
                <b className="num">{fmt(game)}</b>
              </span>
              <span className="r num" role="cell">{pct(country)}</span>
              <span className="r num" role="cell">{km(medianKm)}</span>
              <span className="r num" role="cell">{money(r.costPerGame)}</span>
            </div>
          ))}
        </div>
        <p className="small muted foot">
          Bars show the mean; the thin bracket is a 95% bootstrap interval over photos. "Tied" means a paired test on the same photos cannot separate a model from the leader. "Typical miss" is the median distance. Every model saw the identical {META.photos} photos.
        </p>
      </div>
    </section>
  );
}
