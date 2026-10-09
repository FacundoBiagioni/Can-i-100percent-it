import { LOGO_PERCENT } from "@/components/layout/LogoMark";

/** The mark + wordmark for share images (next/og), top-left of each card. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg width="36" height="36" viewBox="0 0 24 24">
        <rect x="0.75" y="0.75" width="22.5" height="22.5" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        {LOGO_PERCENT.dots.map((d) => (
          <rect key={d.x} x={d.x} y={d.y} width={d.size} height={d.size} fill="#ff4d00" />
        ))}
        <polygon points={LOGO_PERCENT.bar} fill="#ff4d00" />
      </svg>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#ffffff", letterSpacing: -0.5 }}>
        can i 100<span style={{ color: "#ff4d00" }}>%</span>&nbsp;it?
      </div>
    </div>
  );
}
