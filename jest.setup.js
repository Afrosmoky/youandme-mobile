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
