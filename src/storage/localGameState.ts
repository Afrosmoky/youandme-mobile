import { z } from 'zod';
import { LocalGameState } from '../domain/localGame';
import { kv } from './kv';

// Persistence for the local game (P10). Pause and resume across app launches is
// the whole reason this state lives on the phone rather than on the server —
// Wiktoria's "stan gry w pamięci lokalnej", and canon ◆A's client-authoritative
// sequencing rests on it.
//
// Exported because the tests write raw values under it; keeping the literal in
// two places is how a rename quietly stops the tests testing anything.
export const LOCAL_GAME_STATE_KEY = 'jaity.local-game-state';

/**
 * Bump on any change to LocalGameState that a previously stored value cannot
 * satisfy.
 *
 * Stored under a version envelope because the shape will move — S3 alone adds
 * what the report has already flushed — and a new build reading the old shape
 * must not take the game screen down on launch. An unrecognised version is
 * DROPPED, not migrated: the cost is one interrupted session, and migration code
 * for a transient game state would outlive its usefulness immediately.
 */
export const LOCAL_GAME_STATE_VERSION = 1;

// The persisted shape of a Question. Spelled out here rather than reusing
// rawQuestionSchema from the domain, because that one describes the API's
// snake_case wire format and this one describes our own camelCase state on disk
// — two contracts that happen to overlap today and have no reason to move
// together.
const questionSchema = z.object({
  ulid: z.string(),
  body: z.string(),
  type: z.string(),
  category: z.object({ slug: z.string(), name: z.string() }).nullable(),
  tags: z.array(z.string()),
  // S2: optional with a null default, which is what keeps the version at 1. A
  // game dealt before this build has cards with no options key at all, and those
  // states still parse — an open card and a card from before choice cards existed
  // are the same thing to the screen. Requiring the field would have dropped
  // every game in progress on upgrade, which is precisely the failure the version
  // envelope exists to avoid, not to cause.
  options: z
    .object({ items: z.array(z.string()), multiple: z.boolean() })
    .nullable()
    .optional()
    .default(null),
  liked: z.boolean(),
  isLocked: z.boolean(),
});

const challengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.literal('yoga').optional(),
});

const queueItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('question'), question: questionSchema }),
  z.object({ kind: z.literal('challenge'), challenge: challengeSchema }),
]);

// Annotated with the domain type on purpose: add a field to LocalGameState and
// forget it here, and this stops compiling rather than silently dropping that
// field from every resumed session.
const stateSchema: z.ZodType<LocalGameState> = z.object({
  player1: z.string(),
  player2: z.string(),
  categorySlug: z.string().nullable(),
  queue: z.array(queueItemSchema),
  cursor: z.number(),
  activePlayer: z.union([z.literal('p1'), z.literal('p2')]),
  answers: z.object({ p1: z.string(), p2: z.string() }),
  playedUlids: z.array(z.string()),
  savedMemoryUlids: z.array(z.string()),
  startedAt: z.string(),
});

// The state is left unknown at this level so a version mismatch is answered
// before anything tries to read a shape it was never meant to fit.
const envelopeSchema = z.object({
  version: z.number(),
  state: z.unknown(),
});

/**
 * The stored session, or null when there is nothing to resume.
 *
 * Null covers four situations — nothing stored, a version this build does not
 * know, a value that is not JSON, a value that does not fit the shape — and they
 * are one situation for the caller. Everything but "nothing stored" is also
 * cleared on the way out, so a value that cannot be read once is not left to
 * fail again on every launch.
 */
export async function loadLocalGameState(): Promise<LocalGameState | null> {
  const raw = await kv.get(LOCAL_GAME_STATE_KEY);
  if (raw === null) {
    return null;
  }

  const state = parseStored(raw);
  if (state === null) {
    await clearLocalGameState();
  }
  return state;
}

export async function saveLocalGameState(state: LocalGameState): Promise<void> {
  await kv.set(
    LOCAL_GAME_STATE_KEY,
    JSON.stringify({ version: LOCAL_GAME_STATE_VERSION, state }),
  );
}

export async function clearLocalGameState(): Promise<void> {
  await kv.remove(LOCAL_GAME_STATE_KEY);
}

function parseStored(raw: string): LocalGameState | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  const envelope = envelopeSchema.safeParse(decoded);
  if (
    !envelope.success ||
    envelope.data.version !== LOCAL_GAME_STATE_VERSION
  ) {
    return null;
  }

  const state = stateSchema.safeParse(envelope.data.state);
  return state.success ? state.data : null;
}
