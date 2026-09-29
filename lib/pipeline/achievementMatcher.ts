function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Matches a free-text achievement name (as extracted from a forum post,
 * guide, or Wikipedia article by the AI classifier) against the game's own
 * persisted achievement list. There's no structured link to Steam's
 * internal apiName in the source material — only ever an exact or
 * near-exact quote of the achievement's display name — so this is
 * deliberately simple (exact match, then substring containment) rather than
 * a fuzzy/edit-distance matcher, to avoid false-linking one achievement's
 * evidence to a different, similarly-named one.
 */
export function matchAchievementName<T extends { apiName: string; displayName: string }>(
  freeTextName: string,
  achievements: T[],
): T | null {
  const target = normalize(freeTextName);
  if (!target) return null;

  const exact = achievements.find((a) => normalize(a.displayName) === target);
  if (exact) return exact;

  return (
    achievements.find((a) => {
      const norm = normalize(a.displayName);
      return norm.length > 2 && (target.includes(norm) || norm.includes(target));
    }) ?? null
  );
}
