import { z } from 'zod';
import { apiClient } from './client';
import {
  rawDailyCardSchema,
  mapRawDailyCard,
  rawMemorySchema,
  mapRawMemory,
  rawCoupleSchema,
  mapRawCouple,
  DailyCard,
  Memory,
  Couple,
} from '../domain/types';

// P4: POST /daily-card/answer returns the created memory plus the updated
// couple (its streak_current is already effective).
const answerResponseSchema = z.object({
  memory: rawMemorySchema,
  couple: rawCoupleSchema,
});

export type AnswerDailyCardInput = {
  questionUlid: string;
  answerA: string;
  // P4 mobile always sends null; the second player's answer lands in P10.
  answerB?: string | null;
};

export type AnswerDailyCardResult = {
  memory: Memory;
  couple: Couple;
};

// GET /daily-card — the couple's question of the day + streak state.
export async function getDailyCard(): Promise<DailyCard> {
  const res = await apiClient.get('/daily-card');
  return mapRawDailyCard(rawDailyCardSchema.parse(res.data));
}

// POST /daily-card/answer — records the answer as a memory (origin=daily) and
// advances the streak. A 409 means the card is stale (already answered today,
// or a non-today card): callers refetch rather than parse the message.
export async function answerDailyCard(
  input: AnswerDailyCardInput,
): Promise<AnswerDailyCardResult> {
  const res = await apiClient.post('/daily-card/answer', {
    question_ulid: input.questionUlid,
    answer_a: input.answerA,
    answer_b: input.answerB ?? null,
  });
  const parsed = answerResponseSchema.parse(res.data);
  return {
    memory: mapRawMemory(parsed.memory),
    couple: mapRawCouple(parsed.couple),
  };
}
