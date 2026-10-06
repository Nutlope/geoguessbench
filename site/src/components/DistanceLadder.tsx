import { useMemo, useState } from "react";
import { scaleLog, scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { DATA, ROWS, META, colorOf, pct } from "../data";
import { Mark } from "./Mark";

const W = 1000, H = 380, M = { t: 40, r: 16, b: 36, l: 44 };
const BANDS = [
  { km: 1, label: "Street" },
  { km: 25, label: "City" },
  { km: 200, label: "Region" },
  { km: 750, label: "Country" },
  { km: 2500, label: "Continent" },
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
          <div>
            <span className="label">Precision</span>
            <h2>How close is close?</h2>
            <p className="desc">Share of each model's guesses that landed within a given distance. Higher and further left is better.</p>
          </div>
        </div>
        <div className="card chart-card">
          <div className="chart-pad">
            <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Share of guesses within each distance, per model">
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line-2)" />
                  <text x={M.l - 10} y={y(v) + 4} textAnchor="end" className="ax">{pct(v)}</text>
                </g>
              ))}
              {BANDS.map((b) => (
                <g key={b.km}>
                  <line x1={x(b.km)} x2={x(b.km)} y1={M.t - 6} y2={H - M.b} stroke="var(--line)" strokeDasharray="2 3" />
                  <text x={x(b.km)} y={M.t - 14} textAnchor="middle" className="ax strong">{b.label}</text>
                  <text x={x(b.km)} y={H - M.b + 20} textAnchor="middle" className="ax">{b.km.toLocaleString("en-US")} km</text>
                </g>
              ))}
              {ROWS.map((r) => (
                <path
                  key={r.key}
                  d={gen(DATA.curves[r.key]) ?? ""}
                  fill="none"
                  stroke={colorOf(r.key)}
                  strokeWidth={focus === r.key ? 3 : 1.6}
                  strokeLinejoin="round"
                  opacity={focus && focus !== r.key ? 0.08 : 0.9}
                  style={{ transition: "opacity .2s, stroke-width .2s" }}
                />
              ))}
              {focusRow && BANDS.map((b) => {
                const v = focusRow.within[b.km];
                return (
                  <g key={b.km} transform={`translate(${x(b.km)},${y(v)})`}>
                    <circle r={4.5} fill={colorOf(focusRow.key)} stroke="#fff" strokeWidth={2} />
                    <text x={8} y={-9} className="ax val">{pct(v)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="legend" onMouseLeave={() => setHover(null)}>
            {ROWS.map((r) => (
              <button key={r.key} className="chip" aria-pressed={pinned === r.key} onMouseEnter={() => setHover(r.key)} onClick={() => setPinned((p) => (p === r.key ? null : r.key))}>
                <Mark k={r.key} size={18} />{r.name}
              </button>
            ))}
          </div>
          <div className="bands">
            {BANDS.map((b) => {
              const best = [...ROWS].sort((a, c) => c.within[b.km] - a.within[b.km])[0];
              return (
                <div key={b.km} className="band">
                  <span className="small muted">Same {b.label.toLowerCase()} · {b.km.toLocaleString("en-US")} km</span>
                  <b className="tnum">{pct(best.within[b.km])}</b>
                  <span className="small band-who"><Mark k={best.key} size={16} />{best.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
