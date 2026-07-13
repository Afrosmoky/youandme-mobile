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
