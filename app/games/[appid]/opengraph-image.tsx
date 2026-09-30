import { ImageResponse } from "next/og";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATUS_CONFIG: Record<AnalysisStatus, { emoji: string; label: string; color: string }> = {
  green: { emoji: "🟢", label: "100% obtainable", color: "#34d399" },
  red: { emoji: "🔴", label: "100% impossible", color: "#f87171" },
  yellow: { emoji: "🟡", label: "Insufficient info", color: "#fbbf24" },
  no_achievements: { emoji: "⚪", label: "No achievements", color: "#a1a1aa" },
};

export default async function GameOpengraphImage({ params }: { params: Promise<{ appid: string }> }) {
  const { appid } = await params;
  const appId = Number(appid);

  const [game, analysis, details] = await Promise.all([
    getOrCreateGame(appId),
    getCachedAnalysis(appId),
    getAppDetails(appId),
  ]);

  const name = game?.name ?? `AppID ${appId}`;
  const heroImage = details?.heroImage || game?.headerImageUrl;
  const status = analysis ? STATUS_CONFIG[analysis.status] : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000" }}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            width={1200}
            height={630}
            style={{ objectFit: "cover", position: "absolute", inset: 0 }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.45))",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 64,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "white" }}>{name}</div>
          {status && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
              <div style={{ display: "flex", fontSize: 40 }}>{status.emoji}</div>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: status.color }}>
                {status.label}
              </div>
            </div>
          )}
          <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa", marginTop: 16 }}>Can i 100% it?</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
