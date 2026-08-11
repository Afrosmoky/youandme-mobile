import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameScreen } from './LocalGameScreen';
import { LocalGameSummaryScreen } from './LocalGameSummaryScreen';
import { isFinished, startLocalGame } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { createLocalMemory } from '../api/memories';
import { likeQuestion, unlikeQuestion } from '../api/likes';
import { reportPlayedCards } from '../api/localGame';
import { getProgress } from '../api/progress';
import type { RootStackParamList } from '../navigation/types';
import type { Challenge } from '../domain/challenges';
import type { Memory, Progress, Question } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/memories', () => ({ createLocalMemory: jest.fn() }));
jest.mock('../api/likes', () => ({
  likeQuestion: jest.fn(),
  unlikeQuestion: jest.fn(),
}));
jest.mock('../api/localGame', () => ({ reportPlayedCards: jest.fn() }));
jest.mock('../api/progress', () => ({ getProgress: jest.fn() }));

const milestone = (threshold: number, unlocked: boolean) => ({
  slug: `m${threshold}`,
  name: `Kamień ${threshold}`,
  threshold,
  ordering: 1,
  unlocked,
  unlockedAt: unlocked ? '2026-08-05T18:00:00.000Z' : null,
});

const progressWith = (unlocked: boolean): Progress => ({
  totalPlayed: unlocked ? 10 : 4,
  nextThreshold: unlocked ? null : 10,
  milestones: [milestone(10, unlocked)],
});

// Every transition now talks to the server (S3c), so both calls answer by
// default in every suite in this file. jest.clearAllMocks() in the suites below
// clears the calls, not these implementations.
beforeEach(() => {
  jest
    .mocked(reportPlayedCards)
    .mockResolvedValue({ playedTotal: 1, newlyPlayed: 1 });
  jest.mocked(getProgress).mockResolvedValue(progressWith(false));
});

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGame'>;

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: [],
  options: null,
  liked: false,
  isLocked: false,
});

const challenge: Challenge = {
  id: 'gazechallenge',
  title: 'Wyzwanie Spojrzeń',
  description: 'Patrzcie sobie w oczy przez minutę.',
};

const popTo = jest.fn();
const replace = jest.fn();

function makeProps(): Props {
  return {
    navigation: { popTo, replace, setOptions: jest.fn(), navigate: jest.fn() },
    route: { key: 'LocalGame', name: 'LocalGame', params: undefined },
  } as unknown as Props;
}

