import Accordion from "@/components/ui/Accordion";

export type EvidenceItem = {
  id: number;
  claim: unknown;
  reasoning: string | null;
  confidence: "high" | "medium" | "low";
  rawUrl: string | null;
  checkedAt: Date | string;
  source: { displayName: string };
};

function summarizeClaim(claim: unknown): string {
  if (typeof claim === "object" && claim !== null && "type" in claim) {
    const type = String((claim as { type: unknown }).type).replace(/_/g, " ");
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  return "Signal";
}

export default function EvidenceAccordion({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Evidence ({items.length})
      </div>
      {items.map((item) => (
        <Accordion key={item.id} summary={`${item.source.displayName} — ${summarizeClaim(item.claim)}`}>
          <div className="flex flex-col gap-1">
            {item.reasoning && <p>{item.reasoning}</p>}
            <p className="text-xs text-zinc-400">
              Confidence: {item.confidence} · Checked {new Date(item.checkedAt).toLocaleDateString()}
              {item.rawUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a href={item.rawUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    source
                  </a>
                </>
              )}
            </p>
          </div>
        </Accordion>
      ))}
    </div>
  );
}
