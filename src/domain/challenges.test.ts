import { CHALLENGES } from './challenges';

// The bundle is content, so there is little logic to test — but there are three
// things a silent edit could break, and each of them shows up mid-session.
describe('CHALLENGES', () => {
  // The canon said 21 until the cross-check counted the demo's file; pinning the
  // number keeps the two documents and the bundle from drifting apart again.
  test('carries the twenty cards ported from the demo', () => {
    expect(CHALLENGES).toHaveLength(20);
  });

  // buildQueue deals them by position and the summary counts them; a duplicated
  // id would make a repeated card look like a distinct one.
  test('ids are unique', () => {
    const ids = CHALLENGES.map(challenge => challenge.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every card has text to show', () => {
    CHALLENGES.forEach(challenge => {
      expect(challenge.title.length).toBeGreaterThan(0);
      expect(challenge.description.length).toBeGreaterThan(0);
    });
  });

  // The one card that will want artwork in P11b. Its illustration did not travel
  // from the web demo; the marker is what survived, and it is the hook P11b
  // hangs the artwork on.
  test('exactly one card is marked as the yoga challenge', () => {
    const yoga = CHALLENGES.filter(challenge => challenge.type === 'yoga');

    expect(yoga).toHaveLength(1);
    expect(yoga[0].id).toBe('yogachallenge');
  });
});
