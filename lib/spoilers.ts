/** Replaces each quoted hidden achievement name in a text (verdict
 * reasonings quote names: "Name") with a placeholder. Pure, so the server
 * (page metadata) and the client share it. */
export function maskHiddenNames(text: string, hiddenNames: string[], placeholder: string): string {
  let out = text;
  for (const name of hiddenNames) {
    if (name) out = out.split(`"${name}"`).join(`"${placeholder}"`);
  }
  return out;
}
