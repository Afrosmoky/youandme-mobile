import {
  LOCAL_GAME_STATE_KEY,
  LOCAL_GAME_STATE_VERSION,
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from './localGameState';
import { kv } from './kv';
import {
  advance,
  setAnswer,
  setQuestionLiked,
  startLocalGame,
} from '../domain/localGame';
import { CHALLENGES } from '../domain/challenges';
import { Question } from '../domain/types';

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: ['bliskosc'],
  options: null,
  liked: false,
  isLocked: false,
});

// A session mid-play: some cards behind it, the phone with player two, an answer
// typed but not saved.
const midSession = () => {
  const started = startLocalGame({
    player1: 'Piotr',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: [question(1), question(2), question(3)],
    challenges: CHALLENGES,
    interval: 2,
    startedAt: '2026-08-05T18:00:00.000Z',
  });
  return setAnswer(advance(started), 'p1', 'moja odpowiedź');
};

beforeEach(async () => {
  // The mock store lives for the module registry's lifetime, not the test's.
  await clearLocalGameState();
});

describe('saveLocalGameState / loadLocalGameState', () => {
  test('a saved session comes back exactly as it went in', async () => {
    const state = midSession();

    await saveLocalGameState(state);

    expect(await loadLocalGameState()).toEqual(state);
  });

  test('the queue survives the round trip, challenges and all', async () => {
    const state = midSession();

    await saveLocalGameState(state);
    const restored = await loadLocalGameState();

    // Resume has to show the same cards it started with — this is why the queue
    // holds whole questions rather than ulids to refetch.
    expect(restored?.queue).toEqual(state.queue);
    expect(restored?.queue.some(item => item.kind === 'challenge')).toBe(true);
  });

  // S3b: the heart is written onto the card in the queue, so it has to survive
  // the round trip like everything else about that card — otherwise a paused
  // session comes back showing what the server said when it dealt the deck.
  test('a like given mid-session comes back with the card', async () => {
    const state = setQuestionLiked(midSession(), 'Q2', true);

    await saveLocalGameState(state);
    const restored = await loadLocalGameState();
    const card = restored?.queue.find(
      item => item.kind === 'question' && item.question.ulid === 'Q2',
    );

    expect(card?.kind === 'question' && card.question.liked).toBe(true);
    expect(restored).toEqual(state);
  });

  // S3c: the report goes out per transition, so what a killed app owes lives in
  // the state. If it did not survive the round trip, those cards would be lost.
  test('what the session still owes comes back with it', async () => {
    const state = { ...midSession(), pendingReport: ['Q1'] };

    await saveLocalGameState(state);

    expect((await loadLocalGameState())?.pendingReport).toEqual(['Q1']);
  });

  test('nothing stored means nothing to resume', async () => {
    expect(await loadLocalGameState()).toBeNull();
  });

  test('clearing removes the session', async () => {
    await saveLocalGameState(midSession());
    await clearLocalGameState();

    expect(await loadLocalGameState()).toBeNull();
  });
});

describe('unreadable stored values', () => {
  test('a version this build does not know is dropped, not migrated', async () => {
    await kv.set(
      LOCAL_GAME_STATE_KEY,
      JSON.stringify({
        version: LOCAL_GAME_STATE_VERSION + 1,
        state: midSession(),
      }),
    );

    expect(await loadLocalGameState()).toBeNull();
    // And cleared, so the next launch does not walk into it again.
    expect(await kv.get(LOCAL_GAME_STATE_KEY)).toBeNull();
  });

  test('a value that is not JSON is dropped and cleared', async () => {
    await kv.set(LOCAL_GAME_STATE_KEY, 'nie-json');

    expect(await loadLocalGameState()).toBeNull();
    expect(await kv.get(LOCAL_GAME_STATE_KEY)).toBeNull();
  });

  test('a state missing a field is dropped and cleared', async () => {
    const { cursor, ...withoutCursor } = midSession();

    await kv.set(
      LOCAL_GAME_STATE_KEY,
      JSON.stringify({
        version: LOCAL_GAME_STATE_VERSION,
        state: withoutCursor,
      }),
    );

    expect(cursor).toBe(1);
    expect(await loadLocalGameState()).toBeNull();
    expect(await kv.get(LOCAL_GAME_STATE_KEY)).toBeNull();
  });

  // The upgrade case for S2: cards dealt by an older build have no options key
  // at all. Dropping those states would end every game in progress on update —
  // the exact failure the version envelope exists to prevent — so the field is
  // optional with a null default and the version stays at 1.
  test('a game dealt before choice cards existed still resumes', async () => {
    const state = midSession();
    // Written the way an older build wrote it: no options key anywhere, not even
    // a null one.
    const legacy = JSON.stringify(
      { version: LOCAL_GAME_STATE_VERSION, state },
      (key, value) => (key === 'options' ? undefined : value),
    );
    expect(legacy).not.toContain('options');

    await kv.set(LOCAL_GAME_STATE_KEY, legacy);

    const restored = await loadLocalGameState();
    const firstCard = restored?.queue.find(item => item.kind === 'question');

    expect(restored).not.toBeNull();
    expect(restored?.queue).toHaveLength(state.queue.length);
    // Read back as an open card, which is what it always was.
    expect(firstCard?.kind === 'question' && firstCard.question.options).toBe(
      null,
    );
  });

  // The upgrade case for S3c. Before it, nothing was reported until the session
  // ended — so a state written by that build owes the server everything it
  // played, and reading the missing key as "nothing owed" would drop those cards
  // silently. Dropping the whole state would lose them too, plus the game.
  test('a game dealt before the live report still owes what it played', async () => {
    const state = { ...midSession(), playedUlids: ['Q1'] };
    const legacy = JSON.stringify(
      { version: LOCAL_GAME_STATE_VERSION, state },
      (key, value) => (key === 'pendingReport' ? undefined : value),
    );
    expect(legacy).not.toContain('pendingReport');

    await kv.set(LOCAL_GAME_STATE_KEY, legacy);
    const restored = await loadLocalGameState();

    expect(restored?.pendingReport).toEqual(['Q1']);
    expect(restored?.cursor).toBe(state.cursor);
  });

  test('a queue item of an unknown kind is dropped and cleared', async () => {
    await kv.set(
      LOCAL_GAME_STATE_KEY,
      JSON.stringify({
        version: LOCAL_GAME_STATE_VERSION,
        state: { ...midSession(), queue: [{ kind: 'advert' }] },
      }),
    );

    expect(await loadLocalGameState()).toBeNull();
    expect(await kv.get(LOCAL_GAME_STATE_KEY)).toBeNull();
  });
});
