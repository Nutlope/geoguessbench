import { useMemo, useState } from "react";
import { scaleLog, scaleLinear } from "d3-scale";
import { ROWS, META, colorOf, fmt, money } from "../data";

const W = 1100, H = 460, M = { t: 24, r: 32, b: 48, l: 64 };
const REGIONS = ["Europe", "Americas", "Asia", "Africa", "Oceania"];

export function Value() {
  const [focus, setFocus] = useState<string | null>(null);
  const costs = ROWS.map((r) => Math.max(r.costPerGame, 0.0002));
  const x = useMemo(() => scaleLog().domain([Math.min(...costs) / 1.6, Math.max(...costs) * 1.6]).range([M.l, W - M.r]), [costs]);
  const lo = Math.min(...ROWS.map((r) => r.gameMean));
  const y = useMemo(() => scaleLinear().domain([Math.max(0, Math.floor((lo - 2000) / 2500) * 2500), 25000]).range([H - M.b, M.t]), [lo]);

  // Pareto frontier: no other model is both cheaper and better.
  const frontier = useMemo(() => {
    const s = [...ROWS].sort((a, b) => a.costPerGame - b.costPerGame);
    const out: typeof ROWS = [];
    let best = -1;
    for (const r of s) if (r.gameMean > best) { out.push(r); best = r.gameMean; }
    return out;
  }, []);
  const onFrontier = new Set(frontier.map((r) => r.key));
  const xTicks = [0.001, 0.01, 0.1, 1].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);

  return (
    <section className="block" id="value">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>05</b> Score for the money</div>
          <h2>What a good guess costs</h2>
          <p className="lead">API cost of one five-round game against its score. Models on the line are the best you can get at that price.</p>
        </div>
        <div className="value-grid">
          <div className="card chart">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Cost per game against game score">
              {y.ticks(5).map((t) => (
                <g key={t}>
                  <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--rule-2)" />
                  <text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="ax" fill="var(--ink-3)">{fmt(t)}</text>
                </g>
              ))}
              {xTicks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} stroke="var(--rule-2)" />
                  <text x={x(t)} y={H - M.b + 22} textAnchor="middle" className="ax" fill="var(--ink-3)">{money(t)}</text>
                </g>
              ))}
              <text x={W - M.r} y={H - 8} textAnchor="end" className="ax" fill="var(--ink-3)">cost per game, log scale →</text>
              <polyline points={frontier.map((r) => `${x(Math.max(r.costPerGame, 0.0002))},${y(r.gameMean)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.5} />
              {ROWS.map((r) => {
                const cx = x(Math.max(r.costPerGame, 0.0002)), cy = y(r.gameMean);
                const dim = focus && focus !== r.key;
                const left = cx > W * 0.72;
                return (
                  <g key={r.key} opacity={dim ? 0.25 : 1} onMouseEnter={() => setFocus(r.key)} onMouseLeave={() => setFocus(null)} style={{ cursor: "default" }}>
                    <circle cx={cx} cy={cy} r={onFrontier.has(r.key) ? 8 : 6} fill={colorOf(r.key)} stroke="var(--card)" strokeWidth={2} />
                    <text x={left ? cx - 12 : cx + 12} y={cy + 4} textAnchor={left ? "end" : "start"} className="ax lbl" fill="var(--ink)">{r.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="card regions">
            <h3>By region</h3>
            <p className="small muted">Points per round, out of 5,000.</p>
            <div className="reg-table" style={{ gridTemplateColumns: `minmax(0, 1.6fr) repeat(${REGIONS.length}, minmax(0, 1fr))` }}>
              <span />
              {REGIONS.map((g) => <span key={g} className="small muted reg-h">{g}<br /><span className="num">{META.regions[g] ?? 0}</span></span>)}
              {ROWS.map((r) => (
                <div key={r.key} className="reg-r" onMouseEnter={() => setFocus(r.key)} onMouseLeave={() => setFocus(null)}>
                  <span className="small reg-n"><span className="dot" style={{ background: colorOf(r.key) }} />{r.name}</span>
                  {REGIONS.map((g) => {
                    const v = r.byRegion[g]?.mean;
                    return <span key={g} className="reg-c num small" style={{ background: v == null ? "transparent" : `rgba(27,26,23,${(v / 5000) ** 2 * 0.85})`, color: v != null && v > 3300 ? "var(--paper)" : "var(--ink)" }}>{v == null ? "" : (v / 1000).toFixed(1)}</span>;
                  })}
                </div>
              ))}
            </div>
            <p className="small muted">Values in thousands. Few African and Oceanian photos so far; read those columns loosely.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
