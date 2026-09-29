"use client";

import type { ReactNode } from "react";

export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-zinc-100 px-3 py-1.5 text-center text-xs font-medium text-zinc-900 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-100" />
      </span>
    </span>
  );
}
