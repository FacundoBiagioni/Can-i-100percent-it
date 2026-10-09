"use client";

import { useFormStatus } from "react-dom";

/** A form button that says it's working: accepting a report re-runs the
 * game's analysis, which takes a few seconds. */
export default function SubmitButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-50`}>
      {pending ? "Procesando..." : children}
    </button>
  );
}
