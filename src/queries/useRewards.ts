import { useQuery } from '@tanstack/react-query';
import { getRewards } from '../api/rewards';
import { queryKeys } from './queryKeys';

// The credit balance. Unlike the deck, the balance can grow WITHOUT this client
// doing anything: from P7 the ad reward is granted server-side by the SSV
// webhook, which may land while the app sits in the background. So the balance
// refetches on focus.
//
// `refetchOnWindowFocus: 'always'` has to be set explicitly — the app-wide
// default in queryClient.ts is `false`, so inheriting it would leave the
// focusManager wiring in App.tsx doing nothing here (the P4 lesson: the
// AppState bridge only matters for queries that opt in).
export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards,
    queryFn: () => getRewards(),
    refetchOnWindowFocus: 'always',
  });
}
