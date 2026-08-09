import { z } from 'zod';
import { apiClient } from './client';
import { rawQuestionSchema, mapRawQuestion, Question } from '../domain/types';

// GET /questions/deck — a whole playable deck in one call (P10 backend slice c).
//
// This is the security line the canon draws (§5): the server decides WHAT this
// couple may play — the 60/40 split, their unlocked cards, the cards they have
// already played — and the phone only decides in what ORDER. A card that is not
// dealt here cannot be reached by any amount of client-side sequencing.
//
// Unrelated to GET /deck despite the name: that one is the closed-deck
// entitlement ("which locked cards do we own"), this one is content to play.
const deckResponseSchema = z.object({
  questions: z.array(rawQuestionSchema),
});

/**
 * Fetches the deck for one local session.
 *
 * Deliberately a plain call rather than a TanStack query, unlike every screen
 * that displays server state. The deck is read once and frozen into the queue in
 * AsyncStorage, which is then the only source of truth for what this session
 * plays. Keeping a second copy in the query cache would invite exactly the bug
 * the queue exists to prevent — a resumed session finding different cards than
 * it started with. The imperative reads in CategoryPickerScreen (startSession)
 * and QuestionScreen (fetchNextQuestion) are the same shape.
 *
 * `categorySlug` null means mix, spelled as POST /sessions/start spells it.
 * `limit` is clamped server-side to 1..100 and defaults to 40 there; we leave it
 * to the backend rather than restating a number that would then live in two
 * places. An exhausted deck comes back as an empty list, not an error — the
 * setup screen says so instead of walking into an empty game.
 *
 * The cards carry `liked` since S3a, as /questions/next always has. Nothing here
 * had to change for it — rawQuestionSchema already declared the field optional
 * with a false default, so the cards simply stopped falling back to that default
 * — but it is what the heart on the game card reads (S3b), so it is worth a test
 * rather than an assumption.
 */
export async function fetchGameDeck(
  categorySlug: string | null,
): Promise<Question[]> {
  const res = await apiClient.get('/questions/deck', {
    params: categorySlug ? { category_slug: categorySlug } : {},
  });
  return deckResponseSchema.parse(res.data).questions.map(mapRawQuestion);
}

// POST /game/local/report — the cards this phone dealt, sent in one batch after
// the session (P10 backend slice a).
//
// This is the other half of the client-authoritative bargain: the phone plays
// offline, so the server learns what was played only when told. It is the whole
// progress path since P10 — the map counts played cards, not saved memories.
const reportResponseSchema = z.object({
  played_total: z.number(),
  newly_played: z.number(),
});

export type ReportResult = {
  playedTotal: number;
  newlyPlayed: number;
};

/**
 * Reports one batch of played cards.
 *
 * Idempotent by design (the backend treats it as a set), which is what makes the
 * retry story simple: a batch that may or may not have landed can always be sent
 * again. The caller still has two obligations the endpoint does NOT forgive —
 * no duplicate ulid inside one batch, and no more than 100 per call, both 422 —
 * and reportBatches in src/domain/localGame.ts is what satisfies them.
 *
 * Cards the couple may not play (a locked card they never unlocked, a daily
 * question) are dropped server-side rather than refused, so the client does not
 * filter what it sends.
 */
export async function reportPlayedCards(
  questionUlids: string[],
): Promise<ReportResult> {
  const res = await apiClient.post('/game/local/report', {
    question_ulids: questionUlids,
  });
  const parsed = reportResponseSchema.parse(res.data);
  return {
    playedTotal: parsed.played_total,
    newlyPlayed: parsed.newly_played,
  };
}
