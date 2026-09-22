// Fresh module registry per test: the once-per-process flag lives in module
// state, so each test gets its own.
describe('ensureGoogleConfigured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('configures the SDK with both client IDs', () => {
    const {
      ensureGoogleConfigured,
      GOOGLE_IOS_CLIENT_ID,
      GOOGLE_WEB_CLIENT_ID,
    } = require('./googleSignIn');

    ensureGoogleConfigured();

    const { GoogleSignin: fresh } = require('@react-native-google-signin/google-signin');
    expect(fresh.configure).toHaveBeenCalledWith({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
  });

  test('configures only once per process', () => {
    const { ensureGoogleConfigured } = require('./googleSignIn');

    ensureGoogleConfigured();
    ensureGoogleConfigured();

    const { GoogleSignin: fresh } = require('@react-native-google-signin/google-signin');
    expect(fresh.configure).toHaveBeenCalledTimes(1);
  });
});
