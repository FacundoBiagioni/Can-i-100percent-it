/**
 * The site's mark: a "%" drawn from two squares and a slanted bar, inside a
 * square frame. Geometric and square-cornered like the rest of the design,
 * and legible down to favicon size. Plain SVG (no hooks), so the favicon
 * and share images (next/og) draw the exact same shape.
 */
export const LOGO_PERCENT = {
  dots: [
    { x: 5, y: 5, size: 4.5 },
    { x: 14.5, y: 14.5, size: 4.5 },
  ],
  bar: "15.4,4.5 19.5,4.5 8.6,19.5 4.5,19.5",
};

export default function LogoMark({
  size = 24,
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
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="0.75" y="0.75" width="22.5" height="22.5" fill="none" stroke={frame} strokeWidth="1.5" />
      {LOGO_PERCENT.dots.map((d) => (
        <rect key={d.x} x={d.x} y={d.y} width={d.size} height={d.size} fill={accent} />
      ))}
      <polygon points={LOGO_PERCENT.bar} fill={accent} />
    </svg>
  );
}
