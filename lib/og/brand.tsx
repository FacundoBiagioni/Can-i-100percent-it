import { OgPercent } from "./logoSvg";

/** The wordmark for share images (next/og), top-left of each card: "can i
 * 100% it?" with the logo's pixel-art "%" in place of the typed one. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", fontSize: 30, fontWeight: 600, color: "#ffffff", letterSpacing: -0.5, lineHeight: 1 }}>
      <span>can i 100</span>
      <div style={{ display: "flex", margin: "0 3px 2px 2px" }}>
        <OgPercent size={21} />
      </div>
      <span>&nbsp;it?</span>
    </div>
  );
}
