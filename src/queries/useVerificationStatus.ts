import { useQuery } from '@tanstack/react-query';
import { fetchVerificationStatus } from '../api/profile';
import { queryKeys } from './queryKeys';

// Wraps the email verification status. staleTime 0 (overriding the global 30s):
// the status changes outside the app — the user verifies via a link in their
// email — so it must be refetched on every mount to stay truthful, matching the
// pre-TanStack behaviour of fetching fresh each time the Profile screen opens.
export function useVerificationStatus() {
  return useQuery({
    queryKey: queryKeys.verificationStatus,
    queryFn: () => fetchVerificationStatus(),
    staleTime: 0,
  });
}
