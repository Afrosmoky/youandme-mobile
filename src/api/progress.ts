import { apiClient } from './client';
import { Progress, mapRawProgress, rawProgressSchema } from '../domain/types';

// GET /progress — the couple's journey: how many cards they have played, which
// milestones that has unlocked, and what the next one costs.
//
// Purely a read. Milestones are unlocked server-side by a listener on the
// "memory created" event, never by this call, so opening the map cannot move
// the couple's progress — the client only ever observes it.
export async function getProgress(): Promise<Progress> {
  const res = await apiClient.get('/progress');
  return mapRawProgress(rawProgressSchema.parse(res.data));
}
