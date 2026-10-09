import { ImageResponse } from "next/og";
import { OgLogo } from "@/lib/og/logoSvg";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the site's logo, two screen pixels per cell, on void. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <OgLogo size={60} />
      </div>
    ),
    size,
  );
}
