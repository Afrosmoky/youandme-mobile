import {renderHook, waitFor} from '@testing-library/react-native';
import notifee from '@notifee/react-native';
import {useLocalPushSchedule} from './useLocalPushSchedule';

describe('useLocalPushSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('schedules the streak warning when the card is unanswered', async () => {
    renderHook(() =>
      useLocalPushSchedule({
        dailyPushHour: 20,
        answeredToday: false,
        enabled: true,
      }),
    );

    await waitFor(() =>
      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({id: 'streak-warning'}),
        expect.anything(),
      ),
    );
    expect(notifee.cancelNotification).not.toHaveBeenCalledWith('streak-warning');
  });

  test('schedules the weekly ritual reminder', async () => {
    renderHook(() =>
      useLocalPushSchedule({
        dailyPushHour: 20,
        answeredToday: false,
        enabled: true,
      }),
    );

    await waitFor(() =>
      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({id: 'weekly-ritual-reminder'}),
        expect.anything(),
      ),
    );
  });

  test('cancels the streak warning when the card is answered', async () => {
    renderHook(() =>
      useLocalPushSchedule({
        dailyPushHour: 20,
        answeredToday: true,
        enabled: true,
      }),
    );

    await waitFor(() =>
      expect(notifee.cancelNotification).toHaveBeenCalledWith('streak-warning'),
    );
  });

  // Sign-out cancels every notification (AuthContext). What brings them back
  // is the next sign-in mounting HomeScreen again, i.e. a fresh hook.
  test('a fresh mount after sign-out plans the reminders again', async () => {
    const args = {dailyPushHour: 20, answeredToday: false, enabled: true};
    const first = renderHook(() => useLocalPushSchedule(args));
    await waitFor(() =>
      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({id: 'daily-card-reminder'}),
        expect.anything(),
      ),
    );
    first.unmount();
    jest.clearAllMocks();

    renderHook(() => useLocalPushSchedule(args));

    await waitFor(() =>
      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({id: 'daily-card-reminder'}),
        expect.anything(),
      ),
    );
  });

  test('does nothing while disabled', async () => {
    renderHook(() =>
      useLocalPushSchedule({
        dailyPushHour: 20,
        answeredToday: false,
        enabled: false,
      }),
    );

    await Promise.resolve();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    expect(notifee.requestPermission).not.toHaveBeenCalled();
  });
});