// A session of `count` questions, with a challenge every `interval` cards.
const session = (count: number, interval = 5) =>
  startLocalGame({
    player1: 'piotr_s',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: Array.from({ length: count }, (_, i) => question(i + 1)),
    challenges: [challenge],
    interval,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

const renderScreen = () =>
  renderWithQueryClient(<LocalGameScreen {...makeProps()} />);

// A one-card session whose card is answered by picking (S2).
const items = ['Rada', 'Przytulenie', 'Przestrzeń'];
const choiceSession = (multiple: boolean) =>
  startLocalGame({
    player1: 'piotr_s',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: [{ ...question(1), options: { items, multiple } }],
    challenges: [challenge],
    interval: 5,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

describe('LocalGameScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
  });

  test('shows the card number and whose turn it is', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(await screen.findByTestId('local-game-header')).toHaveTextContent(
      pl.localGame.cardHeader(1, 20, 'piotr_s'),
    );
    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 1?',
    );
  });

  test('with nothing stored it sends the couple back to the setup', async () => {
    renderScreen();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('LocalGameSetup'));
  });

  test('the primary button hands the phone over, then moves on', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    const primary = await screen.findByTestId('local-game-primary');
    expect(primary).toHaveTextContent(pl.localGame.passButton);

    fireEvent.press(primary);

    // Same card, other player.
    await waitFor(() =>
      expect(screen.getByTestId('local-game-header')).toHaveTextContent(
        pl.localGame.cardHeader(1, 20, 'Wiktoria'),
      ),
    );
    expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
      pl.localGame.nextButton,
    );
  });

  test('moving on deals the next card and hands the phone back', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    fireEvent.press(screen.getByTestId('local-game-primary'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-header')).toHaveTextContent(
        pl.localGame.cardHeader(2, 20, 'piotr_s'),
      ),
    );
  });

  test('skipping moves on without a handover', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );
  });

  test('every transition is written to disk, so a pause resumes in place', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(async () =>
      expect((await loadLocalGameState())?.cursor).toBe(1),
    );
    // And the skipped card is on its way to the report.
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']);
  });

  test('the answer field is hidden until asked for', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(screen.queryByTestId('local-game-answer')).toBeNull();

    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));

    expect(screen.getByTestId('local-game-answer')).toBeOnTheScreen();
  });

  test('what one player types belongs to their turn only', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));
    fireEvent.changeText(
      screen.getByTestId('local-game-answer'),
      'moja odpowiedź',
    );
    // Hand over, then open the field again: player two starts from blank.
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.queryByTestId('local-game-answer')).toBeNull(),
    );
    fireEvent.press(screen.getByTestId('local-game-write-toggle'));

    expect(screen.getByTestId('local-game-answer')).toHaveProp('value', '');
  });

  test('a challenge gets its own layout and a single way onward', async () => {
    // Interval 1: question, challenge, question.
    await saveLocalGameState(session(3, 1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    expect(
      await screen.findByTestId('local-game-challenge-title'),
    ).toHaveTextContent(challenge.title);
    // No turns, no skip, no answer on a challenge.
    expect(screen.queryByTestId('local-game-skip')).toBeNull();
    expect(screen.queryByTestId('local-game-write-toggle')).toBeNull();
    expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
      pl.localGame.challengeDoneButton,
    );
  });

  test('a challenge adds nothing to the report', async () => {
    await saveLocalGameState(session(3, 1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    fireEvent.press(await screen.findByTestId('local-game-primary'));

    await waitFor(async () =>
      expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']),
    );
  });

  test('the end of the queue hands over to the summary', async () => {
    await saveLocalGameState(session(1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        'LocalGameSummary',
        // What travels with it is the celebration baseline — see the S3d suite.
        expect.any(Object),
      ),
    );
  });

  // What the setup screen reads to decide whether there is anything to resume.
  // A session that reached the summary but left an unfinished state on disk is
  // a game the couple is offered back after they have already been told it is
  // over — the regression S3 shipped with (see the save-in-flight test below).
  test('the end of the queue leaves a session marked finished on disk', async () => {
    await saveLocalGameState(session(1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() => expect(replace).toHaveBeenCalled());
    const stored = await loadLocalGameState();
    expect(stored && isFinished(stored)).toBe(true);
  });

  // The app killed on the last card: the session is over but was never
  // summarised, so its played cards were never reported.
  test('a finished session found on disk goes straight to the summary', async () => {
    const finished = { ...session(1), cursor: 1, playedUlids: ['Q1'] };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary'),
    );
  });

  // Leaving mid-game is a pause: the state stays put and the setup screen offers
  // it back.
  test('pausing leaves the session on disk', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(async () =>
      expect((await loadLocalGameState())?.cursor).toBe(1),
    );

    expect(await loadLocalGameState()).not.toBeNull();
  });
});

