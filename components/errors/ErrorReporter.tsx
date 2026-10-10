"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors/report";

/** Reports uncaught browser errors and rejected promises. Errors React
 * catches in a boundary are reported by app/error.tsx instead. */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportClientError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportClientError(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
