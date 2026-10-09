import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/geistFont";
import { OgBrand } from "@/lib/og/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "How a verdict is made: sources feed the rules, which settle on a verdict.";

const SOURCES = ["Steam", "SteamHunters", "Achievement Scouts", "Forums · Guides"];
const SOURCE_Y = [40, 120, 200, 280];
const VERDICTS = [
  { y: 90, color: "#34d399" },
  { y: 175, color: "#f87171" },
  { y: 260, color: "#fbbf24" },
];
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

/** Share card for /how-it-works: the title and a still of the flow diagram. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#000000", fontFamily: "Geist" }}>
        <OgBrand />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 26, color: "#757575" }}>How it works</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 600, color: "#ffffff", lineHeight: 0.92, letterSpacing: -4 }}>
              <span>How a verdict</span>
              <span>is made.</span>
            </div>
          </div>
          <div style={{ display: "flex", position: "relative", width: 470, height: 320 }}>
            <svg width="470" height="320" viewBox="0 0 470 320" style={{ position: "absolute", top: 0, left: 0 }}>
              {SOURCE_Y.map((y) => (
                <path key={y} d={curve(200, y, 262, 175)} fill="none" stroke="#454545" strokeWidth="2" />
              ))}
              {VERDICTS.map((v) => (
                <path key={v.y} d={curve(352, 175, 425, v.y)} fill="none" stroke={v.color} strokeOpacity="0.6" strokeWidth="2" />
              ))}
              {VERDICTS.map((v) => (
                <circle key={`c${v.y}`} cx="440" cy={v.y} r="12" fill={v.color} />
              ))}
            </svg>
            {SOURCES.map((name, i) => (
              <div key={name} style={{ position: "absolute", left: 0, top: SOURCE_Y[i] - 20, width: 200, height: 40, display: "flex", alignItems: "center", paddingLeft: 14, border: "1px solid #454545", background: "#000000", color: "#c4c4c4", fontSize: 17 }}>
                {name}
              </div>
            ))}
            <div style={{ position: "absolute", left: 262, top: 150, width: 90, height: 50, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #ffffff", background: "#000000", color: "#ffffff", fontSize: 19, fontWeight: 600 }}>
              Rules
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
