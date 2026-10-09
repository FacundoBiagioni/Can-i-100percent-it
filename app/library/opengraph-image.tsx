import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/geistFont";
import { OgBrand } from "@/lib/og/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Check your whole Steam library: which games can't be fully completed, and which need paid DLC.";

// Stand-in covers (no real game art in a site-wide card): tinted panels with
// the tags the real cards carry.
const CARDS = [
  { from: "#3a1410", to: "#120606", tag: "3 impossible", tagColor: "#f87171", pct: "64%", bar: 0.64, done: false },
  { from: "#0f2236", to: "#060b12", tag: "Paid DLC", tagColor: "#ffffff", pct: "41%", bar: 0.41, done: false },
  { from: "#10291f", to: "#050d0a", tag: "Completed", tagColor: "#34d399", pct: "100%", bar: 1, done: true },
  { from: "#2b2210", to: "#0e0b05", tag: "DLC owned", tagColor: "#34d399", pct: "87%", bar: 0.87, done: false },
];

/** Share card for /library: the title and a row of library cards. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#000000", fontFamily: "Geist" }}>
        <OgBrand />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 26, color: "#757575" }}>Library</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 600, color: "#ffffff", lineHeight: 0.92, letterSpacing: -3.5 }}>
              <span>Check your</span>
              <span>whole library.</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {CARDS.map((c) => (
              <div key={c.tag} style={{ display: "flex", flexDirection: "column", gap: 10, width: 120 }}>
                <div style={{ position: "relative", display: "flex", width: 120, height: 180, background: `linear-gradient(160deg, ${c.from}, ${c.to})`, border: "1px solid #2e2e2e" }}>
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", padding: "3px 7px", background: "rgba(0,0,0,0.85)", color: c.tagColor, fontSize: 13 }}>{c.tag}</div>
                  <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", padding: "3px 7px", background: "rgba(0,0,0,0.85)", color: "#ffffff", fontSize: 14, fontWeight: 600 }}>{c.pct}</div>
                </div>
                <div style={{ display: "flex", width: 120, height: 4, background: "#2e2e2e" }}>
                  <div style={{ display: "flex", width: 120 * c.bar, height: 4, background: c.done ? "#34d399" : "#ffffff" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
