import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { LoginInput } from '../api/auth';

// Wraps AuthContext.login in a mutation for isPending + onError. login stays in
// AuthContext (it calls the API and applies the token/user/couple); this hook
// only adds TanStack's async state. The screen supplies onError per mutate().
//
// No invalidateQueries: auth sets the token/context and RootNavigator swaps the
// stack via the token gate; it touches no query cache.
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useLogin() {
  const { login } = useAuth();
  return useMutation({ mutationFn: (input: LoginInput) => login(input) });
}
