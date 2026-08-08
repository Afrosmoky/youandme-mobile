import { createAsyncStorage } from '@react-native-async-storage/async-storage';

// The app's plain key-value store, kept behind a seam.
//
// P10 needs somewhere to keep the local game between launches. The canon first
// said MMKV; the cross-check found it is not in this project, while
// @react-native-async-storage/async-storage is — and already resolved in
// ios/Podfile.lock (3.1.1), so it costs no native work and carries no build risk
// of the #8883 kind. A game state is a few kilobytes written between cards,
// nowhere near the load that would pay for swapping the dependency.
//
// Everything storage-shaped goes through this module so that swap, if it ever
// does pay for itself, is one file. The async signature is the part that
// matters: MMKV is synchronous, so callers written against a Promise keep
// working, while callers written against a sync API would every one have to
// change.
//
// Not for secrets. The Sanctum token stays in the keychain (src/auth/storage.ts)
// — this store is neither encrypted nor meant to be.
//
// A named database rather than the package's default export, which v3 keeps only
// as a migration path off v2 (getLegacyStorage). Nothing here predates v3.
const storage = createAsyncStorage('jaity');

export const kv = {
  get(key: string): Promise<string | null> {
    return storage.getItem(key);
  },
  set(key: string, value: string): Promise<void> {
    return storage.setItem(key, value);
  },
  remove(key: string): Promise<void> {
    return storage.removeItem(key);
  },
};
