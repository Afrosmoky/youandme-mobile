const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

// P11: stamps a Debug ID into the bundle and its source map, which is how
// Sentry matches a minified stack to the sources uploaded at build time — no
// dependency on the release string matching. Defaults are left alone on
// purpose: `annotateReactComponents` (off) would run a Babel transformer that
// injects component/element/file props, and its label injection is another
// route for on-screen text to reach a breadcrumb.
module.exports = withSentryConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
