/**
 * Tweet-ready leaderboard images from the current results:
 *   pnpm share   (needs Google Chrome; run after pnpm score)
 * Writes docs/img/share/leaderboard-4x5.png (best on phones) and
 * docs/img/share/leaderboard-16x9.png, both at 2x for crisp text.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOGO_PATHS } from "../site/src/logos";

const results = JSON.parse(readFileSync("site/src/data/results.json", "utf8"));
const dataTs = readFileSync("site/src/data.ts", "utf8");
const COLOR = Object.fromEntries([...dataTs.matchAll(/"([a-z0-9-]+)": "(#[0-9a-f]{6})"/g)].map((m) => [m[1], m[2]]));
const BY_MAKER: Record<string, string> = { Anthropic: "claude", "Moonshot AI": "moonshot", "Alibaba Qwen": "qwen", DeepSeek: "deepseek", MiniMax: "minimax", "Z.ai": "zai", Meta: "meta", OpenAI: "openai" };
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const PIN = "M16 16.2C14.9 14.7 11.3 12.6 11.3 9.5A4.7 4.7 0 0 1 20.7 9.5C20.7 12.6 17.1 14.7 16 16.2Z";
const logo = (s: number) => `<svg viewBox="0 0 32 32" width="${s}" height="${s}"><defs><mask id="c" maskUnits="userSpaceOnUse"><rect width="32" height="32" fill="#fff"/><path d="${PIN}" stroke="#000" stroke-width="3" stroke-linejoin="round"/></mask></defs><g mask="url(#c)" fill="none" stroke="#111110" stroke-width="2"><circle cx="16" cy="16" r="13"/><ellipse cx="16" cy="16" rx="5.6" ry="13"/><path d="M3 16h26"/></g><path d="${PIN}" fill="#f2542d"/><circle cx="16" cy="9.5" r="1.75" fill="#fff"/></svg>`;
function mark(key: string, maker: string, size: number) {
  const c = COLOR[key] ?? "#888";
  const id = BY_MAKER[maker];
  const paths = (LOGO_PATHS[id] ?? []).map((d) => `<path d="${d}" fill="${c}" fill-rule="${id === "claude" ? "nonzero" : "evenodd"}"/>`).join("");
  return `<span class="mk" style="width:${size}px;height:${size}px;border-color:${c}"><svg viewBox="0 0 24 24" width="${size * 0.58}" height="${size * 0.58}">${paths}</svg></span>`;
}

type R = { key: string; maker: string; name: string; gameMean: number; open: boolean };
const rows: R[] = results.rows;
const lo = 0, hi = 25000;

function page(w: number, h: number, wide: boolean) {
  // Rows shrink as the roster grows so the card always fits the frame.
  const rowH = wide ? Math.min(52, Math.floor(620 / rows.length)) : Math.min(86, Math.floor(1130 / rows.length));
  const list = rows.map((r, i) => `
    <div class="row${i === 0 ? " first" : ""}">
      <span class="rk">${i + 1}</span>${mark(r.key, r.maker, wide ? 34 : 44)}
      <span class="nm">${r.name}${r.open ? '<span class="open">Open</span>' : ""}</span>
      <span class="tr"><i style="width:${((r.gameMean - lo) / (hi - lo)) * 100}%;background:${COLOR[r.key]}"></i></span>
      <b>${fmt(r.gameMean)}</b>
    </div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:${w}px;height:${h}px;background:#f7f7f5;font-family:Geist,sans-serif;color:#111110;-webkit-font-smoothing:antialiased;padding:${wide ? "44px 56px" : "64px 60px"};display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:12px;font-weight:600;font-size:${wide ? 24 : 30}px;letter-spacing:-.03em}.brand span{color:#6e6d67}
.top{display:flex;justify-content:space-between;align-items:flex-start}
h1{font-size:${wide ? 44 : 62}px;line-height:1.02;letter-spacing:-.045em;font-weight:600;margin-top:${wide ? 18 : 30}px}h1 span{color:#6e6d67}
.sub{font-size:${wide ? 18 : 22}px;color:#4f4e4a;margin-top:${wide ? 10 : 16}px;letter-spacing:-.01em}
.card{margin-top:${wide ? 22 : 36}px;background:#fff;border:1px solid #e6e5e1;border-radius:${wide ? 18 : 26}px;padding:${wide ? "8px 24px" : "12px 30px"};box-shadow:0 30px 60px -36px rgba(0,0,0,.2)}
.row{display:grid;grid-template-columns:${wide ? "26px 34px 300px 1fr 92px" : "34px 44px 360px 1fr 110px"};align-items:center;gap:${wide ? 16 : 20}px;height:${rowH}px;border-top:1px solid #f0efec;font-size:${wide ? 19 : 25}px}
.row:first-child{border-top:0}
.rk{color:#6e6d67;font-weight:600;text-align:right}.first .rk{color:#c43a17}
.nm{font-weight:600;letter-spacing:-.015em;white-space:nowrap;display:flex;align-items:center;gap:10px}
.open{font-size:${wide ? 12 : 15}px;font-weight:500;color:#0b6b4a;background:#e7f4ee;padding:3px 8px;border-radius:7px;letter-spacing:0}
.tr{height:${wide ? 10 : 14}px;background:#efefec;border-radius:99px;overflow:hidden}.tr i{display:block;height:100%;border-radius:99px}
b{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.mk{display:inline-grid;place-items:center;border:2px solid;border-radius:50%;background:#fff}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:${wide ? 16 : 20}px;color:#6e6d67;padding-top:${wide ? 14 : 22}px}
</style></head><body>
<div class="top"><div class="brand">${logo(wide ? 32 : 40)}<div>GeoGuess<span>Bench</span></div></div></div>
<h1>Can AI play <span>GeoGuessr?</span></h1>
<p class="sub">Average score per 5-round game, out of 25,000 · ${results.meta.photos} photos · ${results.meta.countries} countries · every model at medium effort</p>
<div class="card">${list}</div>
<div class="foot"><span>Same photos, same prompt, GeoGuessr's own scoring</span><span>geoguessbench.vercel.app</span></div>
</body></html>`;
}

mkdirSync("docs/img/share", { recursive: true });
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
for (const [name, w, h, wide] of [["leaderboard-4x5", 1200, 1500, false], ["leaderboard-16x9", 1600, 900, true]] as const) {
  writeFileSync(`scratch/${name}.html`, page(w, h, wide));
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${w},${h}`, "--force-device-scale-factor=2", "--virtual-time-budget=4000", `--screenshot=${process.cwd()}/docs/img/share/${name}.png`, `file://${process.cwd()}/scratch/${name}.html`], { stdio: "ignore" });
  console.log(`wrote docs/img/share/${name}.png`);
}
