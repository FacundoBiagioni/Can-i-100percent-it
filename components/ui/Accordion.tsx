"use client";

import { useState, type ReactNode } from "react";

export default function Accordion({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm"
        aria-expanded={open}
      >
        <span className="text-zinc-700 dark:text-zinc-300">{summary}</span>
        <span className="shrink-0 text-zinc-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          ⌄
        </span>
      </button>
      {open && <div className="pb-4 text-sm text-zinc-600 dark:text-zinc-400">{children}</div>}
    </div>
  );
}
