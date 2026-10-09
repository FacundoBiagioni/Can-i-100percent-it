/**
 * The logo: the creator's pixel-art "%", traced cell by cell from
 * assets/brand/logo-original.jpg (32x32 cells of 10px) and cropped tight to
 * the glyph (24x24). Each entry is one horizontal run: [x, y, width], one
 * cell tall. Every rendering (the wordmark, favicon, share images,
 * public/logo.svg) draws from this, so they all match exactly.
 */
export const GLYPH_WIDTH = 24;
export const GLYPH_HEIGHT = 24;
export const PERCENT: [number, number, number][] = [[3, 0, 4], [19, 0, 5], [2, 1, 6], [18, 1, 6], [1, 2, 8], [17, 2, 7], [0, 3, 10], [16, 3, 8], [0, 4, 10], [15, 4, 9], [0, 5, 10], [14, 5, 9], [0, 6, 10], [13, 6, 9], [1, 7, 8], [12, 7, 9], [2, 8, 6], [11, 8, 9], [3, 9, 4], [10, 9, 9], [9, 10, 9], [8, 11, 9], [7, 12, 9], [6, 13, 9], [5, 14, 9], [17, 14, 4], [4, 15, 9], [16, 15, 6], [3, 16, 9], [15, 16, 8], [2, 17, 9], [14, 17, 10], [1, 18, 9], [14, 18, 10], [0, 19, 9], [14, 19, 10], [0, 20, 8], [14, 20, 10], [0, 21, 7], [15, 21, 8], [0, 22, 6], [16, 22, 6], [0, 23, 5], [17, 23, 4]];

/** All runs as a single SVG path. Drawn as one shape, the browser only
 * smooths its outer edge: separate rects, at sizes that aren't whole cells,
 * each got smoothed on their own and left dark hairlines where rows meet. */
export function runsToPath(runs: [number, number, number][]): string {
  return runs.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join("");
}

export const PERCENT_PATH = runsToPath(PERCENT);
