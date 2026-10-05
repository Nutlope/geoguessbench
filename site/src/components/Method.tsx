import { META, ROWS } from "../data";
import { SYSTEM, USER } from "../prompt";

export function Method() {
  const europe = Math.round(((META.regions.Europe ?? 0) / META.photos) * 100);
  const ties = ROWS.filter((r) => r.tiedWithTop);
  return (
    <section className="block" id="method">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>07</b> Method</div>
          <h2>How it works</h2>
        </div>
        <div className="method">
          <article className="card m">
            <h3>Photos</h3>
            <p>{META.photos} open street photos ({META.tiers.city} cities, {META.tiers.town} small towns). Metadata stripped, screened, checked by hand.</p>
          </article>
          <article className="card m">
            <h3>Scoring</h3>
            <p>GeoGuessr's curve: 5,000 points on the spot, about 2,560 at 1,000 km. Five photos make a game.</p>
          </article>
          <article className="card m">
            <h3>Rules</h3>
            <p>Same prompt, one photo, one try, no tools. Fastest mode for each model. No answer scores zero.</p>
            <details>
              <summary className="small">See the prompt</summary>
              <pre className="small">{SYSTEM}{"\n\nUser: "}{USER} [photo]</pre>
            </details>
          </article>
          <article className="card m warn">
            <h3>Caveats</h3>
            <ul>
              <li>{europe}% of photos are in Europe.</li>
              <li>Public photos may be in training data.</li>
              {ties.length > 1 && <li>The top {ties.length} are a statistical tie.</li>}
              <li>No OpenAI models yet.</li>
            </ul>
          </article>
        </div>
        <p className="small muted foot">{META.totalCalls.toLocaleString("en-US")} guesses, ${META.totalCost.toFixed(2)}, run {META.updated}.</p>
      </div>
    </section>
  );
}
