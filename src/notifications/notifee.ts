import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import { AppState } from 'react-native';
import { colorSchemes } from '../theme';
import { pl } from '../i18n/pl';

// All notifee interaction lives here so screens stay declarative and the native
// calls are mockable in one place.

// Android options every notification we draw must carry, spread into each
// `android` block below.
//
// `smallIcon` is the load-bearing one. Android flattens the status-bar icon to
// a silhouette using only its alpha channel, so without an explicit monochrome
// drawable it takes the launcher icon — and our gold heart on near-black
// becomes a solid white square. `ic_notification` is that silhouette: the heart
// in white on transparency, shipped at five densities.
//
// `color` is the tint Android then applies to it, so the silhouette reads as
// our gold rather than system grey. It comes from the same token the app uses,
// so the notification cannot drift from the UI; the manifest's FCM fallback
// carries a copy in colors.xml, which a test keeps in step.
const ANDROID_DEFAULTS = {
  smallIcon: 'ic_notification',
  color: colorSchemes.dark.gold.primary,
} as const;

const CHANNEL_ID = 'daily-card';
// Progress-map milestones get their own Android channel. The daily-card channel
// carries a nudge that arrives every single day, and a couple who mutes it must
// not also lose the handful of "you unlocked something" messages a whole MVP
// has to offer — on Android muting is per channel, so the split is the only way
// to keep those separable.
const PROGRESS_CHANNEL_ID = 'progress-milestones';
// Server-sent pushes (P9) get channels of their own too, for the same reason as
// the milestones one: on Android muting is per channel, and a couple tired of
// anniversary reminders must be able to switch those off without also losing
// the message that says their credit arrived.
const PUSH_CHANNELS = {
  memories: { id: 'memories', name: pl.notifications.memoriesChannelName },
  rewards: { id: 'rewards', name: pl.notifications.rewardsChannelName },
} as const;

export type PushChannel = keyof typeof PUSH_CHANNELS;

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

async function ensureProgressChannel(): Promise<string> {
  return notifee.createChannel({
    id: PROGRESS_CHANNEL_ID,
    name: pl.notifications.progressChannelName,
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
      android: { channelId, ...ANDROID_DEFAULTS },
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
      android: { channelId, ...ANDROID_DEFAULTS },
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
      android: { channelId, ...ANDROID_DEFAULTS },
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
    android: { channelId, ...ANDROID_DEFAULTS },
  });
}

// Renders a notification the SERVER sent (P9). FCM delivers our pushes
// data-only, so nothing appears on the phone unless we draw it — this is that
// step, for the foreground and background handlers alike.
//
// The data rides along on the notification so a press can be routed by the same
// payload that produced it; pressAction is what makes Android open the app at
// all when the notification is tapped.
export async function displayServerPush(
  channel: PushChannel,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const channelId = await notifee.createChannel({
    id: PUSH_CHANNELS[channel].id,
    name: PUSH_CHANNELS[channel].name,
    importance: AndroidImportance.HIGH,
  });
  await notifee.displayNotification({
    title,
    body,
    data,
    android: { channelId, pressAction: { id: 'default' }, ...ANDROID_DEFAULTS },
  });
}

// A milestone unlocked on the progress map (P8). Same shape as the streak one:
// silent on the foreground, where the Celebration modal is already saying it,
// and named after the milestone rather than counting anything — the front never
// decides what was unlocked, it only repeats what GET /progress reported.
export async function notifyProgressMilestone(name: string): Promise<void> {
  if (AppState.currentState === 'active') {
    return;
  }
  const channelId = await ensureProgressChannel();
  await notifee.displayNotification({
    title: pl.notifications.progressMilestoneTitle,
    body: pl.notifications.progressMilestoneBody(name),
    android: { channelId, ...ANDROID_DEFAULTS },
  });
}
