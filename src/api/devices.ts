import { apiClient } from './client';

// Which store the token came from. The backend validates the value (in:
// android,ios) and the anniversary cron currently sends to android tokens only,
// so this has to be the truth about the device rather than a convenient
// constant — mislabelling an iOS token as android would make it a silent
// delivery failure the day APNs is switched on (T11).
export type DevicePlatform = 'android' | 'ios';

// POST /device-tokens — "push me here". Exists since P7 Slice 4; P9 is the first
// caller. Answers 204, so there is nothing to map back.
export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await apiClient.post('/device-tokens', { token, platform });
}
