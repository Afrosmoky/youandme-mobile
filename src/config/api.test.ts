import { PRODUCTION_API_URL, apiBaseUrl, developmentApiUrl } from './api';

const PLATFORMS = ['ios', 'android'] as const;

// The question this file exists to answer: can a build we hand to someone point
// at a laptop? Before this config that was not a hypothetical - the release
// bundles had localhost and 10.0.2.2 compiled into them, because the env
// override they were supposed to use never resolved to anything.
describe('api base url', () => {
  describe('a shipped build', () => {
    test.each(PLATFORMS)('never points at a dev machine on %s', platform => {
      const url = apiBaseUrl(false, platform);

      expect(url).not.toContain('localhost');
      expect(url).not.toContain('10.0.2.2');
      expect(url).not.toContain('127.0.0.1');
    });

    test.each(PLATFORMS)('is https and is the production host on %s', platform => {
      expect(apiBaseUrl(false, platform)).toBe(PRODUCTION_API_URL);
      expect(PRODUCTION_API_URL.startsWith('https://')).toBe(true);
    });
  });

  describe('a development build', () => {
    // The one thing that genuinely differs per platform: an iOS simulator
    // shares the host's loopback, the Android emulator maps the host to
    // 10.0.2.2. This has to keep working - it is how the app is developed.
    test('reaches the host through loopback on iOS', () => {
      expect(apiBaseUrl(true, 'ios')).toBe('http://localhost:8000/api/v1');
    });

    test('reaches the host through 10.0.2.2 on Android', () => {
      expect(apiBaseUrl(true, 'android')).toBe('http://10.0.2.2:8000/api/v1');
    });

    test('is the platform default, unchanged from before', () => {
      PLATFORMS.forEach(platform => {
        expect(apiBaseUrl(true, platform)).toBe(developmentApiUrl(platform));
      });
    });
  });

  test('the two environments never agree', () => {
    PLATFORMS.forEach(platform => {
      expect(apiBaseUrl(true, platform)).not.toBe(apiBaseUrl(false, platform));
    });
  });
});
