"use client";

import { useState } from "react";
import { GitBranch, Bug, Ban } from "lucide-react";

type FlaggedAchievement = {
  id: number;
  apiName: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  flags: ("missable" | "bugged" | "unobtainable")[];
  reasons: { sourceName: string; reasoning: string | null; rawUrl: string | null }[];
};

const FLAG_CONFIG = {
  missable: { icon: GitBranch, label: "Missable", className: "bg-amber-950 text-amber-300" },
  bugged: { icon: Bug, label: "Bugged", className: "bg-red-950 text-red-300" },
  unobtainable: { icon: Ban, label: "Unobtainable", className: "bg-red-950 text-red-300" },
};

export default function AchievementDetailPanel({ appId, count }: { appId: number; count: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FlaggedAchievement[] | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (items !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${appId}/achievements`);
      const data = await res.json();
      setItems(data.achievements ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={toggle}
        className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
      >
        {open ? "Hide affected achievements" : `View affected achievements (${count})`}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {loading && <p className="px-2 text-sm text-zinc-500">Loading…</p>}
          {!loading && items?.length === 0 && (
            <p className="px-2 text-sm text-zinc-500">
              These achievements are flagged in aggregate, but no source named a specific one.
            </p>
          )}
          {!loading &&
            items?.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                {a.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{a.displayName}</span>
                    {a.flags.map((flag) => {
                      const config = FLAG_CONFIG[flag];
                      const Icon = config.icon;
                      return (
                        <span
                          key={flag}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      );
                    })}
                  </div>
                  {a.description && <p className="text-xs text-zinc-500">{a.description}</p>}
                  {a.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-zinc-400">
                      <span className="text-zinc-500">{r.sourceName}:</span> {r.reasoning}
                    </p>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
