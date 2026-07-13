import { useEffect, useRef } from 'react';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleStreakWarning,
  cancelStreakWarning,
} from './notifee';

type Args = {
  dailyPushHour: number;
  answeredToday: boolean;
  // Gate so scheduling waits until the daily card query has resolved.
  enabled: boolean;
};

// One home for the imperative push side-effects, driven by the daily card state.
// Everything the phone needs to know when/whether to notify comes from
// GET /daily-card (push hour + answered state) — the backend sends nothing.
export function useLocalPushSchedule({
  dailyPushHour,
  answeredToday,
  enabled,
}: Args) {
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    (async () => {
      try {
        // Ask once, on first entry to the home screen.
        if (!permissionRequested.current) {
          permissionRequested.current = true;
          await requestNotificationPermission();
        }
        await scheduleDailyReminder(dailyPushHour);
        // The streak warning is the crux: schedule it only while unanswered,
        // cancel it the moment the couple has answered today.
        if (answeredToday) {
          await cancelStreakWarning();
        } else {
          await scheduleStreakWarning(dailyPushHour);
        }
      } catch {
        // Best-effort: a permission denial or notifee failure must not break the
        // screen — the daily card works fine without pushes.
      }
    })();
  }, [enabled, dailyPushHour, answeredToday]);
}
