import { useMemo, useState } from "react";
import { scaleLog, scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { DATA, ROWS, META, colorOf, pct } from "../data";
import { Mark } from "./Mark";

const W = 1000, H = 400, M = { t: 44, r: 20, b: 40, l: 44 };
const BANDS = [
  { km: 1, label: "Same street" },
  { km: 25, label: "Same city" },
  { km: 200, label: "Same region" },
  { km: 750, label: "Same country" },
  { km: 2500, label: "Same continent" },
];

export function DistanceLadder() {
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const focus = hover ?? pinned;
  const x = useMemo(() => scaleLog().domain([0.3, 20000]).range([M.l, W - M.r]).clamp(true), []);
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([H - M.b, M.t]), []);
  const ks = META.curveKm;
  const gen = useMemo(() => line<number>().x((_, i) => x(ks[i])).y((v) => y(v)).curve(curveMonotoneX), [x, y, ks]);
  const focusRow = ROWS.find((r) => r.key === focus);

  return (
    <section className="block" id="distance">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>02</b> The distance ladder</div>
          <h2>How close is close?</h2>
          <p className="lead">Each line shows the share of a model's guesses that landed within a given distance of the truth. Higher on the left is better.</p>
        </div>
        <div className="card chart">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Share of guesses within each distance, per model">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--rule-2)" />
                <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="ax" fill="var(--ink-3)">{pct(v)}</text>
              </g>
            ))}
            {BANDS.map((b) => (
              <g key={b.km}>
                <line x1={x(b.km)} x2={x(b.km)} y1={M.t - 8} y2={H - M.b} stroke="var(--rule)" />
                <text x={x(b.km)} y={M.t - 16} textAnchor="middle" className="ax" fill="var(--ink-2)">{b.label}</text>
                <text x={x(b.km)} y={H - M.b + 22} textAnchor="middle" className="ax" fill="var(--ink-3)">{b.km.toLocaleString("en-US")} km</text>
              </g>
            ))}
            {ROWS.map((r) => (
              <path
                key={r.key}
                d={gen(DATA.curves[r.key]) ?? ""}
                fill="none"
                stroke={colorOf(r.key)}
                strokeWidth={focus === r.key ? 3.4 : 1.8}
                opacity={focus && focus !== r.key ? 0.1 : 0.95}
                style={{ transition: "opacity .2s, stroke-width .2s" }}
              />
            ))}
            {focusRow && BANDS.map((b) => {
              const v = focusRow.within[b.km];
              return (
                <g key={b.km} transform={`translate(${x(b.km)},${y(v)})`}>
                  <circle r={4.5} fill={colorOf(focusRow.key)} stroke="var(--card)" strokeWidth={2} />
                  <text x={8} y={-8} className="ax val" fill="var(--ink)">{pct(v)}</text>
                </g>
              );
            })}
          </svg>
          <div className="legend" onMouseLeave={() => setHover(null)}>
            {ROWS.map((r) => (
              <button
                key={r.key}
                className="chip"
                aria-pressed={pinned === r.key}
                onMouseEnter={() => setHover(r.key)}
                onClick={() => setPinned((p) => (p === r.key ? null : r.key))}
              >
                <Mark k={r.key} size={18} />{r.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ladder-table">
          {BANDS.map((b) => {
            const best = [...ROWS].sort((a, c) => c.within[b.km] - a.within[b.km])[0];
            return (
              <div key={b.km} className="lt">
                <span className="small muted">{b.label}: within {b.km.toLocaleString("en-US")} km</span>
                <b>{pct(best.within[b.km])}</b>
                <span className="small lt-who"><Mark k={best.key} size={18} />{best.name}</span>
              </div>
            );
          })}
        </div>
        <p className="small muted foot">Bottom row: the best model at each distance and the share of its guesses inside it. Hover or tap a model to trace its line.</p>
      </div>
    </section>
  );
}