describe('LocalGameScreen — saving a card as a memory', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(createLocalMemory).mockResolvedValue({} as Memory);
  });

  // Both answers written, on the current card.
  const answerBoth = async () => {
    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'moja');
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    fireEvent.press(screen.getByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'jej');
  };

  test('the save is dead until both have written', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(await screen.findByTestId('local-game-save')).toBeDisabled();

    fireEvent.press(screen.getByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'tylko ja');

    expect(screen.getByTestId('local-game-save')).toBeDisabled();
  });

  test('saving sends both answers and the second player name', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    await waitFor(() =>
      expect(createLocalMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          questionUlid: 'Q1',
          answerA: 'moja',
          answerB: 'jej',
          playerBName: 'Wiktoria',
        }),
      ),
    );
  });

  test('a saved card says so and cannot be saved twice', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    expect(await screen.findByTestId('local-game-saved')).toHaveTextContent(
      pl.localGame.savedBadge,
    );
    expect(screen.queryByTestId('local-game-save')).toBeNull();
    expect((await loadLocalGameState())?.savedMemoryUlids).toEqual(['Q1']);
  });

  test('the couple stays on the card after saving', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    await screen.findByTestId('local-game-saved');

    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 1?',
    );
  });

  test('a failed save is shown and changes nothing', async () => {
    jest.mocked(createLocalMemory).mockRejectedValue(new Error('network'));
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    expect(
      await screen.findByTestId('local-game-save-error'),
    ).toBeOnTheScreen();
    expect((await loadLocalGameState())?.savedMemoryUlids).toEqual([]);
  });

  // The save is the third thing on this screen that answers after a round trip
  // (the like and the report are the others), and it now follows the same rule:
  // it writes onto the session as it is NOW. Writing back the snapshot it
  // started from would rewind the couple to the card they tapped save on.
  test('a save landing after the couple moved on does not rewind them', async () => {
    let finish: (memory: Memory) => void = () => {};
    jest
      .mocked(createLocalMemory)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    // Still in flight, and the couple is done with this card.
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );

    finish({} as Memory);

    // The card is recorded as saved — it was — and nothing else moved back.
    await waitFor(async () =>
      expect((await loadLocalGameState())?.savedMemoryUlids).toEqual(['Q1']),
    );
    const stored = await loadLocalGameState();
    expect(stored?.cursor).toBe(1);
    expect(stored?.playedUlids).toEqual(['Q1']);
    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 2?',
    );
  });

  // The regression itself: the couple saves the LAST card and taps on without
  // waiting for the request. The save then answered to a session that had
  // already finished and wrote the unfinished one back over it — leaving a
  // playable game on disk, which the setup screen dutifully offered to resume
  // after the summary had told them the game was over.
  test('a save in flight cannot unfinish the session that ended under it', async () => {
    let finish: (memory: Memory) => void = () => {};
    jest
      .mocked(createLocalMemory)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(1));
    const view = renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        'LocalGameSummary',
        expect.any(Object),
      ),
    );

    // What the navigator does on replace, while the request is still open.
    view.unmount();
    finish({} as Memory);
    await new Promise(resolve => setImmediate(resolve));

    const stored = await loadLocalGameState();
    expect(stored && isFinished(stored)).toBe(true);
  });

  // Saving is not playing: the map moves on the report, not here.
  test('saving does not touch the played buffer', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    await screen.findByTestId('local-game-saved');

    expect((await loadLocalGameState())?.playedUlids).toEqual([]);
  });
});

