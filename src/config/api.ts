import { Platform } from 'react-native';

/**
 * Where a shipped build talks to.
 *
 * Beta and production share it: they are the same code against the same
 * backend, and what tells them apart is the build number the release carries
 * (see the release/dist note in src/config/sentry.ts), not a different host.
 */
export const PRODUCTION_API_URL = 'https://jaity.app/api/v1';

/**
 * Where a development build talks to: the machine running Metro.
 *
 * The two platforms reach the host differently — an iOS simulator shares the
 * host's loopback, while the Android emulator maps the host to 10.0.2.2 — so
 * this is the one thing that genuinely differs per platform. Metro folds the
 * branch away at bundle time, leaving each platform's bundle with its own
 * literal.
 */
export function developmentApiUrl(platform: typeof Platform.OS): string {
  return platform === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';
}

/**
 * The API base URL for this build.
 *
 * Keyed on `__DEV__` rather than on an environment file, and that is the whole
 * point: `__DEV__` IS the build type. The bundler sets it — true for a debug
 * bundle, false for a release one, on both platforms, with nothing to
 * configure and nothing to remember. A release build with `__DEV__ === true`
 * cannot be produced.
 *
 * The alternative, .env files selected by an npm script, only holds while
 * everyone uses the script. A TestFlight archive is made from Xcode's
 * Product > Archive and a signed bundle from Android Studio; both skip npm
 * entirely and would quietly take whichever env file was the default. That is
 * the same class of oversight as a forgotten shell variable, moved from a
 * variable name to a command name.
 *
 * Consequence, accepted: pointing a DEVELOPMENT build at a staging backend
 * means editing PRODUCTION_API_URL or the line below, the same way
 * AD_REWARD_ENABLED is edited. It is a rare, local thing to want.
 *
 * Taken as a function of its inputs so a test can ask the question that
 * matters — "can a shipped build point at a laptop?" — instead of trusting
 * that nobody forgot. See api.test.ts.
 */
export function apiBaseUrl(
  isDev: boolean,
  platform: typeof Platform.OS,
): string {
  return isDev ? developmentApiUrl(platform) : PRODUCTION_API_URL;
}

export const API_BASE_URL = apiBaseUrl(__DEV__, Platform.OS);
