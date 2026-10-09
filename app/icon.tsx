import { ImageResponse } from "next/og";
import { LOGO_PERCENT } from "@/components/layout/LogoMark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the site's mark (an ember "%" in a white square frame) on void. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <svg width="58" height="58" viewBox="0 0 24 24">
          <rect x="1" y="1" width="22" height="22" fill="none" stroke="#ffffff" strokeWidth="2" />
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
