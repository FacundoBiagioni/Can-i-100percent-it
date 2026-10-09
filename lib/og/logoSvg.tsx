import { GLYPH_HEIGHT, GLYPH_WIDTH, PERCENT_PATH } from "@/components/brand/logoPixels";

/** The logo's pixel-art "%" for next/og images (favicon, home-screen icon,
 * share cards): the same path as PercentGlyph, as an inline SVG. */
export function OgPercent({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}>
      <path d={PERCENT_PATH} fill="#ff4d00" />
    </svg>
  );
}
