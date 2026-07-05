import { useMutation } from '@tanstack/react-query';
import { changePassword, ChangePasswordInput } from '../api/profile';

// Wraps POST /me/change-password. Generic: the screen supplies onSuccess/onError
// per mutate() call. No cache to invalidate.
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}