// S3b: the same heart as on the served card and the daily card, on a card the
// phone owns. What is specific here is that the flip has to reach the queue on
// disk — the session is frozen there, and that is what a resume reads.
describe('LocalGameScreen — liking a card', () => {
  // The heart as LikeHeart draws it.
  const FILLED = '♥︎';
  const OUTLINE = '♡︎';

  // A session whose first card the couple already liked, the way the deck
  // endpoint hands it over since S3a.
  const likedSession = () =>
    startLocalGame({
      player1: 'piotr_s',
      player2: 'Wiktoria',
      categorySlug: 'randka',
      questions: [{ ...question(1), liked: true }, question(2)],
      challenges: [challenge],
      interval: 5,
      startedAt: '2026-08-05T18:00:00.000Z',
    });

  const likedOnDisk = async (ulid: string) => {
    const stored = await loadLocalGameState();
    const card = stored?.queue.find(
      item => item.kind === 'question' && item.question.ulid === ulid,
    );
    return card?.kind === 'question' ? card.question.liked : undefined;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(likeQuestion).mockResolvedValue({ liked: true });
    jest.mocked(unlikeQuestion).mockResolvedValue({ liked: false });
  });

  test('the heart shows what the card was dealt with', async () => {
    await saveLocalGameState(likedSession());
    renderScreen();

    expect(await screen.findByTestId('local-game-like')).toHaveTextContent(
      FILLED,
    );
  });

  test('an unliked card gets an outline heart', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(await screen.findByTestId('local-game-like')).toHaveTextContent(
      OUTLINE,
    );
  });

  test('tapping fills the heart at once and tells the server', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );
    expect(likeQuestion).toHaveBeenCalledWith('Q1');
    expect(unlikeQuestion).not.toHaveBeenCalled();
  });

  test('tapping a liked card takes the like back', async () => {
    await saveLocalGameState(likedSession());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(OUTLINE),
    );
    expect(unlikeQuestion).toHaveBeenCalledWith('Q1');
    expect(likeQuestion).not.toHaveBeenCalled();
  });

  // Held open on purpose: a rejection that lands in the same tick would make
  // "the heart is empty at the end" pass even if it had never been filled, which
  // is the one thing this test is about.
  test('the flip shows before the answer comes, and is undone if it fails', async () => {
    let fail: (err: Error) => void = () => {};
    jest
      .mocked(likeQuestion)
      .mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));

    // Filled while the call is still in flight, and already on disk.
    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );
    expect(await likedOnDisk('Q1')).toBe(true);

    fail(new Error('network'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(OUTLINE),
    );
    expect(await likedOnDisk('Q1')).toBe(false);
  });

  // One tap, one call: the heart is dead while its own call is in flight.
  test('a double tap does not fire two calls', async () => {
    let finish: (result: { liked: boolean }) => void = () => {};
    jest
      .mocked(likeQuestion)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(20));
    renderScreen();

    const heart = await screen.findByTestId('local-game-like');
    fireEvent.press(heart);
    await waitFor(() => expect(heart).toHaveTextContent(FILLED));
    fireEvent.press(heart);

    expect(likeQuestion).toHaveBeenCalledTimes(1);
    expect(unlikeQuestion).not.toHaveBeenCalled();

    finish({ liked: true });
    await waitFor(() => expect(heart).toHaveTextContent(FILLED));
  });

  // The whole point of S3b: the queue is frozen on disk, so a heart that lives
  // only in the component would be gone by the next resume.
  test('the like is written into the frozen queue, so a resume keeps it', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));

    await waitFor(async () => expect(await likedOnDisk('Q1')).toBe(true));

    // And it is still there after the state has been through storage again,
    // exactly as the couple would find it on the next launch.
    const resumed = await loadLocalGameState();
    await saveLocalGameState(resumed!);
    expect(await likedOnDisk('Q1')).toBe(true);
  });

  test('liking changes nothing else about the session', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));
    await waitFor(async () => expect(await likedOnDisk('Q1')).toBe(true));

    const stored = await loadLocalGameState();
    expect(stored?.cursor).toBe(0);
    expect(stored?.activePlayer).toBe('p1');
    // Liking is not playing: the map still moves on the report only.
    expect(stored?.playedUlids).toEqual([]);
    expect(stored?.savedMemoryUlids).toEqual([]);
  });

  test('the heart travels with the card, not with the screen', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );

    fireEvent.press(screen.getByTestId('local-game-skip'));

    // Next card, its own (empty) heart.
    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );
    expect(screen.getByTestId('local-game-like')).toHaveTextContent(OUTLINE);
    expect(await likedOnDisk('Q1')).toBe(true);
  });

  // The like is the one transition that lands after an await. If it wrote back
  // the state it started from, an answer arriving after the couple moved on
  // would rewind the session to the previous card.
  test('an answer arriving after the couple moved on does not rewind them', async () => {
    let finish: (result: { liked: boolean }) => void = () => {};
    jest
      .mocked(likeQuestion)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );
    // Still in flight, and the couple is done with this card.
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );

    finish({ liked: true });

    await waitFor(async () =>
      expect((await loadLocalGameState())?.cursor).toBe(1),
    );
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']);
    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 2?',
    );
    expect(await likedOnDisk('Q1')).toBe(true);
  });

  // A challenge is an instruction, not a card of the deck — there is nothing
  // server-side to like it on.
  test('a challenge has no heart', async () => {
    await saveLocalGameState(session(3, 1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await screen.findByTestId('local-game-challenge-title');
    expect(screen.queryByTestId('local-game-like')).toBeNull();
    expect(screen.queryByTestId('local-game-like-mirror')).toBeNull();
  });

  // S_polish moved the heart into the card's two corners. It is still ONE like:
  // the screen hands the frame a single state and a single toggle, so the corner
  // the couple happens to reach for cannot matter.
  test('the mirrored heart shows the same state as the first', async () => {
    await saveLocalGameState(likedSession());
    renderScreen();

    expect(await screen.findByTestId('local-game-like')).toHaveTextContent(
      FILLED,
    );
    expect(screen.getByTestId('local-game-like-mirror')).toHaveTextContent(
      FILLED,
    );
  });

  test('tapping the mirrored heart is the same one like', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like-mirror'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );
    // One call, not two — and it reaches the queue on disk exactly as a tap on
    // the other corner would.
    expect(likeQuestion).toHaveBeenCalledTimes(1);
    expect(likeQuestion).toHaveBeenCalledWith('Q1');
    expect(await likedOnDisk('Q1')).toBe(true);
  });

  // Both corners are the same in-flight guard: the pair is one control.
  test('the mirrored heart is dead while a call is in flight', async () => {
    jest.mocked(likeQuestion).mockReturnValue(new Promise(() => {}));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-like'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-like')).toHaveTextContent(FILLED),
    );
    fireEvent.press(screen.getByTestId('local-game-like-mirror'));

    expect(likeQuestion).toHaveBeenCalledTimes(1);
  });
});

