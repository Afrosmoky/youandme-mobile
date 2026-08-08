// Gameplay constants for the local two-player game (P10). Parameters rather
// than literals buried in the logic: the canon asks explicitly for the challenge
// rhythm to stay configurable, so every function that sequences a queue takes it
// as an argument and this is only the default.

/**
 * A challenge card is dealt after every N question cards.
 *
 * 5 comes from the demo (kod_firebase/src/config/game.ts, CHALLENGE_INTERVAL)
 * and is confirmed product-side.
 */
export const CHALLENGE_INTERVAL = 5;

/**
 * Most question ulids POST /game/local/report accepts in one call.
 *
 * Mirrors the backend cap, which refuses a larger batch with a 422 rather than
 * truncating it. A deck is capped at the same number for the same reason — a
 * phone must never be dealt more cards than it can report back in one go.
 */
export const REPORT_BATCH_MAX = 100;
