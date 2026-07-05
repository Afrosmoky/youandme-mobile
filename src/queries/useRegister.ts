import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { RegisterInput } from '../api/auth';

// Wraps AuthContext.register in a mutation for isPending + onError. register
// stays in AuthContext (it calls the API and applies the token/user/couple);
// this hook only adds TanStack's async state. The screen supplies onError per
// mutate(). No invalidateQueries (auth touches no query cache — see useLogin).
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useRegister() {
  const { register } = useAuth();
  return useMutation({ mutationFn: (input: RegisterInput) => register(input) });
}
