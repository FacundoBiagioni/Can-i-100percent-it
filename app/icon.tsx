import { ImageResponse } from "next/og";
import { OgPercent } from "@/lib/og/logoSvg";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the logo's pixel-art "%", two screen pixels per cell, on void. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <OgPercent size={48} />
      </div>
    ),
    size,
  );
}
