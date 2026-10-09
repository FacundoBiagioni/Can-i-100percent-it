/**
 * The logo, traced from the creator's pixel-art original
 * (assets/brand/logo-original.jpg, 32x32 cells of 10px): a 30x30 grid once
 * cropped to its frame. Each entry is one horizontal run: [x, y, width], one
 * cell tall. Every rendering of the logo (navbar, footer, favicon, share
 * images, public/logo.svg) draws from this, so they all match exactly.
 */
export const LOGO_GRID = 30;
export const FRAME: [number, number, number][] = [[0, 0, 30], [0, 1, 1], [29, 1, 1], [0, 2, 1], [29, 2, 1], [0, 3, 1], [29, 3, 1], [0, 4, 1], [29, 4, 1], [0, 5, 1], [29, 5, 1], [0, 6, 1], [29, 6, 1], [0, 7, 1], [29, 7, 1], [0, 8, 1], [29, 8, 1], [0, 9, 1], [29, 9, 1], [0, 10, 1], [29, 10, 1], [0, 11, 1], [29, 11, 1], [0, 12, 1], [29, 12, 1], [0, 13, 1], [29, 13, 1], [0, 14, 1], [29, 14, 1], [0, 15, 1], [29, 15, 1], [0, 16, 1], [29, 16, 1], [0, 17, 1], [29, 17, 1], [0, 18, 1], [29, 18, 1], [0, 19, 1], [29, 19, 1], [0, 20, 1], [29, 20, 1], [0, 21, 1], [29, 21, 1], [0, 22, 1], [29, 22, 1], [0, 23, 1], [29, 23, 1], [0, 24, 1], [29, 24, 1], [0, 25, 1], [29, 25, 1], [0, 26, 1], [29, 26, 1], [0, 27, 1], [29, 27, 1], [0, 28, 1], [29, 28, 1], [0, 29, 30]];
export const PERCENT: [number, number, number][] = [[6, 3, 4], [22, 3, 5], [5, 4, 6], [21, 4, 6], [4, 5, 8], [20, 5, 7], [3, 6, 10], [19, 6, 8], [3, 7, 10], [18, 7, 9], [3, 8, 10], [17, 8, 9], [3, 9, 10], [16, 9, 9], [4, 10, 8], [15, 10, 9], [5, 11, 6], [14, 11, 9], [6, 12, 4], [13, 12, 9], [12, 13, 9], [11, 14, 9], [10, 15, 9], [9, 16, 9], [8, 17, 9], [20, 17, 4], [7, 18, 9], [19, 18, 6], [6, 19, 9], [18, 19, 8], [5, 20, 9], [17, 20, 10], [4, 21, 9], [17, 21, 10], [3, 22, 9], [17, 22, 10], [3, 23, 8], [17, 23, 10], [3, 24, 7], [18, 24, 8], [3, 25, 6], [19, 25, 6], [3, 26, 5], [20, 26, 4]];

/** All runs of one color as a single SVG path. Drawn as one shape, the
 * browser only smooths its outer edge: separate rects, scaled to a size that
 * isn't a whole multiple of 30px, each got smoothed on their own and left
 * dark hairlines where rows meet. */
export function runsToPath(runs: [number, number, number][]): string {
  return runs.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join("");
}

export const FRAME_PATH = runsToPath(FRAME);
export const PERCENT_PATH = runsToPath(PERCENT);
