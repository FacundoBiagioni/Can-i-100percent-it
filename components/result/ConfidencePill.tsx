"use client";

import type { ConfidenceLevel } from "@/lib/pipeline/types";
import { useT } from "@/lib/i18n/client";

export default function ConfidencePill({ confidence }: { confidence: ConfidenceLevel }) {
  return <span className="text-nav text-ash">{useT().confidence[confidence]}</span>;
}
