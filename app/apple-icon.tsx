import { ImageResponse } from "next/og";
import { OgPercent } from "@/lib/og/logoSvg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the logo's pixel-art "%", centered on void. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <OgPercent size={120} />
      </div>
    ),
    size,
  );
}
