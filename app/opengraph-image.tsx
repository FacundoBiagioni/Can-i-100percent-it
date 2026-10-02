import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 64,
          background: "#000000",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#757575", marginBottom: 24 }}>Steam achievement checker</div>
        <div style={{ display: "flex", fontSize: 168, fontWeight: 700, color: "#ffffff", lineHeight: 0.85, letterSpacing: -8 }}>
          Can i
        </div>
        <div style={{ display: "flex", fontSize: 168, fontWeight: 700, color: "#ffffff", lineHeight: 0.85, letterSpacing: -8 }}>
          100% it?
        </div>
      </div>
    ),
    { ...size },
  );
}
