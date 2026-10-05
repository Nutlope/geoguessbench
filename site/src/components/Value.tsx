import { useMemo, useState } from "react";
import { scaleLog, scaleLinear } from "d3-scale";
import { ROWS, META, fmt, money } from "../data";
import { Mark, MarkPin } from "./Mark";

const W = 1100, H = 480, M = { t: 28, r: 40, b: 52, l: 70 };
const REGIONS = ["Europe", "Asia", "Americas", "Oceania", "Africa"];
const SMALL = 15; // regions with fewer photos than this are shown but flagged
const CHAR = 7.4; // rough width of one 13px character, for label collision checks

type Box = { x: number; y: number; w: number; h: number };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function Value() {
  const [focus, setFocus] = useState<string | null>(null);
  const cost = (c: number) => Math.max(c, 0.0002);
  const x = useMemo(() => {
    const cs = ROWS.map((r) => cost(r.costPerGame));
    return scaleLog().domain([Math.min(...cs) / 1.8, Math.max(...cs) * 2.2]).range([M.l, W - M.r]);
  }, []);
  const y = useMemo(() => {
    const lo = Math.min(...ROWS.map((r) => r.gameMean));
    return scaleLinear().domain([Math.max(0, Math.floor((lo - 1500) / 2500) * 2500), 25000]).range([H - M.b, M.t]);
  }, []);

  // Cheapest-first, keep a model only if it beats everything cheaper.
  const frontier = useMemo(() => {
    const out: typeof ROWS = [];
    let best = -1;
    for (const r of [...ROWS].sort((a, b) => a.costPerGame - b.costPerGame)) if (r.gameMean > best) { out.push(r); best = r.gameMean; }
    return out;
  }, []);
  const onFrontier = new Set(frontier.map((r) => r.key));

  // Greedy label placement: try right, left, above, below; first spot that collides with nothing wins.
  const labels = useMemo(() => {
    const placed: Box[] = ROWS.map((r) => ({ x: x(cost(r.costPerGame)) - 11, y: y(r.gameMean) - 11, w: 22, h: 22 }));
    const out: Record<string, { x: number; y: number; anchor: "start" | "end" | "middle" }> = {};
    for (const r of [...ROWS].sort((a, b) => b.gameMean - a.gameMean)) {
      const cx = x(cost(r.costPerGame)), cy = y(r.gameMean), w = r.name.length * CHAR, h = 16;
      const tries = [
        { box: { x: cx + 15, y: cy - h / 2, w, h }, pos: { x: cx + 15, y: cy + 4, anchor: "start" as const } },
        { box: { x: cx - 15 - w, y: cy - h / 2, w, h }, pos: { x: cx - 15, y: cy + 4, anchor: "end" as const } },
        { box: { x: cx - w / 2, y: cy - 30, w, h }, pos: { x: cx, y: cy - 18, anchor: "middle" as const } },
        { box: { x: cx - w / 2, y: cy + 14, w, h }, pos: { x: cx, y: cy + 26, anchor: "middle" as const } },
        { box: { x: cx + 15, y: cy + 8, w, h }, pos: { x: cx + 15, y: cy + 20, anchor: "start" as const } },
        { box: { x: cx + 15, y: cy - 24, w, h }, pos: { x: cx + 15, y: cy - 12, anchor: "start" as const } },
      ];
      const inside = (b: Box) => b.x > M.l && b.x + b.w < W - 4 && b.y > 2 && b.y + b.h < H - M.b;
      const pick = tries.find((t) => inside(t.box) && !placed.some((p) => hit(p, t.box))) ?? tries[0];
      placed.push(pick.box);
      out[r.key] = pick.pos;
    }
    return out;
  }, [x, y]);

  const xTicks = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);

  return (
    <section className="block" id="value">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>05</b> Score for the money</div>
          <h2>What a good guess costs</h2>
          <p className="lead">Cost per game against score. The dashed line is the best value.</p>
        </div>
        <div className="value-grid">
          <div className="card chart chart-scroll">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Cost per game against score per game">
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
              <text x={M.l} y={14} className="ax" fill="var(--ink-3)">Score per game</text>
              <text x={W - M.r} y={H - 8} textAnchor="end" className="ax" fill="var(--ink-3)">Cost per game (log scale)</text>
              <polyline points={frontier.map((r) => `${x(cost(r.costPerGame))},${y(r.gameMean)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.45} />
              {ROWS.map((r) => {
                const dim = !!focus && focus !== r.key;
                const l = labels[r.key];
                return (
                  <g key={r.key} onMouseEnter={() => setFocus(r.key)} onMouseLeave={() => setFocus(null)} style={{ cursor: "default" }}>
                    <g transform={`translate(${x(cost(r.costPerGame))},${y(r.gameMean)})`}>
                      <MarkPin k={r.key} r={onFrontier.has(r.key) ? 11 : 9} dim={dim} />
                    </g>
                    <text x={l.x} y={l.y} textAnchor={l.anchor} className="ax lbl" fill="var(--ink)" opacity={dim ? 0.2 : 1}>{r.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="card regions">
            <div className="regions-head">
              <h3>By region</h3>
              <p className="small muted">Points per round, out of 5,000.</p>
            </div>
            <div className="reg-scroll">
              <div className="reg-table" style={{ gridTemplateColumns: `minmax(170px, 1.6fr) repeat(${REGIONS.length}, minmax(64px, 1fr))` }}>
                <span />
                {REGIONS.map((g) => (
                  <span key={g} className={`small reg-h${(META.regions[g] ?? 0) < SMALL ? " thin" : ""}`}>
                    {g}<br /><span className="muted">{META.regions[g] ?? 0} photos</span>
                  </span>
                ))}
                {ROWS.map((r) => (
                  <div key={r.key} className="reg-r" onMouseEnter={() => setFocus(r.key)} onMouseLeave={() => setFocus(null)}>
                    <span className="small reg-n"><Mark k={r.key} size={18} />{r.name}</span>
                    {REGIONS.map((g) => {
                      const v = r.byRegion[g]?.mean;
                      const thin = (META.regions[g] ?? 0) < SMALL;
                      return (
                        <span key={g} className={`reg-c small${thin ? " thin" : ""}`} style={{ background: v == null ? "transparent" : `rgba(27,26,23,${(v / 5000) ** 2 * (thin ? 0.3 : 0.85)})`, color: !thin && v != null && v > 3300 ? "var(--paper)" : "var(--ink)" }}>
                          {v == null ? "" : fmt(v)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="small muted">Pale columns: too few photos to trust.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
