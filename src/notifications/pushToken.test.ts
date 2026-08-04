import {Platform} from 'react-native';
import {
  AuthorizationStatus,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import {registerForPush, subscribeToTokenRefresh} from './pushToken';
import {registerDeviceToken} from '../api/devices';

jest.mock('../api/devices', () => ({registerDeviceToken: jest.fn()}));

// The RN jest preset reports iOS; these tests are about what the code sends for
// a given platform, so each one states the platform it means.
const originalPlatform = Platform.OS;
afterAll(() => {
  Platform.OS = originalPlatform;
});

describe('registerForPush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    jest.mocked(requestPermission).mockResolvedValue(
      AuthorizationStatus.AUTHORIZED,
    );
    jest.mocked(getToken).mockResolvedValue('fcm-token');
    jest.mocked(registerDeviceToken).mockResolvedValue(undefined);
  });

  test('registers the token under the real platform', async () => {
    await registerForPush();

    expect(registerDeviceToken).toHaveBeenCalledWith('fcm-token', 'android');
  });

  // The backend validates the platform and the anniversary cron sends to
  // android tokens only, so an iOS token labelled android would be a delivery
  // failure nobody could see the day APNs is switched on (T11).
  test('tells the truth about the platform on iOS', async () => {
    Platform.OS = 'ios';

    await registerForPush();

    expect(registerDeviceToken).toHaveBeenCalledWith('fcm-token', 'ios');
  });

  test('registers nothing when notifications are denied', async () => {
    jest.mocked(requestPermission).mockResolvedValue(AuthorizationStatus.DENIED);

    await registerForPush();

    expect(getToken).not.toHaveBeenCalled();
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });

  test('accepts a provisional grant — a quiet notification still arrives', async () => {
    jest
      .mocked(requestPermission)
      .mockResolvedValue(AuthorizationStatus.PROVISIONAL);

    await registerForPush();

    expect(registerDeviceToken).toHaveBeenCalledWith('fcm-token', 'android');
  });

  // iOS before T11: no APNs token, so getToken throws. The app must not care.
  test('stays silent when the token cannot be read', async () => {
    jest.mocked(getToken).mockRejectedValue(new Error('no APNS token'));

    await expect(registerForPush()).resolves.toBeUndefined();
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });

  test('stays silent when the backend refuses the token', async () => {
    jest.mocked(registerDeviceToken).mockRejectedValue({response: {status: 500}});

    await expect(registerForPush()).resolves.toBeUndefined();
  });
});

describe('subscribeToTokenRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  // A rotated token (reinstall, restore, cleared cache) that nobody re-registers
  // is a push that silently goes nowhere.
  test('re-registers the device when FCM rotates the token', () => {
    let rotate: ((token: string) => void) | undefined;
    jest.mocked(onTokenRefresh).mockImplementation((_messaging, listener) => {
      rotate = listener as (token: string) => void;
      return jest.fn();
    });
    jest.mocked(registerDeviceToken).mockResolvedValue(undefined);

    subscribeToTokenRefresh();
    rotate?.('rotated-token');

    expect(registerDeviceToken).toHaveBeenCalledWith('rotated-token', 'android');
  });

  test('returns an unsubscribe even when messaging is unavailable', () => {
    jest.mocked(onTokenRefresh).mockImplementation(() => {
      throw new Error('no messaging');
    });

    expect(() => subscribeToTokenRefresh()()).not.toThrow();
  });
});
