import { ImageResponse } from "next/og";
import { OgLogo } from "@/lib/og/logoSvg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the site's logo, centered on void with room around it. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <OgLogo size={150} />
      </div>
    ),
    size,
  );
}
