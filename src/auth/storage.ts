import * as Keychain from 'react-native-keychain';

// The Sanctum token is a secret, so it lives in the keychain (not AsyncStorage).
const SERVICE = 'youandme-api-token';
// setGenericPassword requires a username; the token is the password.
const ACCOUNT = 'token';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT, token, { service: SERVICE });
}

export async function loadToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({ service: SERVICE });
  return credentials ? credentials.password : null;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
