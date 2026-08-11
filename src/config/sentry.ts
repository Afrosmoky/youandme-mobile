// Crash reporting configuration (P11 S4). Plain constants next to the other
// build-time config, not environment variables: none of this is a secret and
// none of it changes per install.

/**
 * Ingest endpoint for this project.
 *
 * A DSN is a public, client-embeddable identifier — it only grants the right to
 * SEND events, never to read them, so it belongs in the bundle rather than in
 * an env file. The secret in the Sentry setup is the CLI auth token used to
 * upload source maps at build time; that one lives in the SENTRY_AUTH_TOKEN
 * environment variable and never in this repo.
 *
 * The `.de.` in the host is the EU region. The SDK parses the region out of the
 * DSN itself, so there is nothing else to configure for data residency.
 */
export const SENTRY_DSN =
  'https://d46f7da88903025a01aa6c18fc767dd2@o4511888708141056.ingest.de.sentry.io/4511888716136528';

/**
 * Whether the SDK actually sends anything.
 *
 * Off in development on purpose: a crash from a Metro reload is not a signal we
 * want, and it would eat the project's event quota that beta and production
 * builds need. `Sentry.init` still runs in dev — the wiring, the scrubbers and
 * the wrap all execute, they just never reach the network — so a mistake in the
 * setup still shows up locally instead of hiding until release.
 *
 * To smoke-test event delivery from a dev build, flip this to `true`
 * temporarily, send one event, confirm it arrived, and flip it back.
 */
export const SENTRY_ENABLED = !__DEV__;

/**
 * Share of transactions kept for performance monitoring.
 *
 * Low by design: we want crashes, and tracing is a by-product we are not paying
 * quota for. Errors are not affected by this rate — they are always sent.
 */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/**
 * Which bucket events land in in the Sentry UI.
 *
 * Only two values: this build either came off a developer machine or it did
 * not. Beta and production share `production` deliberately — they are the same
 * code path, and the release string (bundle id + version + build number, which
 * the SDK reads from the native layer) already tells them apart. Nothing here
 * is hardcoded from the app version: a constant would drift from
 * build.gradle/pbxproj on the first version bump, and a release string that
 * disagrees with the one sentry-cli stamps at upload time is exactly what makes
 * source maps fail to apply.
 */
export const SENTRY_ENVIRONMENT = __DEV__ ? 'dev' : 'production';
