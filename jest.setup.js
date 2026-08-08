/* eslint-env jest */
// Extra jest matchers for React Native (toBeOnTheScreen, toHaveTextContent,
// toBeVisible, ...). Must load before the test files run.
import '@testing-library/jest-native/extend-expect';

// Native-module mocks shared by all tests. Runs after the RN preset's own
// setup (see jest.config.js).

// @react-native-async-storage/async-storage: the plain key-value store behind
// src/storage/kv.ts (P10 keeps the local game there). The package ships its own
// in-memory mock, but it is ESM under a scope the RN preset's
// transformIgnorePatterns does not transform (`@react-native(-community)?` does
// not cover `@react-native-async-storage`), so it cannot be required from here.
// This reproduces it: one store per database name, same three methods kv.ts
// uses. State lives for the module registry's lifetime, so a suite that writes
// clears up after itself (see src/storage/localGameState.test.ts).
jest.mock('@react-native-async-storage/async-storage', () => {
  const databases = new Map();
  const createAsyncStorage = name => {
    if (!databases.has(name)) {
      const store = new Map();
      databases.set(name, {
        getItem: async key => (store.has(key) ? store.get(key) : null),
        setItem: async (key, value) => {
          store.set(key, value);
        },
        removeItem: async key => {
          store.delete(key);
        },
        clear: async () => {
          store.clear();
        },
      });
    }
    return databases.get(name);
  };
  return {
    __esModule: true,
    createAsyncStorage,
    default: createAsyncStorage('legacy'),
  };
});

// react-native-keychain: token persistence. No native keychain under Jest.
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(false)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

// @react-native-google-signin: native module. Default to a successful sign-in
// returning a fake idToken; tests override per case.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({ type: 'success', data: { idToken: 'mock-id-token' } }),
    ),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: jest.fn(() => false),
}));

// @react-navigation/native: screens under test receive `navigation` via props,
// but mock the hooks too so anything reaching for them gets a no-op.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn() }),
  useRoute: () => ({ params: {} }),
  // P9: src/navigation/navigationRef.ts creates a container ref at module
  // scope, so this has to exist for any test that imports it (directly or
  // through the push handler). Reports "not ready" by default — the state that
  // makes a pressed notification wait for Bootstrap; tests spy on the methods.
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: () => {},
    getRootState: () => undefined,
  }),
}));

// @notifee/react-native: native module. Default to resolved no-ops; tests that
// assert scheduling read the mocked default's calls.
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(() => Promise.resolve({})),
    createChannel: jest.fn(() => Promise.resolve('daily-card')),
    createTriggerNotification: jest.fn(() => Promise.resolve()),
    cancelNotification: jest.fn(() => Promise.resolve()),
    displayNotification: jest.fn(() => Promise.resolve()),
    // P9: push wiring registers these at startup and on a press.
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  },
  AndroidImportance: { HIGH: 4 },
  RepeatFrequency: { DAILY: 1, WEEKLY: 2 },
  TriggerType: { TIMESTAMP: 0 },
  EventType: { DISMISSED: 0, PRESS: 1, DELIVERED: 3 },
}));

// @react-native-firebase/messaging: native module (P9). Modular API surface
// only — that is what src/notifications/pushToken.ts uses. getToken resolves by
// default; tests that need the iOS "no APNs" path make it reject.
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  requestPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('fcm-token')),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

// react-native-store-review: native TurboModule wrapping SKStoreReviewController
// / AppStore.requestReview (iOS) and the Play In-App Review API (Android).
// Default to a no-op; tests that assert the prompt read the mocked calls.
jest.mock('react-native-store-review', () => ({
  requestReview: jest.fn(),
}));

// react-native-google-mobile-ads: native AdMob SDK. `createForAdRequest`
// returns a controllable fake — src/ads/rewardedAd.test.ts drives its event
// listeners to simulate reward / dismissal / no-fill.
jest.mock('react-native-google-mobile-ads', () => {
  const AdEventType = {
    LOADED: 'loaded',
    OPENED: 'opened',
    CLOSED: 'closed',
    ERROR: 'error',
    CLICKED: 'clicked',
    PAID: 'paid',
  };
  const RewardedAdEventType = {
    LOADED: 'rewarded_loaded',
    EARNED_REWARD: 'rewarded_earned_reward',
  };
  return {
    __esModule: true,
    default: jest.fn(() => ({
      initialize: jest.fn(() => Promise.resolve([])),
    })),
    AdEventType,
    RewardedAdEventType,
    TestIds: { REWARDED: 'test-rewarded-unit' },
    RewardedAd: {
      createForAdRequest: jest.fn(() => ({
        load: jest.fn(),
        show: jest.fn(() => Promise.resolve()),
        addAdEventListener: jest.fn(() => jest.fn()),
      })),
    },
  };
});

// axios: AuthScreen reads `axios.isAxiosError`, and api/client.ts calls
// `axios.create`. Tests override isAxiosError per case.
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    isAxiosError: jest.fn(() => false),
  };
  return { __esModule: true, default: mockAxios, ...mockAxios };
});
