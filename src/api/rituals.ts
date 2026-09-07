import axios from 'axios';
import { z } from 'zod';
import { apiClient } from './client';
import {
  rawWeeklyRitualSchema,
  mapRawWeeklyRitual,
  WeeklyRitual,
} from '../domain/types';

// GET /weekly-ritual — the couple's ritual of the week + day counter. A couple
// with no assignment yet is assigned lazily server-side on first read. A 404
// only happens with an empty ritual seed (pathology) — callers treat it as an
// empty state, not a loud error.
export async function getWeeklyRitual(): Promise<WeeklyRitual> {
  const res = await apiClient.get('/weekly-ritual');
  return mapRawWeeklyRitual(rawWeeklyRitualSchema.parse(res.data));
}

const completionResponseSchema = z.object({ completed: z.boolean() });

/**
 * "We did it" (PUT) and taking it back (DELETE), on /weekly-ritual/completed.
 *
 * Two idempotent verbs stating a destination rather than one endpoint flipping a
 * flag — the P5 likes shape, as applied to memory favourites in P9. A retried
 * request therefore cannot silently undo what the first one did.
 *
 * Neither verb carries an identifier, in the path or the body: the couple comes
 * from the token and the week from the server's own clock. There is nothing here
 * to spoof and nothing for the client to get wrong.
 *
 * 404 is a CONTRACT, not a failure: it means the ritual the client is holding is
 * no longer the current one, which happens when the app sits open across a week
 * boundary. The caller re-reads GET /weekly-ritual and shows the new ritual
 * rather than surfacing an error — see useSetRitualCompleted.
 */
export async function setWeeklyRitualCompleted(
  completed: boolean,
): Promise<boolean> {
  const res = completed
    ? await apiClient.put('/weekly-ritual/completed')
    : await apiClient.delete('/weekly-ritual/completed');
  return completionResponseSchema.parse(res.data).completed;
}

/**
 * Whether a failed completion means "the week has moved on" rather than
 * "something went wrong".
 *
 * The server has no assignment for the week the client is holding, which happens
 * when the app sits open across midnight into a new week. The couple did nothing
 * wrong and nothing is broken, so this must not reach them as an error — it is
 * answered by re-reading the ritual.
 *
 * Lives here, next to the endpoint whose contract it is, rather than in the
 * mutation: the meaning of that 404 belongs to the API, and the screen only has
 * to ask whether it applies.
 */
export function isRitualWeekRolledOver(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}
