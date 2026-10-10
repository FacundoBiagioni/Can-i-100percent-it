import { NextResponse, type NextRequest } from "next/server";

// Where the site's images and videos come from: Steam's CDNs (store art,
// avatars, profile backgrounds, achievement icons, workshop/showcase art).
const STEAM_MEDIA =
  "https://*.steamstatic.com https://*.akamaihd.net https://*.steampowered.com https://steamcommunity.com https://*.steamusercontent.com";

/**
 * A strict Content-Security-Policy with a fresh nonce per page view. Next
 * reads the nonce from the request header and puts it on its own scripts;
 * 'strict-dynamic' then trusts what those scripts load (e.g. the analytics
 * script) and nothing else, so an injected <script> can't run.
 * Styles allow 'unsafe-inline': React and next/image write style attributes,
 * which nonces can't cover, and inline CSS can't run code.
 */
function contentSecurityPolicy(nonce: string, dev: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${STEAM_MEDIA}`,
    `media-src 'self' ${STEAM_MEDIA}`,
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Pages only: API responses, build assets and images aren't documents.
    // Link prefetches skip it too; the page they lead to gets its own nonce.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|logo.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
