"use client";

import { useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import type { AnalysisResult } from "@/lib/pipeline/types";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import RequirementsSummary from "./RequirementsSummary";
import AchievementsTable from "./AchievementsTable";
import { formatPrice } from "@/lib/ui/price";

const PEEK_PX = 88; // 5.5rem at the default root font size

function buildPeekSummary(analysis: AnalysisResult, achievementCount: number): string | null {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);
  const parts: string[] = [];
  if (requiredDlc.length > 0) parts.push(`${requiredDlc.length} DLC, ${formatPrice(analysis.totalDlcCostCents)}`);
  // Multiplayer is deliberately left out: the server icon (and its tooltip,
  // which carries the server status) already says everything there is to
  // say, so it alone shouldn't open a sheet.
  if (achievementCount > 0) parts.push(`${achievementCount} achievement${achievementCount === 1 ? "" : "s"} flagged`);
  if (analysis.estimatedHours !== null) parts.push(`~${Math.round(analysis.estimatedHours)}h to 100%`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Sits fixed over the full-bleed hero background, collapsed to a small peek
 * (just the summary line) by default so the hero — game name, verdict,
 * icons — is the first and only thing seen on entry. Drag the handle (or
 * just tap it) to slide it up, covering the background, to reveal the full
 * DLC/achievement detail. Renders nothing at all if there's genuinely
 * nothing to disclose.
 */
export default function BottomSheet({
  analysis,
  achievements,
}: {
  analysis: AnalysisResult;
  achievements: FlaggedAchievement[];
}) {
  const [expanded, setExpanded] = useState(false);
  // Pixel offset while a drag is actively in progress — null means "not
  // dragging right now," so the CSS class-based transform (with its
  // transition) takes over for the snap animation instead.
  const [dragPx, setDragPx] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startTranslate: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const summary = buildPeekSummary(analysis, achievements.length);
  if (!summary) return null;

  function collapsedTranslate() {
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0;
    return Math.max(height - PEEK_PX, 0);
  }

  function handlePointerDown(e: React.PointerEvent) {
    // Capture failure (e.g. the pointer already released) shouldn't stop
    // the drag from being tracked via React's own event listeners.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragState.current = { startY: e.clientY, startTranslate: expanded ? 0 : collapsedTranslate(), moved: false };
    setDragPx(dragState.current.startTranslate);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const delta = e.clientY - dragState.current.startY;
    if (Math.abs(delta) > 4) dragState.current.moved = true;
    const max = collapsedTranslate();
    setDragPx(Math.min(Math.max(dragState.current.startTranslate + delta, 0), max));
  }

  function endDrag() {
    if (!dragState.current) return;
    if (dragState.current.moved) {
      justDraggedRef.current = true;
      const max = collapsedTranslate();
      setExpanded((dragPx ?? 0) < max / 2);
    }
    dragState.current = null;
    setDragPx(null);
  }

  function handleClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setExpanded((v) => !v);
  }

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex h-[min(70dvh,42rem)] flex-col border-x border-t border-carbon bg-void sm:left-auto sm:right-6 sm:w-104 ${
        dragPx === null ? `transition-transform duration-300 ease-out ${expanded ? "translate-y-0" : "translate-y-[calc(100%-5.5rem)]"}` : ""
      }`}
      style={dragPx !== null ? { transform: `translateY(${dragPx}px)` } : undefined}
    >
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        className="flex h-[5.5rem] shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-2 border-b border-carbon px-4 active:cursor-grabbing"
        aria-expanded={expanded}
      >
        <span className="h-px w-10 bg-carbon" />
        <span className="flex items-center gap-1.5 text-nav font-medium text-chalk">
          {summary}
          <ChevronUp aria-hidden className={`h-4 w-4 shrink-0 text-graphite transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          <RequirementsSummary analysis={analysis} />
          <AchievementsTable achievements={achievements} />
        </div>
      </div>
    </div>
  );
}
