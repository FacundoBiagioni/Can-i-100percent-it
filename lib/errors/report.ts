/** Sends a browser error to the site's error log. Fire and forget. */
export function reportClientError(err: unknown) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
    const body = JSON.stringify({ message: e.message || "Unknown error", stack: e.stack, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }))) {
      fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reporting must never cause a second error.
  }
}
