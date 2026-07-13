import { useQuery } from '@tanstack/react-query';
import { getDailyCard } from '../api/dailyCard';
import { queryKeys } from './queryKeys';

// Wraps the daily card. staleTime 0 (overriding the global 30s): the card rolls
// over at midnight, so an app left open overnight must refetch on mount/focus —
// otherwise it shows yesterday's card and the answer would 409. The backend
// guard stays the second line of defence.
export function useDailyCard() {
  return useQuery({
    queryKey: queryKeys.dailyCard,
    queryFn: () => getDailyCard(),
    staleTime: 0,
    // Overrides the global refetchOnWindowFocus:false so the card refreshes when
    // the app returns from background (see focusManager wiring in App.tsx).
    refetchOnWindowFocus: 'always',
  });
}
