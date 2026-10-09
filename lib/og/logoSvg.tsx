import { FRAME, LOGO_GRID, PERCENT } from "@/components/brand/logoPixels";

/** The logo for next/og images (favicon, home-screen icon, share cards):
 * same pixel runs as LogoMark, as an inline SVG next/og can draw. Rows
 * overlap a hair so no hairline gaps show between them. */
export function OgLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`}>
      {FRAME.map(([x, y, w]) => (
        <rect key={`f${x}-${y}`} x={x} y={y} width={w} height={1.06} fill="#ffffff" />
      ))}
      {PERCENT.map(([x, y, w]) => (
        <rect key={`p${x}-${y}`} x={x} y={y} width={w} height={1.06} fill="#ff4d00" />
      ))}
    </svg>
  );
}
