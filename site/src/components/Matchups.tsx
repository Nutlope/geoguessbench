import { useState } from "react";
import { DATA, ROWS, META, colorOf, pct } from "../data";
import { Mark } from "./Mark";

/** Share of the fixed five-round games that the row model beat the column model. */
export function Matchups() {
  const [cell, setCell] = useState<{ a: string; b: string } | null>(null);
  const shade = (v: number) => {
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
        <div className="card h2h-card">
          <div className="h2h-read">
            {a && b && v != null ? (
              <p>
                <Mark k={a.key} size={20} /> <b style={{ color: colorOf(a.key) }}>{a.name}</b> beat <Mark k={b.key} size={20} /> <b style={{ color: colorOf(b.key) }}>{b.name}</b> in {pct(v)} of the {META.games} games.
              </p>
            ) : (
              <p className="muted">Hover or tap a cell to read it. Green: the row model usually wins. Red: it usually loses.</p>
            )}
          </div>
          <div className="h2h-scroll">
            <div className="h2h" style={{ gridTemplateColumns: `minmax(150px, auto) repeat(${ROWS.length}, minmax(36px, 1fr))` }} onMouseLeave={() => setCell(null)}>
              <span className="h2h-corner small muted">Row beats column</span>
              {ROWS.map((r) => (
                <span key={r.key} className="h2h-col"><Mark k={r.key} size={22} title={r.name} /></span>
              ))}
              {ROWS.map((ra) => (
                <div key={ra.key} className="h2h-r">
                  <span className="h2h-name small"><Mark k={ra.key} size={18} />{ra.name}</span>
                  {ROWS.map((rb) => {
                    if (ra.key === rb.key) return <span key={rb.key} className="h2h-c self" />;
                    const w = DATA.h2h[ra.key][rb.key];
                    const on = cell?.a === ra.key && cell?.b === rb.key;
                    return (
                      <button
                        key={rb.key}
                        className={`h2h-c${on ? " on" : ""}`}
                        style={{ background: shade(w) }}
                        onMouseEnter={() => setCell({ a: ra.key, b: rb.key })}
                        onFocus={() => setCell({ a: ra.key, b: rb.key })}
                        onClick={() => setCell({ a: ra.key, b: rb.key })}
                        aria-label={`${ra.name} beat ${rb.name} in ${pct(w)} of games`}
                      >
                        {Math.round(w * 100)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="small muted foot">Numbers are percentages of games won. A tie in a game counts as half a win for each side.</p>
      </div>
    </section>
  );
}
