/* eslint-env jest */
// Extra jest matchers for React Native (toBeOnTheScreen, toHaveTextContent,
// toBeVisible, ...). Must load before the test files run.
import '@testing-library/jest-native/extend-expect';

// Native-module mocks shared by all tests. Runs after the RN preset's own
// setup (see jest.config.js).

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
}));

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
