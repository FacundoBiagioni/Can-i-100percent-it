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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, #18181b, #000000)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#818cf8",
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Steam achievement checker
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            color: "white",
          }}
        >
          Can i 100% it<span style={{ color: "#818cf8" }}>?</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa", marginTop: 24 }}>
          Search a Steam game and find out
        </div>
      </div>
    ),
    { ...size },
  );
}
