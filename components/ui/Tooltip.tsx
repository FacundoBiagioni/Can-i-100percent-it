"use client";

import type { ReactNode } from "react";

/** Shows on hover and on keyboard focus of the wrapped element. */
export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-max max-w-55 bg-chalk px-2 py-1 text-left text-caption font-medium text-void opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
