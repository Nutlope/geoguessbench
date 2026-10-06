import { ROWS, fmt, km, pct, money } from "../data";
import { Mark } from "./Mark";

/** Headline findings, computed from the results so the copy never drifts from the data. */
export function Findings() {
  const [a, b] = ROWS;
  const open = ROWS.filter((r) => r.open);
  const bestOpen = open[0];
  // Best value: the cheapest model within 5% of the leader's score.
  // Skips models already featured, so each card names someone different.
  const value = [...ROWS].filter((r) => r.gameMean >= a.gameMean * 0.95 && r.key !== a.key && r.key !== bestOpen.key).sort((x, y) => x.costPerGame - y.costPerGame)[0] ?? b;
  const cityKm = a.byTier.city?.medianKm ?? 0, townKm = a.byTier.town?.medianKm ?? 0;

  const cards = [
    {
      key: a.key,
      label: "Top model",
      big: a.name,
      body: `${fmt(a.gameMean)} points a game, ${fmt(a.gameMean - b.gameMean)} ahead of ${b.name}.`,
    },
    {
      key: bestOpen.key,
      label: "Best open model",
      big: bestOpen.name,
      body: `${pct(bestOpen.gameMean / a.gameMean)} of the top score, at ${money(bestOpen.costPerGame)} a game.`,
    },
    {
      key: value.key,
      label: "Best value",
      big: value.name,
      body: `Within 5% of the top score for ${money(value.costPerGame)} a game${value.key !== a.key ? `, ${Math.max(1, Math.round(a.costPerGame / value.costPerGame))}x cheaper than ${a.name}` : ""}.`,
    },
    {
      key: a.key,
      label: "Towns are harder",
      big: `${km(cityKm)} → ${km(townKm)}`,
      body: `The top model's typical miss in big cities, then in small towns.`,
    },
  ];

  return (
    <section className="findings-block">
      <div className="wrap findings">
        {cards.map((f) => (
          <article key={f.label} className="finding card">
            <div className="f-top">
              <span className="label">{f.label}</span>
              <Mark k={f.key} size={22} />
            </div>
            <b className="f-big">{f.big}</b>
            <p className="small ink2">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
