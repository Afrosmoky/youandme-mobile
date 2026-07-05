import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset } from '../api/passwordReset';

// Wraps the "forgot password" request. Generic: the screen supplies its own
// onSuccess/onError per call to mutate(), so UX (navigation, alerts, field
// errors) stays in the screen. No cache to invalidate — a reset request
// touches no query.
//
// mutationFn maps variables explicitly rather than passing `requestPasswordReset`
// by reference: TanStack calls mutationFn(variables, context), and forwarding
// that context object into the transport layer is leaky.
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: (email: string) => requestPasswordReset(email) });
}
