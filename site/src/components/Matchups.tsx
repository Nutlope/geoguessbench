import { useState } from "react";
import { DATA, ROWS, META, colorOf, pct } from "../data";

/** Share of the fixed five-round games that the row model beat the column model. */
export function Matchups() {
  const [cell, setCell] = useState<{ a: string; b: string } | null>(null);
  const shade = (v: number) => {
    // win share 0..1 -> red (loses) .. paper .. ink-green (wins)
    const d = v - 0.5;
    if (Math.abs(d) < 0.02) return "var(--paper-2)";
    return d > 0 ? `rgba(10,122,82,${0.08 + d * 1.05})` : `rgba(215,48,31,${0.06 + -d * 0.75})`;
  };
  const a = cell && ROWS.find((r) => r.key === cell.a), b = cell && ROWS.find((r) => r.key === cell.b);
  const v = cell ? DATA.h2h[cell.a][cell.b] : null;

  return (
    <section className="block" id="matchups">
      <div className="wrap">
        <div className="head">
          <div className="kicker"><b>04</b> Head to head</div>
          <h2>Who wins the duel</h2>
          <p className="lead">The photos are dealt into {META.games} fixed games of five. Each cell is how often the row model outscored the column model, game for game.</p>
        </div>
        <div className="h2h-wrap">
          <div className="card h2h" style={{ gridTemplateColumns: `minmax(130px, auto) repeat(${ROWS.length}, minmax(34px, 1fr))` }} onMouseLeave={() => setCell(null)}>
            <span />
            {ROWS.map((r) => (
              <span key={r.key} className="h2h-col small" title={r.name}><span className="dot" style={{ background: colorOf(r.key) }} /></span>
            ))}
            {ROWS.map((ra) => (
              <div key={ra.key} className="h2h-r">
                <span className="h2h-name small"><span className="dot" style={{ background: colorOf(ra.key) }} />{ra.name}</span>
                {ROWS.map((rb) => {
                  if (ra.key === rb.key) return <span key={rb.key} className="h2h-c self" />;
                  const w = DATA.h2h[ra.key][rb.key];
                  const on = cell?.a === ra.key && cell?.b === rb.key;
                  return (
                    <span key={rb.key} className={`h2h-c num${on ? " on" : ""}`} style={{ background: shade(w) }} onMouseEnter={() => setCell({ a: ra.key, b: rb.key })}>
                      {Math.round(w * 100)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="h2h-read">
            {a && b && v != null ? (
              <p className="lead">
                <b style={{ color: colorOf(a.key) }}>{a.name}</b> beat <b style={{ color: colorOf(b.key) }}>{b.name}</b> in {pct(v)} of games.
              </p>
            ) : (
              <p className="lead muted">Hover a cell to read it. Green means the row model usually wins; red means it usually loses.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