// S3c: the map moves WHILE the couple plays. Every transition hands the card to
// the server and clears it from what the session owes; nothing waits for the end
// of the game, and nothing waits for the network.
describe('LocalGameScreen — reporting as they play', () => {
  const pendingOnDisk = async () =>
    (await loadLocalGameState())?.pendingReport;

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
  });

  test('the card is reported the moment the couple leaves it', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1']),
    );
  });

  // The whole point of the buffer: it is on disk BEFORE the request goes out, so
  // a phone that dies mid-request still knows what it owes. The setup screen
  // resends it on the couple's next visit (see its own test).
  test('what is owed is on disk before the request, and stays until confirmed', async () => {
    let finish: (result: { playedTotal: number; newlyPlayed: number }) => void =
      () => {};
    jest
      .mocked(reportPlayedCards)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q1']));

    finish({ playedTotal: 1, newlyPlayed: 1 });

    await waitFor(async () => expect(await pendingOnDisk()).toEqual([]));
    // Played is the session's own count and stays put — the summary reads it.
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']);
  });

  // A game must not turn into a queue of spinners on a bad connection.
  test('the next card is on screen before the server has answered', async () => {
    jest.mocked(reportPlayedCards).mockReturnValue(new Promise(() => {}));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );
    expect(screen.getByTestId('local-game-primary')).toBeEnabled();
  });

  test('a confirmed card is not sent a second time', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledWith(['Q1']));
    fireEvent.press(screen.getByTestId('local-game-skip'));

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledWith(['Q2']));
    expect(reportPlayedCards).toHaveBeenCalledTimes(2);
  });

  // Not a retry loop of its own: the next tap carries the failed card along.
  test('a failed report is retried by the next transition', async () => {
    jest
      .mocked(reportPlayedCards)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ playedTotal: 2, newlyPlayed: 2 });
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q1']));

    fireEvent.press(screen.getByTestId('local-game-skip'));

    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']),
    );
    await waitFor(async () => expect(await pendingOnDisk()).toEqual([]));
  });

  // The endpoint keeps a set, so a resend of something already counted answers
  // newly_played: 0. That is a normal answer, not a failure — the cards are
  // settled either way.
  test('a resend the server had already counted settles just the same', async () => {
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 7, newlyPlayed: 0 });
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    // Owed first (the buffer is written before the request), settled after.
    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q1']));
    await waitFor(async () => expect(await pendingOnDisk()).toEqual([]));
  });

  // A card played while the previous report was in flight is not in the list
  // that went out, so confirming that list must not swallow it.
  test('a card played mid-request stays owed', async () => {
    let finish: (result: { playedTotal: number; newlyPlayed: number }) => void =
      () => {};
    jest
      .mocked(reportPlayedCards)
      .mockReturnValueOnce(new Promise(resolve => (finish = resolve)))
      .mockResolvedValue({ playedTotal: 2, newlyPlayed: 1 });
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q1']));
    // Second card played while the first report is still open.
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await waitFor(async () =>
      expect(await pendingOnDisk()).toEqual(['Q1', 'Q2']),
    );

    finish({ playedTotal: 1, newlyPlayed: 1 });

    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q2']));
  });

  // Two reports racing over the same buffer would win nothing — the endpoint is
  // throttled, and the next transition resends anyway.
  test('a transition during a report does not open a second one', async () => {
    jest.mocked(reportPlayedCards).mockReturnValue(new Promise(() => {}));
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 3?',
      ),
    );

    expect(reportPlayedCards).toHaveBeenCalledTimes(1);
  });

  // A resumed session carries everything it was paused with: the position, the
  // hearts (S3b) and what it still owes.
  test('a resumed session picks up where it stopped, debts included', async () => {
    const paused = {
      ...session(20),
      cursor: 1,
      playedUlids: ['Q1'],
      pendingReport: ['Q1'],
    };
    paused.queue[0] = {
      kind: 'question',
      question: { ...question(1), liked: true },
    };
    await saveLocalGameState(paused);
    renderScreen();

    expect(await screen.findByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 2?',
    );
    // The heart the couple left on the first card is still there in the queue.
    const stored = await loadLocalGameState();
    const first = stored?.queue[0];
    expect(first?.kind === 'question' && first.question.liked).toBe(true);

    fireEvent.press(screen.getByTestId('local-game-skip'));

    // The card it never managed to report goes out with the new one.
    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']),
    );
  });

  // The last card leaves for the summary immediately, so the answer to its report
  // comes back to a screen that is gone. It must not write to the session then:
  // by that point the setup screen may have flushed and cleared it, and a late
  // write would resurrect a finished game on disk. The card stays owed instead,
  // and the setup screen resends it — see its "finished session is flushed and
  // then cleared" test.
  test('an answer landing after the screen is gone writes nothing', async () => {
    let finish: (result: { playedTotal: number; newlyPlayed: number }) => void =
      () => {};
    jest
      .mocked(reportPlayedCards)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(1));
    const view = renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledWith(['Q1']));
    expect(replace).toHaveBeenCalledWith(
      'LocalGameSummary',
      expect.any(Object),
    );
    await waitFor(async () => expect(await pendingOnDisk()).toEqual(['Q1']));

    // What the navigator does on replace, while the request is still open.
    view.unmount();
    finish({ playedTotal: 1, newlyPlayed: 1 });
    await new Promise(resolve => setImmediate(resolve));

    expect(await pendingOnDisk()).toEqual(['Q1']);
  });
});

