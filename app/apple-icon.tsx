import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/geistFont";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: "100%" in white with the "%" in ember, on void. */
export default async function AppleIcon() {
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
          color: "#ffffff",
          fontSize: 64,
          fontWeight: 600,
          fontFamily: "Geist",
          letterSpacing: "-0.05em",
        }}
      >
        100<span style={{ color: "#ff4d00" }}>%</span>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
