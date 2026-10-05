import { LOGO_PATHS } from "../logos";
import { byKey, colorOf } from "../data";

const BY_MAKER: Record<string, string> = {
  Anthropic: "claude",
  "Moonshot AI": "moonshot",
  "Alibaba Qwen": "qwen",
  DeepSeek: "deepseek",
  MiniMax: "minimax",
  "Z.ai": "zai",
  Meta: "meta",
};
/** Makers without a public mark get a one-letter monogram instead of an invented logo. */
const MONOGRAM: Record<string, string> = { "Thinking Machines": "T" };

function logoFor(key: string) {
  const maker = byKey.get(key)?.maker ?? "";
  const id = BY_MAKER[maker];
  return { paths: id ? LOGO_PATHS[id] : null, rule: id === "claude" ? "nonzero" : "evenodd", mono: MONOGRAM[maker] ?? maker.slice(0, 1) } as const;
}

/** The maker's logo inside a ring, both in the entry's colour. For HTML. */
export function Mark({ k, size = 22, title }: { k: string; size?: number; title?: string }) {
  const c = colorOf(k);
  const { paths, rule, mono } = logoFor(k);
  return (
    <span className="mark" style={{ width: size, height: size, color: c, borderColor: c }} title={title ?? byKey.get(k)?.name} aria-hidden={title ? undefined : true}>
      {paths ? (
        <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58}>
          {paths.map((d, i) => <path key={i} d={d} fill="currentColor" fillRule={rule} />)}
        </svg>
      ) : (
        <span className="mono" style={{ fontSize: size * 0.5 }}>{mono}</span>
      )}
    </span>
  );
}

/** The same mark as an SVG group centred on (0,0), for map pins. */
export function MarkPin({ k, r = 9, dim = false, ring = 2 }: { k: string; r?: number; dim?: boolean; ring?: number }) {
  const c = colorOf(k);
  const { paths, rule, mono } = logoFor(k);
  const s = (r * 1.15) / 24;
  return (
    <g opacity={dim ? 0.18 : 1} style={{ transition: "opacity .2s" }}>
      <circle r={r} fill="var(--card)" stroke={c} strokeWidth={ring} />
      {paths ? (
        <g transform={`translate(${-12 * s},${-12 * s}) scale(${s})`} fill={c}>
          {paths.map((d, i) => <path key={i} d={d} fillRule={rule} />)}
        </g>
      ) : (
        <text textAnchor="middle" dominantBaseline="central" fontSize={r * 1.1} fontWeight={700} fill={c} fontFamily="var(--font)">{mono}</text>
      )}
    </g>
  );
}