// The celebration moved onto the card that earns it (S3c). Its ordering is the
// same as P10's — a baseline reading of the map before anything moves it — only
// now the session start provides it instead of a hand-built effect.
describe('LocalGameScreen — celebrating a milestone mid-game', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
  });

  test('a milestone crossed by a played card is celebrated over the game', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    await saveLocalGameState(session(20));
    renderScreen();

    // Baseline in first, then the card that moves the map.
    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('local-game-skip'));

    expect(
      await screen.findByText(pl.celebration.milestoneTitle),
    ).toBeOnTheScreen();
    // Over the game, not instead of it — the next card is right there behind it.
    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 2?',
    );
  });

  test('the modal shows the milestone by name, and closes', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    await saveLocalGameState(session(20));
    renderScreen();

    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await screen.findByText(pl.celebration.milestoneBody('Kamień 10'));

    fireEvent.press(screen.getByTestId('celebration-dismiss'));

    await waitFor(() =>
      expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull(),
    );
  });

  // History is not an achievement: a couple who already had the milestone when
  // they sat down gets nothing, however many cards they play.
  test('milestones already unlocked at the start are never celebrated', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    await saveLocalGameState(session(20));
    renderScreen();

    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());

    expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull();
  });

  // The modal has to survive the card moving on underneath it — a challenge
  // lands on a different layout, and a celebration that vanished with it would
  // be a milestone the couple never saw.
  test('the modal stays up when the transition lands on a challenge', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    // Interval 1: question, challenge, question.
    await saveLocalGameState(session(3, 1));
    renderScreen();

    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('local-game-skip'));

    expect(
      await screen.findByText(pl.celebration.milestoneTitle),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('local-game-challenge-title')).toBeOnTheScreen();
  });
});

