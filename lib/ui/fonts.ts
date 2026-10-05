import { IBM_Plex_Mono } from "next/font/google";

/** The "100%" glyph font of the homepage animations (hero and the drifting
 * digits below it), so both draw exactly the same characters. */
export const plexMono = IBM_Plex_Mono({ weight: "600", subsets: ["latin"], display: "block" });
