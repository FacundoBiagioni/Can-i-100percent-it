import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/geistFont";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the "%" of "100%" in ember on void, square like the site. */
export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ff4d00",
          fontSize: 52,
          fontWeight: 600,
          fontFamily: "Geist",
          letterSpacing: "-0.04em",
        }}
      >
        %
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
