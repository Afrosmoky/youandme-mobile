/**
 * Fisher-Yates, returning a new array — the input is left alone, because the
 * one thing it is used on (CHALLENGES) is a module-level constant shared by
 * every session.
 *
 * Lives here rather than inside buildQueue on purpose: sequencing stays
 * deterministic and testable, and picking an order is the caller's decision. The
 * local game shuffles once, when a fresh session is dealt, so a couple sees a
 * different slice of the twenty challenges each time — and never the same one
 * twice within a session, since they are still dealt in order from the shuffled
 * pool. Resuming does not reshuffle: the queue is already sealed into the stored
 * state by then.
 *
 * `random` is injectable so tests can pin an order without stubbing globals.
 */
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
