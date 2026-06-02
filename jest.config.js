// Reuse the React Native preset (handles transformIgnorePatterns for the RN
// ecosystem and the RN test environment) and append our own setup. Spreading
// the preset rather than using `preset:` lets us extend its setup arrays
// instead of clobbering them. jest.setup.js runs in setupFilesAfterEnv (not
// setupFiles) because it extends `expect` via jest-native, and `expect` only
// exists after the test framework is installed.
const reactNativePreset = require('@react-native/jest-preset');

module.exports = {
  ...reactNativePreset,
  setupFilesAfterEnv: [
    ...(reactNativePreset.setupFilesAfterEnv || []),
    '<rootDir>/jest.setup.js',
  ],
};
