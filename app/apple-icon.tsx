import { ImageResponse } from "next/og";
import { LOGO_PERCENT } from "@/components/layout/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the site's mark, centered on void with room around it. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <svg width="112" height="112" viewBox="0 0 24 24">
          <rect x="0.75" y="0.75" width="22.5" height="22.5" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          {LOGO_PERCENT.dots.map((d) => (
            <rect key={d.x} x={d.x} y={d.y} width={d.size} height={d.size} fill="#ff4d00" />
          ))}
          <polygon points={LOGO_PERCENT.bar} fill="#ff4d00" />
        </svg>
      </div>
    ),
    size,
  );
}