// S3d: the last card of a session is reported like any other — fired, not
// awaited — so the couple is on the summary before its answer comes back. The
// milestone it may have earned is therefore celebrated THERE, and what makes
// that possible without celebrating anything twice is the baseline this screen
// hands over when it navigates.
describe('LocalGameScreen — the milestone of the last card', () => {
  // TanStack notifies its observers off a timer, so a resolved fetch is not yet
  // an observed one — and the baseline the screen hands on only exists once the
  // hook has actually seen the map.
  const mapRead = async () => {
    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  const summaryProps = (params: unknown) =>
    ({
      navigation: { popTo, replace, setOptions: jest.fn(), navigate: jest.fn() },
      route: { key: 'S', name: 'LocalGameSummary', params },
    }) as unknown as React.ComponentProps<typeof LocalGameSummaryScreen>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
  });

  // The price of the fix must not be paid by every other session: a last card
  // that earns nothing still leaves the moment it is tapped.
  test('the transition does not wait for the report to answer', async () => {
    jest.mocked(reportPlayedCards).mockReturnValue(new Promise(() => {}));
    await saveLocalGameState(session(1));
    renderScreen();
    await mapRead();

    fireEvent.press(screen.getByTestId('local-game-skip'));

    // Gone, with the report still open behind them.
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary', {
        seenMilestones: [],
      }),
    );
    expect(reportPlayedCards).toHaveBeenCalledWith(['Q1']);
  });

  // The seam itself, played out the way the navigator does it: the game screen
  // is unmounted while its last report is still in flight, and the answer lands
  // in a cache the summary screen then reads.
  test('a milestone earned by the last card is celebrated on the summary', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    let finish: (result: { playedTotal: number; newlyPlayed: number }) => void =
      () => {};
    jest
      .mocked(reportPlayedCards)
      .mockReturnValue(new Promise(resolve => (finish = resolve)));
    await saveLocalGameState(session(1));
    const view = renderScreen();
    await mapRead();

    fireEvent.press(screen.getByTestId('local-game-skip'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const handedOver = replace.mock.calls[0][1];

    view.unmount();
    finish({ playedTotal: 10, newlyPlayed: 1 });
    await act(async () => {
      await new Promise(resolve => setImmediate(resolve));
    });

    // Same client, because that is what the navigator keeps: the invalidation
    // fired by the report of a screen that no longer exists is what the summary
    // picks up.
    renderWithQueryClient(
      <LocalGameSummaryScreen {...summaryProps(handedOver)} />,
      view.queryClient,
    );

    expect(
      await screen.findByText(pl.celebration.milestoneBody('Kamień 10')),
    ).toBeOnTheScreen();
  });

  // The other side of the same coin: what WAS celebrated mid-game travels in the
  // baseline, so the summary cannot celebrate it again.
  test('what was celebrated mid-game travels in the baseline', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    await saveLocalGameState(session(2));
    renderScreen();
    await mapRead();

    // First card: the milestone is celebrated here, on the card that earned it.
    fireEvent.press(screen.getByTestId('local-game-skip'));
    await screen.findByText(pl.celebration.milestoneTitle);
    fireEvent.press(screen.getByTestId('celebration-dismiss'));

    // Last card: it goes on the handover, and the summary skips it.
    fireEvent.press(screen.getByTestId('local-game-skip'));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary', {
        seenMilestones: ['m10'],
      }),
    );
  });

  // Nothing was ever read, so nothing can be told apart: the couple sees the
  // milestone on the map instead of in a modal. Better than congratulating them
  // for a milestone they earned last month.
  test('an unread map hands over no baseline at all', async () => {
    jest.mocked(getProgress).mockReturnValue(new Promise(() => {}));
    await saveLocalGameState(session(1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary', {
        seenMilestones: undefined,
      }),
    );
  });
});

