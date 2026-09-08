module.exports = {
  dependencies: {
    // Sign in with Apple is offered on iOS only: Apple's rule is an App Store
    // rule, and Google alone is fine on Play. The library ships an Android
    // module too — a web flow needing a Services ID and a return domain — which
    // we deliberately do not use, so autolinking it would put a package into
    // every Android build that nothing will ever call.
    //
    // Safe to cut, and checked rather than assumed: the library reads both
    // native modules defensively at import (`if (this.native)` in
    // AppleAuthModule, and `RNAppleAuthModuleAndroid ? {...} : {}` in its
    // index), and AppleButton resolves to a pure-JS component on Android —
    // bundling the library for Android produces no reference to a native Apple
    // component at all. So the import stays harmless with the native side gone.
    '@invertase/react-native-apple-authentication': {
      platforms: { android: null },
    },
  },
  // Bundled fonts (Belleza + Alegreya, OFL). `npx react-native-asset` links
  // these into iOS (Info.plist UIAppFonts + Xcode Resources) and Android
  // (android/app/src/main/assets/fonts).
  assets: ['./assets/fonts'],
};
