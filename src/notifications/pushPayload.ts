import { z } from 'zod';

// What the backend puts in an FCM data message.
//
// Two things about this shape are easy to get wrong and expensive to discover
// in production:
//
//  - The copy travels INSIDE `data` (title/body), not in FCM's `notification`
//    block. The server sends data-only messages on purpose, so the client
//    renders every notification through notifee and one code path serves local
//    and remote alike. There is nothing to read from `message.notification`.
//  - FCM data values are strings, always. `years` is a number the server casts
//    to a string before sending, so a numeric schema would reject every real
//    anniversary push while every hand-written test fixture passed.
//
// Title and body are optional here even though the sender always fills them:
// the routing (a granted credit refreshing the balance) is worth doing even for
// a message we would have nothing to show for.

const anniversarySchema = z.object({
  type: z.literal('memory_anniversary'),
  memory_ulid: z.string(),
  kind: z.string(),
  years: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
});

const adRewardSchema = z.object({
  type: z.literal('ad_reward_granted'),
  amount: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
});

export const pushPayloadSchema = z.discriminatedUnion('type', [
  anniversarySchema,
  adRewardSchema,
]);

export type PushPayload = z.infer<typeof pushPayloadSchema>;

// Null for anything we do not understand — an unknown type, a missing ulid, a
// payload from a newer backend. A push we cannot read is a push we ignore; it
// must never take the app down from a background handler.
export function parsePushPayload(data: unknown): PushPayload | null {
  const parsed = pushPayloadSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
