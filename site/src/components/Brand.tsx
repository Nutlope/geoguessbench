import { useId } from "react";

/** Pin whose tip lands on the globe's centre, where the equator meets the meridian. */
const PIN = "M16 16.2C14.9 14.7 11.3 12.6 11.3 9.5A4.7 4.7 0 0 1 20.7 9.5C20.7 12.6 17.1 14.7 16 16.2Z";

export function Logo({ size = 26 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="logo">
      <defs>
        <mask id={`cut-${id}`} maskUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="#fff" />
          <path d={PIN} fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#cut-${id})`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="16" cy="16" r="13" />
        <ellipse cx="16" cy="16" rx="5.6" ry="13" />
        <path d="M3 16h26" />
      </g>
      <path d={PIN} fill="var(--accent)" />
      <circle cx="16" cy="9.5" r="1.75" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark">
      <Logo size={size} />
      <span>GeoGuess<span className="wm-2">Bench</span></span>
    </span>
  );
}
