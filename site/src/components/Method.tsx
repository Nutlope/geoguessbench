import { useState } from "react";
import { META, ROWS, fmt } from "../data";
import { SYSTEM, USER } from "../prompt";

const REGION_ORDER = ["Europe", "Asia", "Americas", "Oceania", "Africa"];
const REGION_TONE = ["var(--ink)", "#5c5850", "#8a857a", "#b3ad9f", "#d4cebf"];

/** Points against distance, 0 to 5,000 km, as a tiny line. */
function CurveSpark() {
  const w = 220, h = 70, pts: string[] = [];
  for (let km = 0; km <= 5000; km += 100) pts.push(`${(km / 5000) * w},${h - (Math.exp(-km / 1492.7) * (h - 6))}`);
  const x1000 = (1000 / 5000) * w, y1000 = h - Math.exp(-1000 / 1492.7) * (h - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} className="spark" aria-label="Points fall from 5,000 as the miss grows">
      <line x1={0} x2={w} y1={h} y2={h} stroke="var(--rule)" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--red)" strokeWidth={2} />
      <circle cx={x1000} cy={y1000} r={3.5} fill="var(--red)" />
      <text x={x1000 + 7} y={y1000 - 6} className="ax" fill="var(--ink-2)">2,560 at 1,000 km</text>
      <text x={0} y={h + 15} className="ax" fill="var(--ink-3)">0 km</text>
      <text x={w} y={h + 15} textAnchor="end" className="ax" fill="var(--ink-3)">5,000 km</text>
    </svg>
  );
}

export function Method() {
  const [open, setOpen] = useState(false);
  const europe = Math.round(((META.regions.Europe ?? 0) / META.photos) * 100);
  return (
    <section className="block" id="method">
      <div className="wrap">
        <div className="head">
          <div>
            <span className="label">Method</span>
            <h2>How it works</h2>
          </div>
        </div>

        <div className="method">
          <article className="card m">
            <span className="m-label">Photos</span>
            <b className="m-big">{META.photos}</b>
            <p>{META.tiers.city} in big cities, {META.tiers.town} in small towns. Metadata stripped and every photo checked by hand.</p>
            <div className="regbar" aria-label="Photos by region">
              {REGION_ORDER.map((r, i) => (
                <i key={r} style={{ flex: META.regions[r] ?? 0, background: REGION_TONE[i] }} title={`${r}: ${META.regions[r] ?? 0}`} />
              ))}
            </div>
            <div className="regkey small muted">
              {REGION_ORDER.filter((r) => META.regions[r]).map((r, i) => (
                <span key={r}><i style={{ background: REGION_TONE[i] }} />{r} {META.regions[r]}</span>
              ))}
            </div>
          </article>

          <article className="card m">
            <span className="m-label">Scoring</span>
            <b className="m-big">5,000</b>
            <p>Points for a perfect pin, GeoGuessr's curve. Five photos make a game.</p>
            <CurveSpark />
          </article>

          <article className="card m">
            <span className="m-label">Effort</span>
            <b className="m-big">Medium</b>
            <p>Every model reasons at medium effort, with the same prompt, one try, no tools and a 32k-token budget.</p>
            <ul className="m-facts small">
              <li><span>Models</span><b className="tnum">{ROWS.length}</b></li>
              <li><span>Guesses</span><b className="tnum">{fmt(META.totalCalls)}</b></li>
              <li><span>API cost</span><b className="tnum">${META.totalCost.toFixed(2)}</b></li>
            </ul>
          </article>
        </div>

        <div className="caveats card">
          <span className="m-label">Read with care</span>
          <ul>
            <li>{europe}% of photos are in Europe</li>
            <li>Public photos may be in training data</li>
            <li>One still photo per round, no panning</li>
            <li>DeepSeek has no "medium", so it runs at 50 of 100</li>
          </ul>
        </div>

        <div className={`prompt card${open ? " open" : ""}`}>
          <button className="prompt-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span>
              <span className="m-label">The prompt</span>
              <span className="small muted"> Every model got exactly this, plus the photo.</span>
            </span>
            <span className="chip">{open ? "Hide" : "Show"}</span>
          </button>
          {open && (
            <div className="prompt-body">
              <div className="msg">
                <span className="role small">System</span>
                <pre>{SYSTEM}</pre>
              </div>
              <div className="msg">
                <span className="role small">User</span>
                <pre>{USER}</pre>
                <span className="photo-chip small">+ the photo, 1024 px JPEG</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
