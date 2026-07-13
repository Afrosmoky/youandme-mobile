import { useQuery } from '@tanstack/react-query';
import { getWeeklyRitual } from '../api/rituals';
import { queryKeys } from './queryKeys';

// Wraps the weekly ritual. The inverse of the daily card: the ritual changes
// once a week, so a long staleTime is fine — but keep refetchOnWindowFocus so
// dayOfWeek refreshes when the app returns after midnight (focusManager is
// wired in App.tsx). This query invalidates nothing and nothing invalidates it.
export function useWeeklyRitual() {
  return useQuery({
    queryKey: queryKeys.weeklyRitual,
    queryFn: () => getWeeklyRitual(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: 'always',
  });
}
