/**
 * Whether an achievement needs other players, read from its own name and
 * description (Steam's schema, English). Deterministic on purpose: the same
 * text always gives the same answer, and it costs no AI quota.
 *
 * This replaced the store's categories ("Multi-player", "Co-op"...) as the
 * signal. Those say the game *has* multiplayer, not that 100% needs it, and
 * Steam drops them when a game's multiplayer shuts down (Batman: Arkham
 * Origins), which hid exactly the games where it matters most.
 */
const MULTIPLAYER_PATTERNS: RegExp[] = [
  /\bmulti-?player\b/i,
  /\bonline\b/i,
  /\bco-op(erative)?\b/i, // not "coop": that's usually a chicken coop
  /\bcooperative\b/i,
  /\bpvp\b/i,
  /\branked\b/i,
  /\bmatchmaking\b/i,
  /\bdeathmatch\b/i,
  /\b(another|other|online|real|human|enemy|opposing) players?\b/i,
  /\bwith (a )?friends?\b/i,
  /\b(public|private|custom|online|ranked|quick) (match|matches|game|games|lobby|lobbies)\b/i,
  /\bplayer match(es)?\b/i,
  /\b(dedicated|official|public|full) (multiplayer )?servers?\b/i,
  /\bsplit-?screen\b/i,
  /\bversus mode\b/i,
  /\bfree weekend players\b/i,
];

// Text that matches a pattern above without meaning other people.
const FALSE_FRIENDS: RegExp[] = [
  /\boffline\b/i, // "play offline" / "in offline mode"
  /\bsingle[- ]?player\b/i,
  /\bagainst (the )?(ai|cpu|computer|bots?)\b/i,
  // Either mode works ("Win a Multiplayer or Skirmish match").
  /\b(skirmish|campaign) or (multi-?player|online)\b|\b(multi-?player|online) or (skirmish|campaign)\b/i,
];

export function isMultiplayerAchievement(name: string, description: string | null | undefined): boolean {
  const text = `${name} ${description ?? ""}`;
  if (!MULTIPLAYER_PATTERNS.some((re) => re.test(text))) return false;
  return !FALSE_FRIENDS.some((re) => re.test(text));
}