// S2: 14 cards in the deck are answered by picking from a list. The picker is a
// different way of writing the same answer — everything past it (the turn, the
// save, the report) must not be able to tell the difference.
describe('LocalGameScreen — cards answered by picking', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(createLocalMemory).mockResolvedValue({} as Memory);
  });

  test('a choice card shows the options instead of the write toggle', async () => {
    await saveLocalGameState(choiceSession(false));
    renderScreen();

    expect(await screen.findByTestId('local-game-options')).toBeOnTheScreen();
    // Nothing to hide behind a toggle here: picking IS the answer.
    expect(screen.queryByTestId('local-game-write-toggle')).toBeNull();
    expect(screen.queryByTestId('local-game-answer')).toBeNull();
    expect(screen.getByTestId('local-game-options-2')).toHaveTextContent(
      'Przestrzeń',
    );
  });

  test('one choice renders radios, several renders checkboxes', async () => {
    await saveLocalGameState(choiceSession(false));
    const single = renderScreen();
    await screen.findByTestId('local-game-options');

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    single.unmount();

    await saveLocalGameState(choiceSession(true));
    renderScreen();
    await screen.findByTestId('local-game-options');

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  // An open card says whose turn it is in the field's placeholder; a picker has
  // no such place, and two people over one phone were left guessing who picks.
  test('the picker names the player whose turn it is', async () => {
    await saveLocalGameState(choiceSession(false));
    renderScreen();

    expect(
      await screen.findByText(pl.localGame.pickOne('piotr_s')),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('local-game-primary'));

    expect(
      await screen.findByText(pl.localGame.pickOne('Wiktoria')),
    ).toBeOnTheScreen();
  });

  test('a multiple-choice card names the player too', async () => {
    await saveLocalGameState(choiceSession(true));
    renderScreen();

    expect(
      await screen.findByText(pl.localGame.pickMany('piotr_s')),
    ).toBeOnTheScreen();
  });

  test('an open card keeps the write toggle', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(
      await screen.findByTestId('local-game-write-toggle'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('local-game-options')).toBeNull();
  });

  test('the picked option is the answer that gets saved', async () => {
    await saveLocalGameState(choiceSession(false));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-options-0'));
    // Ticked, and read back off the answer rather than off a private copy.
    expect(screen.getByTestId('local-game-options-0')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );

    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    // Player two starts from a blank card, exactly as with a written answer.
    expect(screen.getByTestId('local-game-options-0')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: false }),
    );
    fireEvent.press(screen.getByTestId('local-game-options-2'));
    fireEvent.press(screen.getByTestId('local-game-save'));

    await waitFor(() =>
      expect(createLocalMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          questionUlid: 'Q1',
          answerA: 'Rada',
          answerB: 'Przestrzeń',
        }),
      ),
    );
  });

  test('several picks are saved as one joined answer', async () => {
    await saveLocalGameState(choiceSession(true));
    renderScreen();

    // Tapped out of order; the answer still reads in the card's order.
    fireEvent.press(await screen.findByTestId('local-game-options-2'));
    fireEvent.press(screen.getByTestId('local-game-options-0'));
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    fireEvent.press(screen.getByTestId('local-game-options-1'));
    fireEvent.press(screen.getByTestId('local-game-save'));

    await waitFor(() =>
      expect(createLocalMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          answerA: 'Rada, Przestrzeń',
          answerB: 'Przytulenie',
        }),
      ),
    );
  });

  test('the save stays dead until both have picked', async () => {
    await saveLocalGameState(choiceSession(false));
    renderScreen();

    expect(await screen.findByTestId('local-game-save')).toBeDisabled();

    fireEvent.press(screen.getByTestId('local-game-options-1'));

    expect(screen.getByTestId('local-game-save')).toBeDisabled();
  });
});
