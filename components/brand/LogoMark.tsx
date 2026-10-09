import { FRAME, LOGO_GRID, PERCENT } from "./logoPixels";

/**
 * The site's logo: the creator's pixel-art "%" in an ember tone, inside a
 * white frame. Plain SVG with no hooks, so the favicon, the home-screen icon
 * and the share images (next/og) render the very same shape. Pixel art stays
 * sharpest at multiples of 30px (one screen pixel per cell).
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
  // At whole multiples of 30px every cell lands on screen pixels: draw them
  // crisp. In between, rows overlap a hair so no hairline gaps show.
  const exact = size % LOGO_GRID === 0;
  const h = exact ? 1 : 1.06;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`}
      shapeRendering={exact ? "crispEdges" : "auto"}
      aria-hidden
      className={className}
    >
      {FRAME.map(([x, y, w]) => (
        <rect key={`f${x}-${y}`} x={x} y={y} width={w} height={h} fill={frame} />
      ))}
      {PERCENT.map(([x, y, w]) => (
        <rect key={`p${x}-${y}`} x={x} y={y} width={w} height={h} fill={accent} />
      ))}
    </svg>
  );
}
