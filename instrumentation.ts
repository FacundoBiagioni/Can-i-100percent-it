import type { Instrumentation } from "next";

/** Every uncaught server error (pages, route handlers, server actions) goes
 * to the admin panel's error list. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  // The error log writes to Postgres, which only the Node.js runtime reaches.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordException } = await import("@/lib/errors/record");
  await recordException("server", err, request.path);
};
