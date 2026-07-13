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
const RITUAL_REMINDER_ID = 'weekly-ritual-reminder';
// No point warning about a lost streak past this hour, and never after the
// reminder itself — so the warning is capped and skipped for late push hours.
const STREAK_WARNING_MAX_HOUR = 22;
// Fixed local hour for the Sunday ritual reminder — not tied to dailyPushHour
// (that setting is about the daily card, not the ritual).
const RITUAL_REMINDER_HOUR = 19;

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

// Next timestamp (ms) for the coming Sunday at a local hour (today if it is
// Sunday and the hour is still ahead, otherwise the next Sunday).
function nextSundayAt(hour: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  // getDay(): Sunday = 0. Days until the next Sunday.
  let daysUntilSunday = (7 - next.getDay()) % 7;
  if (daysUntilSunday === 0 && next.getTime() <= now.getTime()) {
    daysUntilSunday = 7;
  }
  next.setDate(next.getDate() + daysUntilSunday);
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

// Weekly "check your ritual" reminder, Sunday evening, repeating. Fixed text and
// hour — the backend knows nothing about it; notifee schedules once and the OS
// repeats it weekly.
export async function scheduleWeeklyRitualReminder(): Promise<void> {
  const channelId = await ensureChannel();
  await notifee.createTriggerNotification(
    {
      id: RITUAL_REMINDER_ID,
      title: pl.notifications.ritualReminderTitle,
      body: pl.notifications.ritualReminderBody,
      android: { channelId },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: nextSundayAt(RITUAL_REMINDER_HOUR),
      repeatFrequency: RepeatFrequency.WEEKLY,
    },
  );
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
