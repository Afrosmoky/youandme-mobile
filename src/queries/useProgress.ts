import { useQuery } from '@tanstack/react-query';
import { getProgress } from '../api/progress';
import { queryKeys } from './queryKeys';

// The couple's progress map.
//
// Keeps the global 30s staleTime and does NOT refetch on focus, unlike
// useRewards. The difference is where the change comes from: the balance can
// grow server-side while the app sits in the background (the SSV webhook pays
// for a watched ad), but progress only moves when a card is played — and a card
// can only be played here, on this device. Both save paths invalidate this key
// themselves, so a focus refetch would just be a request that never brings
// anything new.
export function useProgress() {
  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => getProgress(),
  });
}
