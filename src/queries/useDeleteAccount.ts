import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { runAccountDeletion } from '../auth/accountDeletion';
import { revokeGoogleAccess } from '../auth/googleSignIn';
import { pl } from '../i18n/pl';

function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/**
 * Deletes the account, then ends the session on this device.
 *
 * Both endings live here rather than in the screen, against the usual split:
 * each one signs out, which unmounts ProfileScreen, and callbacks passed to
 * mutate() do not fire on an unmounted component. The screen keeps the
 * failures that leave the couple signed in.
 *
 * 204: Google access is revoked best-effort for a Google-linked account, the
 * same local cleanup as logout runs (no POST /auth/logout, the token is
 * already gone), and the couple is told on the sign-in screen.
 *
 * 401: the token no longer works, so staying "signed in" would only make every
 * screen fail. The session ends the same way, without claiming a deletion.
 */
export function useDeleteAccount() {
  const { signOutLocally } = useAuth();
  return useMutation({
    mutationFn: () => runAccountDeletion(),
    onSuccess: async ({ googleLinked }) => {
      if (googleLinked) {
        await revokeGoogleAccess();
      }
      await signOutLocally();
      Alert.alert(pl.appTitle, pl.profile.accountDeleted);
    },
    onError: async err => {
      if (isUnauthorized(err)) {
        await signOutLocally();
        Alert.alert(pl.appTitle, pl.profile.deleteAccountSessionExpired);
      }
    },
  });
}
