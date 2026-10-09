import { FRAME_PATH, LOGO_GRID, PERCENT_PATH } from "./logoPixels";

/**
 * The site's logo: the creator's pixel-art "%" in an ember tone, inside a
 * white frame. One path per color (see runsToPath), so it renders cleanly at
 * any size. Plain SVG with no hooks, so the favicon, the home-screen icon
 * and the share images (next/og) render the very same shape.
 */
export default function LogoMark({
  size = 30,
  frame = "#ffffff",
  accent = "#ff4d00",
  className,
}: {
  size?: number;
  frame?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`} aria-hidden className={className}>
      <path d={FRAME_PATH} fill={frame} />
      <path d={PERCENT_PATH} fill={accent} />
    </svg>
  );
}
