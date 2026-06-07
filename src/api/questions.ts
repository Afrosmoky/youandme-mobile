import { z } from 'zod';
import { apiClient } from './client';
import {
  rawQuestionSchema,
  mapRawQuestion,
  rawGameSessionSchema,
  mapRawGameSession,
  Question,
  GameSession,
} from '../domain/types';

// P3: /questions/next requires an active session. `question` is null and
// `session_complete` is true once the session's pool is exhausted; `session`
// carries the up-to-date counters.
const nextResponseSchema = z.object({
  question: rawQuestionSchema.nullable(),
  session: rawGameSessionSchema.optional(),
  session_complete: z.boolean().optional(),
});

export type NextQuestionResult = {
  question: Question | null;
  session: GameSession | null;
  sessionComplete: boolean;
};

export async function fetchNextQuestion(): Promise<NextQuestionResult> {
  const res = await apiClient.get('/questions/next');
  const parsed = nextResponseSchema.parse(res.data);
  return {
    question: parsed.question ? mapRawQuestion(parsed.question) : null,
    session: parsed.session ? mapRawGameSession(parsed.session) : null,
    sessionComplete: parsed.session_complete ?? false,
  };
}
