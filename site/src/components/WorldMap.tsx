import { useMemo, type ReactNode } from "react";
import { geoGraticule10, type GeoProjection } from "d3-geo";
import { LAND, BORDERS, makeProjection, pathFor } from "../geo";

type Props = {
  width?: number;
  height?: number;
  /** Optional projection override, e.g. one fitted to a region. */
  projection?: GeoProjection;
  children?: (p: GeoProjection, path: ReturnType<typeof pathFor>) => ReactNode;
  className?: string;
  label?: string;
};

const GRAT = geoGraticule10();

export function WorldMap({ width = 960, height = 470, projection, children, className, label }: Props) {
  const proj = useMemo(() => projection ?? makeProjection(width, height), [projection, width, height]);
  const path = useMemo(() => pathFor(proj), [proj]);
  const base = useMemo(
    () => ({ sphere: path({ type: "Sphere" }) ?? "", grat: path(GRAT) ?? "", land: path(LAND) ?? "", borders: path(BORDERS) ?? "" }),
    [path],
  );
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={label ?? "World map"} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <clipPath id={`sph-${width}-${height}`}><path d={base.sphere} /></clipPath>
      </defs>
      <path d={base.sphere} fill="var(--sea)" stroke="var(--rule)" strokeWidth={1} />
      <g clipPath={`url(#sph-${width}-${height})`}>
        <path d={base.grat} fill="none" stroke="var(--rule-2)" strokeWidth={0.6} />
        <path d={base.land} fill="var(--land)" />
        <path d={base.borders} fill="none" stroke="var(--land-line)" strokeWidth={0.5} />
        {children?.(proj, path)}
      </g>
    </svg>
  );
}
