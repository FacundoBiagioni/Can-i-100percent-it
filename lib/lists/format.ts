import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { ListDetail } from "./lists";

/** A list entry's reason for being there, in the visitor's language. */
export function formatDetail(d: ListDetail, t: Dictionary): string {
  const num = (n: number, digits = 0) =>
    n.toLocaleString(t.numberLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  switch (d.kind) {
    case "unobtainable":
      return t.lists.detail.unobtainable(d.count);
    case "unlistedDlc":
      return t.lists.detail.unlistedDlc;
    case "hours":
      return t.lists.detail.hours(num(d.hours, 1));
    case "perfectRate":
      return t.lists.detail.perfectRate(num(d.percent, d.percent < 1 ? 2 : 1), num(d.started));
    case "dlc":
      return t.lists.detail.dlc(d.count);
    case "servers":
      return t.lists.detail.servers[d.status];
  }
}
