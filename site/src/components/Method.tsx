import { META, ROWS } from "../data";
import { SYSTEM, USER } from "../prompt";

export function Method() {
  const regions = Object.entries(META.regions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = META.photos;
  return (
    <section className="block" id="method">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>07</b> Method</div>
          <h2>How it works, and what it can't tell you</h2>
          <p className="lead">Small enough to read in two minutes. Everything here is in the repo and reruns with three commands.</p>
        </div>
        <div className="method">
          <article className="card m">
            <h3>The photos</h3>
            <p>{META.photos} street-level photos from Panoramax and KartaView, two open archives (CC BY-SA 4.0). {META.tiers.city} come from well known cities and {META.tiers.town} from random towns of 1,000 to 100,000 people, at most one photo per place.</p>
            <p>Every photo is re-encoded to 1024 px, which strips all metadata, so no GPS tag ever reaches a model. A vision check (Claude Haiku 4.5, not scored) throws out indoor shots, blur, dashboards, and anything with burned-in timestamps or coordinates. Then we looked at every one by eye.</p>
          </article>
          <article className="card m">
            <h3>The game</h3>
            <p>Scoring is GeoGuessr's world-map curve: <b className="num">5,000 × e<sup>−d / 1,492.7 km</sup></b>. On the spot is 5,000, 100 km off about 4,680, 1,000 km off about 2,560. Photos are dealt into {META.games} fixed games of five, identical for every model.</p>
            <p>"Right country" checks the pin's coordinates against country borders, not the country the model names.</p>
          </article>
          <article className="card m">
            <h3>The rules for models</h3>
            <p>One prompt for everyone, one image, one try. No web search, no tools, no second chances. If a reply has no usable coordinates it scores zero. Claude runs without refusal fallbacks, so every answer comes from the model named.</p>
            <p>v1 tests each model in its fastest mode: open models with reasoning off, Claude at effort low. Thinking modes get their own rows in a later version.</p>
            <details>
              <summary className="small">Read the exact prompt</summary>
              <pre className="small">{SYSTEM}{"\n\nUser: "}{USER} [photo]</pre>
            </details>
          </article>
          <article className="card m warn">
            <h3>Read with care</h3>
            <ul>
              <li>The photo mix leans European: {regions.map(([r, n]) => `${r} ${Math.round((n / total) * 100)}%`).join(", ")}. Open archives are thin elsewhere.</li>
              <li>Photos sit near towns and roads, not the empty desert and taiga a real GeoGuessr map can drop you in.</li>
              <li>These archives are public, so some photos may have been in a model's training data.</li>
              <li>One still frame, no panning or zoom. Humans in GeoGuessr can look around.</li>
              <li>{META.photos} photos is a first cut. Brackets in the leaderboard show how much is noise.</li>
              <li>OpenAI models are not in v1 yet.</li>
            </ul>
          </article>
        </div>
        <div className="card repro">
          <div>
            <h3>Run it yourself</h3>
            <p className="ink2">Datasets are frozen and resumable. Add a model in one file; it plays the same {META.photos} photos as everyone else.</p>
          </div>
          <pre className="small">{`pnpm dataset --tier city --target 100
pnpm dataset --tier town --target 150
pnpm bench --all
pnpm score`}</pre>
        </div>
        <p className="small muted foot">{ROWS.length} models, {META.totalCalls.toLocaleString()} guesses, ${META.totalCost.toFixed(2)} in API costs. Last run {META.updated}.</p>
      </div>
    </section>
  );
}
