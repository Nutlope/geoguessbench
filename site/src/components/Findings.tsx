import { ROWS, fmt, km, pct } from "../data";
import { Mark } from "./Mark";

/** Headline findings, computed from the results so the copy never drifts from the data. */
export function Findings() {
  const [a, b, c] = ROWS;
  const topTie = ROWS.filter((r) => r.tiedWithTop);
  const cheapestTop = [...topTie].sort((x, y) => x.costPerGame - y.costPerGame)[0];
  const priciestTop = [...topTie].sort((x, y) => y.costPerGame - x.costPerGame)[0];

  const open = ROWS.filter((r) => r.open);
  const bestOpen = open[0];
  const cheapOpen = [...open].filter((r) => r.gameMean >= bestOpen.gameMean * 0.97).sort((x, y) => x.costPerGame - y.costPerGame)[0];

  const cityKm = a.byTier.city?.medianKm, townKm = a.byTier.town?.medianKm;
  const weakest = ROWS[ROWS.length - 1];
  const lowCountry = ROWS.filter((r) => r.countryAcc < 0.34);

  const cards = [
    {
      big: topTie.length > 1 ? `${topTie.length}-way tie` : a.name,
      title: topTie.length > 1 ? "No clear winner" : `${a.name} leads`,
      body: topTie.length > 1
        ? `${topTie.map((r) => r.name).join(", ")} are tied. ${cheapestTop.name} costs ${Math.round(priciestTop.costPerGame / cheapestTop.costPerGame)}x less than ${priciestTop.name}.`
        : `${a.name} beats ${b.name} by ${fmt(a.gameMean - b.gameMean)} points a game, ahead of ${c.name}.`,
      keys: topTie.map((r) => r.key),
    },
    {
      big: pct(bestOpen.gameMean / a.gameMean),
      title: "Open models are close",
      body: `${bestOpen.name} reaches ${pct(bestOpen.gameMean / a.gameMean)} of the top score${cheapOpen.key !== bestOpen.key ? `; ${cheapOpen.name} is ${Math.round(cheapestTop.costPerGame / cheapOpen.costPerGame)}x cheaper than the cheapest leader` : ""}.`,
      keys: [bestOpen.key, cheapOpen.key],
    },
    {
      big: `${km(cityKm ?? 0)} vs ${km(townKm ?? 0)}`,
      title: "Small towns are harder",
      body: `Typical miss for the leader: ${km(cityKm ?? 0)} in cities, ${km(townKm ?? 0)} in towns.`,
      keys: [a.key],
    },
    {
      big: `${lowCountry.length || 1} of ${ROWS.length}`,
      title: "Some miss the country",
      body: lowCountry.length
        ? `${lowCountry.map((r) => `${r.name} (${pct(r.countryAcc)})`).join(" and ")} find the right country under a third of the time.`
        : `${weakest.name} is last, with the right country ${pct(weakest.countryAcc)} of the time.`,
      keys: (lowCountry.length ? lowCountry : [weakest]).map((r) => r.key),
    },
  ];

  return (
    <section className="block findings-block">
      <div className="wrap">
        <div className="findings">
          {cards.map((f) => (
            <article key={f.title} className="finding">
              <span className="f-dots">{[...new Set(f.keys)].map((k) => <Mark key={k} k={k} size={24} />)}</span>
              <b className="f-big">{f.big}</b>
              <h3>{f.title}</h3>
              <p className="small ink2">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
