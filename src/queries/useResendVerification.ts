import { useMutation } from '@tanstack/react-query';
import { resendVerificationEmail } from '../api/profile';

// Wraps POST /auth/email/verify-notification. Generic: the screen supplies
// onSuccess/onError per mutate() call. No invalidateQueries: resending an email
// does not change the verification status (the user is still unverified until
// they click the link), so verificationStatus stays as-is.
export function useResendVerification() {
  return useMutation({ mutationFn: () => resendVerificationEmail() });
}
