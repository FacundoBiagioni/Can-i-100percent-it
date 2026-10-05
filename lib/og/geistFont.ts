// Geist SemiBold for share images. next/og only bundles Geist Regular, so
// without this every title in a preview card renders thin. Google Fonts
// serves TrueType (which next/og can read; it can't read woff2) when the
// request has no browser user agent. Cached per server instance.
let cached: Promise<ArrayBuffer | null> | null = null;

export function geistSemiBold(): Promise<ArrayBuffer | null> {
  cached ??= (async () => {
    try {
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@600")).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!url) return null;
      const res = await fetch(url);
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  return cached;
}

/** `fonts` option for ImageResponse; empty (default font) if the fetch failed. */
export async function ogFonts() {
  const data = await geistSemiBold();
  return data ? [{ name: "Geist", data, weight: 600 as const, style: "normal" as const }] : [];
}
