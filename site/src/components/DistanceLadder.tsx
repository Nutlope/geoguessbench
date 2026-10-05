import { useMemo, useState } from "react";
import { scaleLog, scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { DATA, ROWS, META, colorOf, pct } from "../data";

const W = 960, H = 420, M = { t: 24, r: 150, b: 44, l: 44 };
const BANDS = [
  { km: 1, label: "Same street" },
  { km: 25, label: "Same city" },
  { km: 200, label: "Same region" },
  { km: 750, label: "Same country" },
  { km: 2500, label: "Same continent" },
];

export function DistanceLadder() {
  const [focus, setFocus] = useState<string | null>(null);
  const x = useMemo(() => scaleLog().domain([0.3, 20000]).range([M.l, W - M.r]).clamp(true), []);
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([H - M.b, M.t]), []);
  const ks = META.curveKm;
  const gen = useMemo(() => line<number>().x((_, i) => x(ks[i])).y((v) => y(v)).curve(curveMonotoneX), [x, y, ks]);

  // Label positions at the right edge, nudged apart so they never collide.
  const labels = useMemo(() => {
    const ls = ROWS.map((r) => ({ key: r.key, name: r.name, y: y(DATA.curves[r.key][ks.length - 1 - 6]) }));
    ls.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ls.length; i++) if (ls[i].y - ls[i - 1].y < 14) ls[i].y = ls[i - 1].y + 14;
    return ls;
  }, [y, ks]);

  return (
    <section className="block" id="distance">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>02</b> The distance ladder</div>
          <h2>How close is close?</h2>
          <p className="lead">Each line climbs as the radius grows: the share of a model's guesses that landed within that distance of the truth.</p>
        </div>
        <div className="card chart">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Share of guesses within each distance, per model">
            {BANDS.map((b, bi) => (
              <g key={b.km}>
                <line x1={x(b.km)} x2={x(b.km)} y1={M.t} y2={H - M.b} stroke="var(--rule)" strokeDasharray="2 4" />
                <text x={x(b.km) + 6} y={M.t + 12 + (bi % 2) * 16} className="ax" fill="var(--ink-3)">{b.label}</text>
                <text x={x(b.km)} y={H - M.b + 20} textAnchor="middle" className="ax" fill="var(--ink-3)">{b.km.toLocaleString()} km</text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--rule-2)" />
                <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="ax" fill="var(--ink-3)">{pct(v)}</text>
              </g>
            ))}
            {ROWS.map((r) => (
              <path
                key={r.key}
                d={gen(DATA.curves[r.key]) ?? ""}
                fill="none"
                stroke={colorOf(r.key)}
                strokeWidth={focus === r.key ? 3.2 : 1.8}
                opacity={focus && focus !== r.key ? 0.12 : 0.95}
                style={{ transition: "opacity .2s, stroke-width .2s" }}
                onMouseEnter={() => setFocus(r.key)}
                onMouseLeave={() => setFocus(null)}
              />
            ))}
            {labels.map((l) => (
              <text
                key={l.key} x={W - M.r + 10} y={l.y + 4} className="ax lbl"
                fill={colorOf(l.key)} opacity={focus && focus !== l.key ? 0.25 : 1}
                onMouseEnter={() => setFocus(l.key)} onMouseLeave={() => setFocus(null)}
              >{l.name}</text>
            ))}
          </svg>
        </div>
        <div className="ladder-table">
          {BANDS.map((b) => {
            const best = [...ROWS].sort((a, c) => c.within[b.km] - a.within[b.km])[0];
            return (
              <div key={b.km} className="lt">
                <span className="small muted">{b.label}, within {b.km.toLocaleString()} km</span>
                <b className="num">{pct(best.within[b.km])}</b>
                <span className="small"><span className="dot" style={{ background: colorOf(best.key) }} /> {best.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
