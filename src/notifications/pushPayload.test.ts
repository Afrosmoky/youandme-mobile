import { parsePushPayload } from './pushPayload';

describe('parsePushPayload', () => {
  // Exactly what NotifyMemoryAnniversariesCommand sends, down to `years` being
  // a string — FCM data values always are, and a numeric schema would reject
  // every real push while passing every hand-written fixture.
  test('reads an anniversary push, years and all', () => {
    const payload = parsePushPayload({
      type: 'memory_anniversary',
      memory_ulid: 'm_01',
      kind: 'year',
      years: '1',
      title: 'Rok temu',
      body: 'Rok temu zapisaliście wspomnienie.',
    });

    expect(payload).toEqual(
      expect.objectContaining({
        type: 'memory_anniversary',
        memory_ulid: 'm_01',
        years: '1',
      }),
    );
  });

  test('reads an ad-reward push', () => {
    const payload = parsePushPayload({
      type: 'ad_reward_granted',
      amount: '1',
      title: 'Kredyt przyznany',
      body: 'Nagroda za obejrzaną reklamę jest już na Waszym koncie.',
    });

    expect(payload?.type).toBe('ad_reward_granted');
  });

  // The copy is optional so the routing survives a payload we cannot display;
  // see pushPayload.ts.
  test('reads a payload with no copy at all', () => {
    expect(
      parsePushPayload({type: 'ad_reward_granted'})?.type,
    ).toBe('ad_reward_granted');
  });

  test('refuses an anniversary with no memory to open', () => {
    expect(
      parsePushPayload({type: 'memory_anniversary', kind: 'year', years: '1'}),
    ).toBeNull();
  });

  // A newer backend, a stray notification, a malformed message: ignored, never
  // thrown — this runs in a background handler where a throw is a crash.
  test('ignores what it does not understand', () => {
    expect(parsePushPayload({type: 'something_new'})).toBeNull();
    expect(parsePushPayload(undefined)).toBeNull();
    expect(parsePushPayload('nonsense')).toBeNull();
  });
});
