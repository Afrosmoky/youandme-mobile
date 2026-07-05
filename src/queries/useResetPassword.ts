import { useMutation } from '@tanstack/react-query';
import { resetPassword, ResetPasswordInput } from '../api/passwordReset';

// Wraps the password reset (token + new password). Generic: the screen supplies
// its own onSuccess/onError per call to mutate(). No cache to invalidate.
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}
