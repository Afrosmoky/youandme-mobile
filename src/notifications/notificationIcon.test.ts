import { readFileSync } from 'fs';
import { join } from 'path';
import notifee from '@notifee/react-native';
import { colorSchemes } from '../theme';
import {
  displayServerPush,
  scheduleDailyReminder,
  scheduleStreakWarning,
  scheduleWeeklyRitualReminder,
} from './notifee';

const RES = join(__dirname, '../../android/app/src/main/res');
const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

// The status bar flattens whatever icon it is handed down to its alpha channel,
// so an app icon used there arrives as a solid white square. These are the
// pieces that stop that happening, and none of them is visible from a unit test
// of the JS — so this file checks the resources exist and agree.

describe('notification icon resources', () => {
  test.each(DENSITIES)('ic_notification exists for %s', density => {
    expect(() =>
      readFileSync(join(RES, `drawable-${density}`, 'ic_notification.png')),
    ).not.toThrow();
  });

  test.each(DENSITIES)(
    'the themed-icon monochrome layer exists for %s',
    density => {
      expect(() =>
        readFileSync(
          join(RES, `mipmap-${density}`, 'ic_launcher_monochrome.png'),
        ),
      ).not.toThrow();
    },
  );

  test.each(['ic_launcher.xml', 'ic_launcher_round.xml'])(
    '%s declares all three adaptive layers',
    file => {
      const xml = readFileSync(
        join(RES, 'mipmap-anydpi-v26', file),
        'utf8',
      );

      expect(xml).toContain('<background');
      expect(xml).toContain('<foreground');
      // Android 13 themed icons: without this the launcher greys out a shrunken
      // copy of the normal icon instead.
      expect(xml).toContain('@mipmap/ic_launcher_monochrome');
    },
  );

  test('the manifest points FCM at the silhouette, not the app icon', () => {
    const manifest = readFileSync(
      join(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );

    expect(manifest).toContain(
      'com.google.firebase.messaging.default_notification_icon',
    );
    expect(manifest).toContain('@drawable/ic_notification');
    expect(manifest).toContain('@color/notification_color');
  });

  // The status bar cannot read our TypeScript tokens, so the tint is written
  // twice: once for notifee (from the token) and once in colors.xml for the FCM
  // fallback. This is what stops the two from drifting.
  test.each([
    ['the daily reminder', () => scheduleDailyReminder(20)],
    ['the streak warning', () => scheduleStreakWarning(20)],
    ['the weekly ritual reminder', () => scheduleWeeklyRitualReminder()],
  ])('%s asks for the silhouette, not the app icon', async (_name, run) => {
    jest.clearAllMocks();

    await run();

    const [notification] = jest.mocked(notifee.createTriggerNotification).mock
      .calls[0];
    expect(notification.android?.smallIcon).toBe('ic_notification');
    expect(notification.android?.color).toBe(colorSchemes.dark.gold.primary);
  });

  test('a server push asks for it too, and keeps its press action', async () => {
    jest.clearAllMocks();

    await displayServerPush('memories', 'Rocznica', 'Rok temu…', {
      type: 'memory_anniversary',
    });

    const [notification] = jest.mocked(notifee.displayNotification).mock
      .calls[0];
    expect(notification.android?.smallIcon).toBe('ic_notification');
    // The spread must not clobber what the callsite set.
    expect(notification.android?.pressAction).toEqual({ id: 'default' });
  });

  test('the XML notification tint equals the gold token', () => {
    const colors = readFileSync(join(RES, 'values', 'colors.xml'), 'utf8');
    const match = colors.match(
      /<color name="notification_color">(#[0-9a-fA-F]{6})<\/color>/,
    );

    expect(match).not.toBeNull();
    expect(match?.[1].toLowerCase()).toBe(
      colorSchemes.dark.gold.primary.toLowerCase(),
    );
  });
});
