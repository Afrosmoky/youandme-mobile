import {
  advance,
  buildQueue,
  canSaveMemory,
  currentItem,
  isFinished,
  markMemorySaved,
  matchesSetup,
  passTurn,
  primaryAction,
  questionCounter,
  reportBatches,
  setAnswer,
  startLocalGame,
  summarise,
  LocalGameState,
} from './localGame';
import { Challenge } from './challenges';
import { shuffle } from './shuffle';
import { Question } from './types';

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: [],
  liked: false,
  isLocked: false,
});

const questions = (count: number): Question[] =>
  Array.from({ length: count }, (_, i) => question(i + 1));

const challenge = (n: number): Challenge => ({
  id: `c${n}`,
  title: `Wyzwanie ${n}`,
  description: '...',
});

const challenges = (count: number): Challenge[] =>
  Array.from({ length: count }, (_, i) => challenge(i + 1));

// A game the way the setup screen starts one, with the deck it was dealt.
const game = (
  questionCount: number,
  challengeCount = 5,
  interval = 5,
): LocalGameState =>
  startLocalGame({
    player1: 'Piotr',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: questions(questionCount),
    challenges: challenges(challengeCount),
    interval,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

// Walks n cards forward, the way the primary button does.
const advanceBy = (state: LocalGameState, n: number): LocalGameState =>
  Array.from({ length: n }).reduce<LocalGameState>(acc => advance(acc), state);

const kinds = (state: LocalGameState) => state.queue.map(item => item.kind);

describe('buildQueue', () => {
  test('deals a challenge after every interval-th question', () => {
    const queue = buildQueue(questions(12), challenges(5), 5);

    expect(queue.map(item => item.kind)).toEqual([
      'question',
      'question',
      'question',
      'question',
      'question',
      'challenge',
      'question',
      'question',
      'question',
      'question',
      'question',
      'challenge',
      'question',
      'question',
    ]);
  });

  test('keeps the questions in the order the server dealt them', () => {
    const queue = buildQueue(questions(7), challenges(5), 5);

    const ulids = queue
      .filter(item => item.kind === 'question')
      .map(item => (item.kind === 'question' ? item.question.ulid : ''));

    expect(ulids).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']);
  });

  test('takes the challenges in bundle order, without repeating one', () => {
    const queue = buildQueue(questions(16), challenges(5), 5);

    const ids = queue
      .filter(item => item.kind === 'challenge')
      .map(item => (item.kind === 'challenge' ? item.challenge.id : ''));

    expect(ids).toEqual(['c1', 'c2', 'c3']);
  });

  // The canon rule: a session ends on a question, never on an instruction with
  // nothing after it.
  test('never puts a challenge last, even when one is due', () => {
    // Ten questions at an interval of five: two challenges fall due, after the
    // fifth and after the tenth. The first goes in, the second is dropped
    // because no question follows it — the session must not end on an
    // instruction.
    const queue = buildQueue(questions(10), challenges(5), 5);

    expect(queue).toHaveLength(11);
    expect(queue.filter(item => item.kind === 'challenge')).toHaveLength(1);
    expect(queue[queue.length - 1].kind).toBe('question');
  });

  test('deals no challenge at all when the deck is shorter than the interval', () => {
    expect(buildQueue(questions(4), challenges(5), 5)).toHaveLength(4);
  });

  // Degrades rather than showing the same challenge twice.
  test('stops interleaving once the bundle runs out', () => {
    const queue = buildQueue(questions(20), challenges(2), 5);

    expect(queue.filter(item => item.kind === 'challenge')).toHaveLength(2);
    expect(queue).toHaveLength(22);
  });

  test('an empty deck is an empty queue, not an error', () => {
    expect(buildQueue([], challenges(5), 5)).toEqual([]);
  });

  // The setup screen shuffles the bundle per session so a couple meets a
  // different slice of the twenty each time. Sequencing must not care which
  // order it was handed: same shape, and still no challenge twice in a session.
  test('a shuffled pool changes which challenges appear, not the queue', () => {
    const pool = challenges(6);
    const inOrder = buildQueue(questions(20), pool, 5);
    const shuffled = buildQueue(questions(20), shuffle(pool), 5);

    expect(shuffled).toHaveLength(inOrder.length);

    const ids = shuffled
      .filter(item => item.kind === 'challenge')
      .map(item => (item.kind === 'challenge' ? item.challenge.id : ''));

    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pool.map(entry => entry.id)).toEqual(expect.arrayContaining(ids));
  });
});

describe('startLocalGame', () => {
  test('starts on the first card, with player one holding the phone', () => {
    const state = game(10);

    expect(state.cursor).toBe(0);
    expect(state.activePlayer).toBe('p1');
    expect(state.answers).toEqual({ p1: '', p2: '' });
    expect(state.playedUlids).toEqual([]);
    expect(state.savedMemoryUlids).toEqual([]);
    expect(currentItem(state)).toEqual({
      kind: 'question',
      question: question(1),
    });
  });

  test('an empty deck is finished from the start', () => {
    expect(isFinished(game(0))).toBe(true);
    expect(currentItem(game(0))).toBeNull();
  });
});

describe('passTurn', () => {
  test('hands the phone from player one to player two', () => {
    expect(passTurn(game(10)).activePlayer).toBe('p2');
  });

  test('is a no-op once player two already has it', () => {
    const state = passTurn(passTurn(game(10)));

    expect(state.activePlayer).toBe('p2');
  });

  test('leaves what both wrote alone', () => {
    const state = passTurn(setAnswer(game(10), 'p1', 'moja odpowiedź'));

    expect(state.answers).toEqual({ p1: 'moja odpowiedź', p2: '' });
  });
});

describe('advance', () => {
  test('moves to the next card and hands the phone back to player one', () => {
    const state = advance(passTurn(game(10)));

    expect(state.cursor).toBe(1);
    expect(state.activePlayer).toBe('p1');
  });

  test('clears the answers — unsaved text does not travel to the next card', () => {
    const written = setAnswer(setAnswer(game(10), 'p1', 'a'), 'p2', 'b');

    expect(advance(written).answers).toEqual({ p1: '', p2: '' });
  });

  test('records the question left behind, for the report', () => {
    expect(advanceBy(game(10), 3).playedUlids).toEqual(['Q1', 'Q2', 'Q3']);
  });

  // A skip is the same transition: the couple moved past the card either way.
  test('counts a skipped card exactly as an answered one', () => {
    const answered = advance(
      setAnswer(setAnswer(game(10), 'p1', 'a'), 'p2', 'b'),
    );
    const skipped = advance(game(10));

    expect(skipped.playedUlids).toEqual(answered.playedUlids);
    expect(skipped.cursor).toBe(answered.cursor);
  });

  // Challenges have no ulid and are not questions — the map must not count them.
  test('a challenge adds nothing to the report', () => {
    const state = advanceBy(game(10, 5, 3), 4);

    expect(kinds(state)[3]).toBe('challenge');
    expect(state.playedUlids).toEqual(['Q1', 'Q2', 'Q3']);
  });

  // Nothing today can advance the same card twice, but a duplicate would 422 the
  // whole batch, not one card, so the guard is asserted rather than assumed.
  test('never repeats a ulid in the buffer', () => {
    const state = advanceBy(game(3), 3);
    const again = advance({ ...state, cursor: 0 });

    expect(again.playedUlids).toEqual(['Q1', 'Q2', 'Q3']);
  });

  test('the card the couple stopped on is not reported', () => {
    // Two cards left behind, sitting on the third.
    const state = advanceBy(game(10), 2);

    expect(state.playedUlids).toEqual(['Q1', 'Q2']);
    expect(currentItem(state)).toEqual({
      kind: 'question',
      question: question(3),
    });
  });

  test('stops at the end of the queue', () => {
    const finished = advanceBy(game(3), 3);

    expect(isFinished(finished)).toBe(true);
    expect(advance(finished)).toBe(finished);
    expect(currentItem(finished)).toBeNull();
  });
});

describe('canSaveMemory', () => {
  test('off until both have written something', () => {
    const state = game(10);

    expect(canSaveMemory(state)).toBe(false);
    expect(canSaveMemory(setAnswer(state, 'p1', 'tylko ja'))).toBe(false);
  });

  test('on once both answers are there', () => {
    const state = setAnswer(setAnswer(game(10), 'p1', 'a'), 'p2', 'b');

    expect(canSaveMemory(state)).toBe(true);
  });

  test('whitespace is not an answer', () => {
    const state = setAnswer(setAnswer(game(10), 'p1', 'a'), 'p2', '   ');

    expect(canSaveMemory(state)).toBe(false);
  });

  test('off on a challenge — there is no question to save', () => {
    const played = advanceBy(game(10, 5, 3), 3);
    const written = setAnswer(setAnswer(played, 'p1', 'a'), 'p2', 'b');

    expect(currentItem(written)?.kind).toBe('challenge');
    expect(canSaveMemory(written)).toBe(false);
  });

  test('off again once this card has been saved', () => {
    const written = setAnswer(setAnswer(game(10), 'p1', 'a'), 'p2', 'b');

    expect(canSaveMemory(markMemorySaved(written, 'Q1'))).toBe(false);
  });
});

describe('markMemorySaved', () => {
  test('records the saved card once', () => {
    const state = markMemorySaved(markMemorySaved(game(10), 'Q1'), 'Q1');

    expect(state.savedMemoryUlids).toEqual(['Q1']);
  });
});

describe('primaryAction', () => {
  test('player one hands over, player two moves on', () => {
    const state = game(10);

    expect(primaryAction(state)).toBe('pass');
    expect(primaryAction(passTurn(state))).toBe('next');
  });

  test('a challenge has no turns to hand over', () => {
    const state = advanceBy(game(10, 5, 3), 3);

    expect(currentItem(state)?.kind).toBe('challenge');
    expect(primaryAction(state)).toBe('next');
  });
});

describe('questionCounter', () => {
  test('numbers the questions, ignoring the challenges between them', () => {
    // Interval 3: q q q C q q q C ...
    const state = game(10, 5, 3);

    expect(questionCounter(state)).toEqual({ current: 1, total: 10 });
    expect(questionCounter(advanceBy(state, 2))).toEqual({
      current: 3,
      total: 10,
    });
    // The card after the third question is the challenge.
    expect(questionCounter(advanceBy(state, 3))).toEqual({
      current: 3,
      total: 10,
    });
    expect(questionCounter(advanceBy(state, 4))).toEqual({
      current: 4,
      total: 10,
    });
  });
});

describe('matchesSetup', () => {
  const setup = {
    player1: 'Piotr',
    player2: 'Wiktoria',
    categorySlug: 'randka' as string | null,
  };

  test('resumes when the players and the category are unchanged', () => {
    expect(matchesSetup(game(10), setup)).toBe(true);
  });

  test('a different partner starts over', () => {
    expect(matchesSetup(game(10), { ...setup, player2: 'Ala' })).toBe(false);
  });

  test('a different category starts over', () => {
    expect(matchesSetup(game(10), { ...setup, categorySlug: null })).toBe(
      false,
    );
  });
});

describe('reportBatches', () => {
  test('one batch while the buffer fits under the cap', () => {
    expect(reportBatches(['Q1', 'Q2'], 100)).toEqual([['Q1', 'Q2']]);
  });

  test('splits at the cap rather than sending a batch that would 422', () => {
    const ulids = Array.from({ length: 250 }, (_, i) => `Q${i + 1}`);

    const batches = reportBatches(ulids, 100);

    expect(batches.map(batch => batch.length)).toEqual([100, 100, 50]);
    expect(batches.flat()).toEqual(ulids);
  });

  // A repeat inside ONE batch is a 422, and a 422 costs the whole session's
  // progress rather than one card.
  test('drops a repeated ulid, keeping the first position', () => {
    expect(reportBatches(['Q1', 'Q2', 'Q1', 'Q3'], 100)).toEqual([
      ['Q1', 'Q2', 'Q3'],
    ]);
  });

  test('an empty buffer yields no batches, so nothing is sent', () => {
    expect(reportBatches([], 100)).toEqual([]);
  });

  test('a buffer landing exactly on the cap stays one batch', () => {
    const ulids = Array.from({ length: 100 }, (_, i) => `Q${i + 1}`);

    expect(reportBatches(ulids, 100)).toHaveLength(1);
  });
});

describe('summarise', () => {
  test('counts played cards, challenges seen and memories saved', () => {
    // Interval 3, ten questions: three cards, a challenge, three more.
    const played = advanceBy(game(10, 5, 3), 7);
    const state = markMemorySaved(markMemorySaved(played, 'Q1'), 'Q4');

    expect(summarise(state)).toEqual({
      questionsPlayed: 6,
      challengesShown: 1,
      memoriesSaved: 2,
    });
  });

  test('an untouched game summarises to zeroes', () => {
    expect(summarise(game(10))).toEqual({
      questionsPlayed: 0,
      challengesShown: 0,
      memoriesSaved: 0,
    });
  });
});
