/**
 * Renders the 1200x630 link-preview card from the current results:
 *   pnpm og   (needs Google Chrome; run after pnpm score)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { LOGO_PATHS } from "../site/src/logos";

const results = JSON.parse(readFileSync("site/src/data/results.json", "utf8"));
const dataTs = readFileSync("site/src/data.ts", "utf8");
const COLOR = Object.fromEntries([...dataTs.matchAll(/"([a-z0-9-]+)": "(#[0-9a-f]{6})"/g)].map((m) => [m[1], m[2]]));
const BY_MAKER: Record<string, string> = { Anthropic: "claude", "Moonshot AI": "moonshot", "Alibaba Qwen": "qwen", DeepSeek: "deepseek", MiniMax: "minimax", "Z.ai": "zai", Meta: "meta", OpenAI: "openai" };
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function mark(key: string, maker: string, size: number) {
  const c = COLOR[key] ?? "#888";
  const id = BY_MAKER[maker];
  const paths = (LOGO_PATHS[id] ?? []).map((d) => `<path d="${d}" fill="${c}" fill-rule="${id === "claude" ? "nonzero" : "evenodd"}"/>`).join("");
  return `<span class="mk" style="width:${size}px;height:${size}px;border-color:${c}"><svg viewBox="0 0 24 24" width="${size * 0.58}" height="${size * 0.58}">${paths}</svg></span>`;
}

const PIN = "M16 16.2C14.9 14.7 11.3 12.6 11.3 9.5A4.7 4.7 0 0 1 20.7 9.5C20.7 12.6 17.1 14.7 16 16.2Z";
const logo = `<svg viewBox="0 0 32 32" width="44" height="44"><defs><mask id="c" maskUnits="userSpaceOnUse"><rect width="32" height="32" fill="#fff"/><path d="${PIN}" stroke="#000" stroke-width="3" stroke-linejoin="round"/></mask></defs><g mask="url(#c)" fill="none" stroke="#111110" stroke-width="2"><circle cx="16" cy="16" r="13"/><ellipse cx="16" cy="16" rx="5.6" ry="13"/><path d="M3 16h26"/></g><path d="${PIN}" fill="#f2542d"/><circle cx="16" cy="9.5" r="1.75" fill="#fff"/></svg>`;

const top = results.rows.slice(0, 5);
const max = 25000;
const rows = top.map((r: { key: string; maker: string; name: string; gameMean: number }, i: number) => `
  <div class="row"><span class="rk">${i + 1}</span>${mark(r.key, r.maker, 36)}<span class="nm">${r.name}</span>
  <span class="tr"><i style="width:${(r.gameMean / max) * 100}%;background:${COLOR[r.key]}"></i></span><b>${fmt(r.gameMean)}</b></div>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#f7f7f5;font-family:Geist,sans-serif;color:#111110;padding:56px 64px;display:grid;grid-template-columns:1fr 560px;gap:56px;-webkit-font-smoothing:antialiased}
.brand{display:flex;align-items:center;gap:14px;font-weight:600;font-size:30px;letter-spacing:-.03em}.brand span{color:#8b8a85}
.left{display:flex;flex-direction:column;justify-content:space-between}
h1{font-size:74px;line-height:1;letter-spacing:-.05em;font-weight:600;margin-top:28px}h1 span{color:#8b8a85}
.sub{font-size:24px;color:#4f4e4a;line-height:1.35;margin-top:22px;letter-spacing:-.01em}
.foot{font-size:20px;color:#8b8a85}
.card{background:#fff;border:1px solid #e6e5e1;border-radius:24px;padding:26px 28px;align-self:center;box-shadow:0 30px 60px -30px rgba(0,0,0,.18)}
.card h2{font-size:20px;font-weight:600;letter-spacing:-.01em}.card p{font-size:15px;color:#8b8a85;margin:4px 0 14px}
.row{display:grid;grid-template-columns:22px 36px 170px 1fr 74px;align-items:center;gap:14px;padding:11px 0;border-top:1px solid #f0efec;font-size:19px}
.rk{color:#8b8a85;font-weight:600;text-align:right}.row:first-of-type .rk{color:#c43a17}.nm{font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.tr{height:10px;background:#efefec;border-radius:99px;overflow:hidden}.tr i{display:block;height:100%;border-radius:99px}b{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.mk{display:inline-grid;place-items:center;border:2px solid;border-radius:50%;background:#fff}
</style></head><body>
<div class="left"><div><div class="brand">${logo}<div>GeoGuess<span>Bench</span></div></div>
<h1>Can AI play <span>GeoGuessr?</span></h1>
<p class="sub">${results.rows.length} models, ${results.meta.photos} street photos, ${results.meta.countries} countries. Scored like the real game.</p></div>
<p class="foot">geoguessbench.vercel.app</p></div>
<div class="card"><h2>Overall ranking</h2><p>Average score per five-round game, out of 25,000</p>${rows}</div>
</body></html>`;

writeFileSync("scratch/og.html", html);
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,630", "--virtual-time-budget=4000", `--screenshot=${process.cwd()}/site/public/og.png`, `file://${process.cwd()}/scratch/og.html`], { stdio: "ignore" });
console.log("wrote site/public/og.png");
