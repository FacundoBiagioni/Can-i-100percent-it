import type { Dictionary } from "./dictionaries/en";

/**
 * A verdict's reasoning is stored in English, built from a few templates in
 * the rule engine (layers/3-rules/engine.ts). This recognizes each template
 * and rebuilds it in the visitor's language. Free text quoted from a source
 * (an AI reading of a forum thread) can't be translated and stays as is.
 * Also covers older wordings that used a dash, so stored rows read cleanly.
 */
export function localizeReasoning(text: string, t: Dictionary): string {
  const r = t.reasoning;
  let m: RegExpMatchArray | null;
  if (/^This AppID was not found on Steam\.$/.test(text)) return r.notFound;
  if (/^This app has no Steam achievements to track\.$/.test(text)) return r.noAchievements;
  if (/^100% appears obtainable with no known blockers\.$/.test(text)) return r.obtainable;
  if ((m = text.match(/^100% appears obtainable\. Requires: (.+)\.$/))) {
    const reqs = m[1].split(", ").map((x) => (x === "DLC" ? r.requirementDlc : x === "multiplayer" ? r.requirementMultiplayer : x));
    return r.obtainableWith(reqs.join(", "));
  }
  if ((m = text.match(/^Requires DLC that can no longer be purchased: (.+)\.$/))) return r.delistedDlc(m[1]);
  if (/^Requires a DLC that Steam no longer sells\.$/.test(text)) return r.unlistedDlc;
  if ((m = text.match(/^(\d+) achievements? (?:is|are) no longer obtainable: (.+)\.$/))) {
    const names = m[2].replace(/ and (\d+) more$/, (_, n) => ` ${r.andMore(Number(n))}`);
    return r.unobtainable(Number(m[1]), names);
  }
  if (/^Requires multiplayer, and the current player count is zero/.test(text)) return r.serversDead;
  if (/^Not enough data to confirm this game yet/.test(text)) return r.notEnoughData;
  if ((m = text.match(/^Unconfirmed: (.+)$/))) return `${r.unconfirmed} ${m[1]}`;
  return text.replace(/\s+—\s+/g, ", ");
}
