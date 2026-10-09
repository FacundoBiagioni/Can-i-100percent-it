import { OgLogo } from "./logoSvg";

/** The mark + wordmark for share images (next/og), top-left of each card. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <OgLogo size={60} />
      <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#ffffff", letterSpacing: -0.5 }}>
        can i 100<span style={{ color: "#ff4d00" }}>%</span>&nbsp;it?
      </div>
    </div>
  );
}
