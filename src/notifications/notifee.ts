import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import { AppState } from 'react-native';
import { pl } from '../i18n/pl';

// All notifee interaction lives here so screens stay declarative and the native
// calls are mockable in one place.

const CHANNEL_ID = 'daily-card';
const DAILY_REMINDER_ID = 'daily-card-reminder';
const STREAK_WARNING_ID = 'streak-warning';
// No point warning about a lost streak past this hour, and never after the
// reminder itself — so the warning is capped and skipped for late push hours.
const STREAK_WARNING_MAX_HOUR = 22;

async function ensureChannel(): Promise<string> {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: pl.notifications.channelName,
    importance: AndroidImportance.HIGH,
  });
}

// Next timestamp (ms) for a local hour today, or tomorrow if it already passed.
// Always in the future, so notifee never rejects a past trigger.
function nextAt(hour: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export async function requestNotificationPermission(): Promise<void> {
  await notifee.requestPermission();
}

// Daily "answer your card" reminder at the couple's push hour, repeating.
export async function scheduleDailyReminder(hour: number): Promise<void> {
  const channelId = await ensureChannel();
  await notifee.createTriggerNotification(
    {
      id: DAILY_REMINDER_ID,
      title: pl.notifications.dailyReminderTitle,
      body: pl.notifications.dailyReminderBody,
      android: { channelId },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: nextAt(hour),
      repeatFrequency: RepeatFrequency.DAILY,
    },
  );
}

// Evening "don't lose your streak" warning. warningHour = min(pushHour + 2, 22);
// skipped entirely when pushHour is already late (>= 22).
export async function scheduleStreakWarning(dailyPushHour: number): Promise<void> {
  if (dailyPushHour >= STREAK_WARNING_MAX_HOUR) {
    return;
  }
  const warningHour = Math.min(dailyPushHour + 2, STREAK_WARNING_MAX_HOUR);
  const channelId = await ensureChannel();
  await notifee.createTriggerNotification(
    {
      id: STREAK_WARNING_ID,
      title: pl.notifications.streakWarningTitle,
      body: pl.notifications.streakWarningBody,
      android: { channelId },
    },
    { type: TriggerType.TIMESTAMP, timestamp: nextAt(warningHour) },
  );
}

export async function cancelStreakWarning(): Promise<void> {
  await notifee.cancelNotification(STREAK_WARNING_ID);
}

// Milestone push only when the app is NOT in the foreground — otherwise the
// in-app celebration modal already covers it (no duplicate notification).
export async function notifyStreakMilestone(streak: number): Promise<void> {
  if (AppState.currentState === 'active') {
    return;
  }
  const channelId = await ensureChannel();
  await notifee.displayNotification({
    title: pl.notifications.milestoneTitle,
    body: pl.notifications.milestoneBody(streak),
    android: { channelId },
  });
}
