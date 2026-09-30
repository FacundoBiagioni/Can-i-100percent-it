import Image from "next/image";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";

// A fixed, curated set of visually strong, widely-recognized games — purely
// decorative, not user data. Fetched (and cached 24h) rather than hardcoding
// image URLs directly, since Steam's asset URLs carry a cache-busting
// timestamp that can change.
const COLLAGE_APP_IDS = [
  1145360, // Hades
  620, // Portal 2
  413150, // Stardew Valley
  105600, // Terraria
  220, // Half-Life 2
  234140, // Mad Max
  730, // Counter-Strike 2
  4000, // Garry's Mod
  292030, // The Witcher 3
  1245620, // Elden Ring
  1086940, // Baldur's Gate 3
  1174180, // Red Dead Redemption 2
  1091500, // Cyberpunk 2077
  3240220, // Grand Theft Auto V Enhanced
];

export default async function GameCollageBackground() {
  const details = await Promise.all(COLLAGE_APP_IDS.map((id) => getAppDetails(id)));
  const images = details.filter((d): d is NonNullable<typeof d> => d !== null && !!d.headerImage);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 grid grid-cols-3 gap-1 opacity-80 sm:grid-cols-5 md:grid-cols-7"
        style={{ animation: "slow-pan 50s ease-in-out infinite alternate" }}
      >
        {images.map((game) => (
          <div key={game.appId} className="relative h-full w-full">
            <Image src={game.headerImage!} alt="" fill sizes="(max-width: 640px) 33vw, (max-width: 768px) 20vw, 14vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-black/95" />
    </div>
  );
}
