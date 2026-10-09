import { FRAME_PATH, LOGO_GRID, PERCENT_PATH } from "@/components/brand/logoPixels";

/** The logo for next/og images (favicon, home-screen icon, share cards):
 * the same two paths as LogoMark, as an inline SVG next/og can draw. */
export function OgLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`}>
      <path d={FRAME_PATH} fill="#ffffff" />
      <path d={PERCENT_PATH} fill="#ff4d00" />
    </svg>
  );
}
