function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchDlcName<T extends { dlcAppId: number; name: string }>(
  freeTextName: string,
  dlcList: T[],
): T | null {
  const target = normalize(freeTextName);
  if (!target) return null;

  const exact = dlcList.find((d) => normalize(d.name) === target);
  if (exact) return exact;

  return (
    dlcList.find((d) => {
      const norm = normalize(d.name);
      return norm.length > 2 && (target.includes(norm) || norm.includes(target));
    }) ?? null
  );
}
