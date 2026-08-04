import { PushChannel, displayServerPush } from './notifee';
import { PushPayload, parsePushPayload } from './pushPayload';
import { openMemoryCard } from '../navigation/navigationRef';
import { queryClient } from '../queries/queryClient';
import { queryKeys } from '../queries/queryKeys';

// What a server push does once it reaches the phone. Shared by the foreground
// listener and the background handler, because the work is the same either way —
// only the process it runs in differs.

const CHANNEL_BY_TYPE: Record<PushPayload['type'], PushChannel> = {
  memory_anniversary: 'memories',
  ad_reward_granted: 'rewards',
};

// Handles one FCM data message: acts on it, then shows it.
//
// The cache write uses the queryClient singleton rather than useQueryClient() —
// the deliberate exception to the R1m rule, because a message handler is not a
// component and has no provider above it. In the foreground this is what makes
// the balance correct without waiting for a focus refetch; in the background it
// is a no-op that costs nothing (the headless process keeps no cache), and the
// notification is what actually reaches the couple there.
export async function handlePushMessage(message: unknown): Promise<void> {
  const data = (message as { data?: unknown } | null | undefined)?.data;
  const payload = parsePushPayload(data);
  if (!payload) {
    return;
  }

  if (payload.type === 'ad_reward_granted') {
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
  }

  // Nothing to draw without copy — see pushPayload.ts for why it is optional.
  if (payload.title && payload.body) {
    await displayServerPush(
      CHANNEL_BY_TYPE[payload.type],
      payload.title,
      payload.body,
      data as Record<string, string>,
    );
  }
}

// Handles a press on a notification we drew. The payload comes back off the
// notification, so the same shape decides where the press goes.
//
// Only the anniversary leads anywhere: a granted credit has already been dealt
// with by the time the couple taps it, and opening the rewards screen uninvited
// would be the notification deciding what they came for.
export function handlePushPress(data: unknown): void {
  const payload = parsePushPayload(data);
  if (payload?.type === 'memory_anniversary') {
    openMemoryCard(payload.memory_ulid);
  }
}
