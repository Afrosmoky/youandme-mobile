import axios from 'axios';
import { z } from 'zod';
import { apiClient } from './client';
import {
  rawGameSessionSchema,
  mapRawGameSession,
  type GameSession,
} from '../domain/types';

const sessionResponseSchema = z.object({
  session: rawGameSessionSchema,
});

// Starts a new session. Pass null for the "mix" mode (all categories).
// May answer 409 when the couple already has an active session — this wrapper
// does NOT swallow it; the callsite (CategoryPickerScreen, M2) decides whether
// to resume the existing session or end it.
export async function startSession(
  categorySlug: string | null,
): Promise<GameSession> {
  const { data } = await apiClient.post('/sessions/start', {
    category_slug: categorySlug,
  });
  const parsed = sessionResponseSchema.parse(data);
  return mapRawGameSession(parsed.session);
}

// Returns the couple's active session, or null when there is none (404).
export async function getActiveSession(): Promise<GameSession | null> {
  try {
    const { data } = await apiClient.get('/sessions/active');
    const parsed = sessionResponseSchema.parse(data);
    return mapRawGameSession(parsed.session);
  } catch (err) {
    // 404 means "no active session" — not an error condition for the caller.
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function endSession(ulid: string): Promise<void> {
  await apiClient.post(`/sessions/${ulid}/end`);
}

export async function skipCurrentQuestion(ulid: string): Promise<GameSession> {
  const { data } = await apiClient.post(`/sessions/${ulid}/skip-current`);
  const parsed = sessionResponseSchema.parse(data);
  return mapRawGameSession(parsed.session);
}
