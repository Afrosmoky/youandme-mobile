import { useMutation } from '@tanstack/react-query';
import { updateMe, UpdateMeInput } from '../api/profile';

// Wraps PATCH /me. Generic: the screen supplies onSuccess/onError per mutate()
// call (it pushes the fresh user/couple into AuthContext itself). No cache to
// invalidate — /me is not a query yet (user/couple live in AuthContext).
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useUpdateMe() {
  return useMutation({ mutationFn: (input: UpdateMeInput) => updateMe(input) });
}
