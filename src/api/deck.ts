import { apiClient } from './client';
import {
  Deck,
  UnlockResult,
  mapRawDeck,
  mapRawUnlockResult,
  rawDeckSchema,
  rawUnlockResultSchema,
} from '../domain/types';

// GET /deck — the closed deck (P7): every card of the main deck with its
// category and whether this couple has unlocked it. Cards carry no body; the
// text of a locked question stays server-side until it is unlocked and drawn.
export async function getDeck(): Promise<Deck> {
  const res = await apiClient.get('/deck');
  return mapRawDeck(rawDeckSchema.parse(res.data));
}

// POST /questions/{ulid}/unlock — spends one credit to unlock one card.
// The couple is resolved server-side from the token, never sent by the client.
// Returns the fresh balance and the fresh deck together, which is why the
// client needs no follow-up read.
//
// 422 covers both "not enough credits" and "question is not locked"; the
// callsite renders whatever the server says through parseApiError rather than
// matching on the message (brittle — the same reasoning as the daily card's
// 409 handling in P4).
export async function unlockQuestion(ulid: string): Promise<UnlockResult> {
  const res = await apiClient.post(`/questions/${ulid}/unlock`);
  return mapRawUnlockResult(rawUnlockResultSchema.parse(res.data));
}
