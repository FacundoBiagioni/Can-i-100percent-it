import { GLYPH_HEIGHT, GLYPH_WIDTH, PERCENT_PATH } from "./logoPixels";

/**
 * The logo's pixel-art "%", sized like a letter: it follows the font size of
 * the text around it (em units) and sits on the baseline, at about the
 * height of a capital, like the "%" it stands in for.
 */
export default function PercentGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}
      aria-hidden
      className={`inline-block h-[0.72em] w-[0.72em] align-baseline ${className}`}
    >
      <path d={PERCENT_PATH} fill="#ff4d00" />
    </svg>
  );
}
