import React from 'react';
import axios from 'axios';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Share, type AlertButton } from 'react-native';
import * as StoreReview from 'react-native-store-review';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameSetupScreen } from './LocalGameSetupScreen';
import { listCategories } from '../api/categories';
import {
  type DeckExhaustion,
  fetchGameDeck,
  reportPlayedCards,
  resetDeck,
} from '../api/localGame';
import { useAuth } from '../auth/AuthContext';
import { startLocalGame } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { loadPartnerName, savePartnerName } from '../storage/partnerName';
import type { RootStackParamList } from '../navigation/types';
import type { Couple, Question, User } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/categories', () => ({ listCategories: jest.fn() }));
jest.mock('../api/localGame', () => ({
  fetchGameDeck: jest.fn(),
  reportPlayedCards: jest.fn(),
  resetDeck: jest.fn(),
}));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSetup'>;

const user = { nickname: 'piotr_s' } as User;
const couple = { partnerNameLocal: 'Wiktoria' } as Couple;

const categories = [
  {
    slug: 'randka',
    name: 'Randka',
    description: null,
    tone: null,
    premiumOnly: false,
    ordering: 1,
  },
];

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

// The deck endpoint answers with a pool and, when that pool is empty, a reason
// (S4a). Both suites below deal decks through this.
const deck = (questions: Question[], exhaustion: DeckExhaustion | null = null) =>
  ({ questions, exhaustion });

const navigate = jest.fn();
const reset = jest.fn();
const replace = jest.fn();

// The reset's confirmation, answered: the last Alert on screen is the one the
// tap just raised.
const pressResetConfirm = async (alert: jest.SpyInstance) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[] | undefined;
  const confirm = buttons?.find(
    button => button.text === pl.localGame.reset.confirm,
  );
  await act(async () => {
    confirm?.onPress?.();
  });
};

function makeProps(params?: { autoStart?: boolean }): Props {
  return {
    navigation: { navigate, reset, replace, setOptions: jest.fn() },
    route: { key: 'LocalGameSetup', name: 'LocalGameSetup', params },
  } as unknown as Props;
}

const renderScreen = (params?: { autoStart?: boolean }) =>
  renderWithQueryClient(<LocalGameSetupScreen {...makeProps(params)} />);

describe('LocalGameSetupScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    // The mock store outlives the test, and this key now decides what the name
    // field starts with — so a value left by one test would seed the next.
    await savePartnerName('');
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1), question(2)]));
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  test('shows the logged-in nickname as player one, read-only', async () => {
    renderScreen();

    expect(await screen.findByTestId('local-game-player1')).toHaveTextContent(
      'piotr_s',
    );
  });

  test('prefills player two from the couple partner name', async () => {
    renderScreen();

    expect(await screen.findByTestId('local-game-player2')).toHaveProp(
      'value',
      'Wiktoria',
    );
  });

  // Precedence, and the reason for it: the profile field is a statement about
  // the relationship, the remembered name is what was typed into the last game.
  // The more recent explicit act wins, which is also what the web version does.
  test('the name from the last game wins over the couple field', async () => {
    await savePartnerName('Ala');
    renderScreen();

    expect(await screen.findByTestId('local-game-player2')).toHaveProp(
      'value',
      'Ala',
    );
  });

  test('remembers the name once a game is actually dealt', async () => {
    renderScreen();
    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));

    await waitFor(async () => expect(await loadPartnerName()).toBe('Ala'));
  });

  // Written on the deal rather than as they type, so what comes back next time
  // is a name they played a game with — not one they typed and thought better
  // of. A deck that never arrives leaves nothing behind.
  test('remembers nothing when the deal fails', async () => {
    jest.mocked(fetchGameDeck).mockRejectedValue(new Error('offline'));
    renderScreen();
    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));

    await screen.findByTestId('local-game-setup-error');
    expect(await loadPartnerName()).toBeNull();
  });

  test('refuses to start without a name for player two', async () => {
    jest.mocked(useAuth).mockReturnValue({ user, couple: null } as ReturnType<
      typeof useAuth
    >);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2Required);
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('refuses a name past the sixty-character cap', async () => {
    renderScreen();
    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'x'.repeat(61),
    );
    fireEvent.press(screen.getByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2TooLong);
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  // One button, one deck. Before 3D this was two tests — a category and the mix —
  // and with the picker hidden they became the same assertion twice.
  test('starting fetches the whole deck and opens the game', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(navigate).toHaveBeenCalledWith('LocalGame');
  });

  test('starting writes a playable session to disk', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));

    const stored = await loadLocalGameState();
    expect(stored?.player1).toBe('piotr_s');
    expect(stored?.player2).toBe('Wiktoria');
    // The whole deck: with the picker hidden there is no slice to choose, and
    // "no category" was always what the mix meant here.
    expect(stored?.categorySlug).toBeNull();
    expect(stored?.categoryName).toBeNull();
    expect(stored?.queue).toHaveLength(2);
    expect(stored?.cursor).toBe(0);
  });

  // An exhausted category is a success, not a failure — and it must not open a
  // game with nothing in it. With no reason to go on this is all the screen can
  // say; the three reasons that CAN be told apart have their own suite below.
  test('an empty deck with no reason falls back to the neutral message', async () => {
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([]));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(await screen.findByTestId('local-game-setup-error')).toHaveTextContent(
      pl.localGame.deckEmpty,
    );
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(await loadLocalGameState()).toBeNull();
  });

  test('a failed deck fetch surfaces an error and starts nothing', async () => {
    jest.mocked(fetchGameDeck).mockRejectedValue(new Error('network'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(await screen.findByTestId('local-game-setup-error')).toBeOnTheScreen();
    expect(navigate).not.toHaveBeenCalled();
  });
});

// S4b: an empty pool used to look exactly like a failed request — one red line
// in the error slot, saying "pick another category" whether or not there was
// another category to pick. Three reasons, three answers, and the panel is a
// normal state of the game rather than something that went wrong.
describe('LocalGameSetupScreen — an exhausted deck', () => {
  const exhausted = (
    reason: DeckExhaustion['reason'],
    lockedRemaining = 0,
  ) =>
    jest
      .mocked(fetchGameDeck)
      .mockResolvedValue(deck([], { reason, lockedRemaining }));

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  // The tiles below the panel are the action, so the panel does not repeat it.
  test('a spent category sends them back to the tiles, with no CTA', async () => {
    exhausted('other_categories');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.otherCategoriesBody);
    expect(screen.queryByTestId('local-game-exhaustion-cta')).toBeNull();
    // The button is still right there, and nothing was started. This branch is
    // unreachable while the picker is hidden — the whole deck cannot be "empty
    // in this category" — but it is kept because the panel is driven by the
    // server's reason, so it returns by itself the day the picker does.
    expect(screen.getByTestId('local-game-start')).toBeOnTheScreen();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a paywall says so and counts what is behind it', async () => {
    exhausted('locked_available', 12);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.lockedBody);
    expect(
      screen.getByTestId('local-game-exhaustion-remaining'),
    ).toHaveTextContent(pl.localGame.exhaustion.lockedRemaining(12));
  });

  // The one CTA of the three, and it points at the screen that already owns
  // unlocking — cards with "unlock (1 credit)", credits, and the rewards link
  // in its header. Nothing about ads or premium is restated on this panel.
  // 3D. The funnel used to end at the deck, which answers what can be unlocked
  // but not how to afford it. These two have existed since P5 and P6 and had no
  // way in from the moment a couple actually wants them.
  test('the paywall offers the two ways to earn a credit', async () => {
    exhausted('locked_available', 12);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-exhaustion-share'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('local-game-exhaustion-rate')).toBeOnTheScreen();
  });

  // Nothing left to unlock means nothing to earn credits FOR — the same reason
  // this branch has no unlock CTA either. Offering them here would be selling a
  // couple something that does not exist.
  test('a finished deck offers no way to earn, because there is nothing to buy', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await screen.findByTestId('local-game-exhaustion-body');
    expect(screen.queryByTestId('local-game-exhaustion-earn')).toBeNull();
    expect(screen.queryByTestId('local-game-exhaustion-share')).toBeNull();
  });

  // Existing paths, reached from a new place — so what these prove is the
  // wiring, not the behaviour. Both handlers were lifted out of ProfileScreen
  // unchanged in phase I precisely so this commit could be only a wiring.
  test('the earn buttons reach the real share sheet and review prompt', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction } as never);
    exhausted('locked_available', 12);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));
    fireEvent.press(await screen.findByTestId('local-game-exhaustion-share'));
    await waitFor(() => expect(share).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('local-game-exhaustion-rate'));
    await waitFor(() =>
      expect(jest.mocked(StoreReview.requestReview)).toHaveBeenCalled(),
    );
    share.mockRestore();
  });

  test('the paywall CTA hands over to the deck screen', async () => {
    exhausted('locked_available', 3);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));
    fireEvent.press(await screen.findByTestId('local-game-exhaustion-cta'));

    expect(navigate).toHaveBeenCalledWith('Deck');
  });

  // A count of zero would contradict the reason it comes with, so it is left off
  // rather than printed.
  test('a paywall with no count left prints no count', async () => {
    exhausted('locked_available', 0);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await screen.findByTestId('local-game-exhaustion');
    expect(screen.queryByTestId('local-game-exhaustion-remaining')).toBeNull();
    // The way onward still stands: credits are not the only way to unlock.
    expect(screen.getByTestId('local-game-exhaustion-cta')).toBeOnTheScreen();
  });

  // Selling more cards to a couple who has played every one of them would be
  // selling something that does not exist.
  test('a finished deck celebrates and offers nothing to unlock', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.completeBody);
    expect(screen.queryByTestId('local-game-exhaustion-cta')).toBeNull();
    expect(screen.queryByTestId('local-game-exhaustion-remaining')).toBeNull();
  });

  // The two channels stay apart: this is a state of the game, not a failure, so
  // it does not land in the slot that says something went wrong.
  test('exhaustion does not show up as an error', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await screen.findByTestId('local-game-exhaustion');
    expect(screen.queryByTestId('local-game-setup-error')).toBeNull();
  });

  // A deck played to the end has one thing left to offer: the same "od nowa" as
  // the summary, behind the same confirmation.
  test('a finished deck offers to play it again from the start', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(resetDeck).mockResolvedValue(undefined);
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));
    fireEvent.press(await screen.findByTestId('local-game-exhaustion-reset'));

    expect(alert).toHaveBeenCalledWith(
      pl.localGame.reset.confirmTitle,
      pl.localGame.reset.confirmMessage,
      expect.any(Array),
    );
    expect(resetDeck).not.toHaveBeenCalled();

    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    await pressResetConfirm(alert);

    // Straight into the game from here: no trip through another screen.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(resetDeck).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // Closed cards are the paid content; the free ones coming back right beside
  // "unlock" would undercut it.
  test('a paywall offers no reset', async () => {
    exhausted('locked_available', 12);
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await screen.findByTestId('local-game-exhaustion');
    expect(screen.queryByTestId('local-game-exhaustion-reset')).toBeNull();
  });

  // Otherwise the answer to the previous tap would stand over the next one.
  test('the panel is cleared by the next attempt', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));
    await screen.findByTestId('local-game-exhaustion');

    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    fireEvent.press(screen.getByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
  });

  // A deck with cards in it is untouched by any of this — no panel, and the game
  // opens exactly as it did before S4b.
  test('a deck with cards opens the game and shows no panel', async () => {
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
    expect(await loadLocalGameState()).not.toBeNull();
  });
});

describe('LocalGameSetupScreen — a paused game', () => {
  const paused = (
    categorySlug: string | null = 'randka',
    categoryName: string | null = 'Randka',
  ) =>
    startLocalGame({
      player1: 'piotr_s',
      player2: 'Wiktoria',
      categorySlug,
      categoryName,
      questions: [question(1), question(2), question(3)],
      challenges: [],
      startedAt: '2026-08-05T18:00:00.000Z',
    });

  // There is one slot for a local game, so starting a different one ends the
  // paused one — and that now asks first. Every "deals a fresh deck" path in
  // this suite goes through the warning; these two helpers answer it, and the
  // warning itself is tested further down.
  let alert: jest.SpyInstance;

  const overwriteButtons = () =>
    alert.mock.calls.at(-1)?.[2] as AlertButton[] | undefined;

  const confirmOverwrite = async () => {
    const confirm = overwriteButtons()?.find(
      button => button.text === pl.localGame.overwriteConfirm,
    );
    await act(async () => {
      confirm?.onPress?.();
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    // The remembered partner name outlives the test (the mock store lives for
    // the module registry), and it decides what the form starts with — so a
    // name left by an earlier suite would silently change which setup this one
    // is comparing against.
    await savePartnerName('');
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    jest.mocked(resetDeck).mockResolvedValue(undefined);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  // The category is on the card because there is one slot: this line is the only
  // place the couple can see WHICH game is waiting for them.
  test('offers to resume, naming the partner, the category and the position', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(
      pl.localGame.resumeSummary('Wiktoria', 'Randka', 1, 3),
    );
  });

  test('a mixed deck is named as one', async () => {
    await saveLocalGameState(paused(null, null));
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(
      pl.localGame.resumeSummary('Wiktoria', pl.localGame.resumeMix, 1, 3),
    );
  });

  // A session dealt before the name was recorded: the slug is a poor name, and
  // still better than dropping the line that says what is waiting.
  test('a session with no recorded name falls back to its slug', async () => {
    await saveLocalGameState(paused('randka', null));
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(pl.localGame.resumeSummary('Wiktoria', 'randka', 1, 3));
  });

  test('resuming opens the game without dealing a new deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-resume-button'));

    expect(navigate).toHaveBeenCalledWith('LocalGame');
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  // "Od nowa" is the full deck here too, so it asks first — a couple who only
  // meant to drop the paused game learns from the confirmation that it does more.
  test('starting over asks before it does anything', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-restart'));

    expect(alert).toHaveBeenCalledWith(
      pl.localGame.reset.confirmTitle,
      pl.localGame.reset.confirmMessage,
      expect.any(Array),
    );
    expect(resetDeck).not.toHaveBeenCalled();
    expect(await loadLocalGameState()).not.toBeNull();
  });

  test('cancelling the reset leaves the paused game where it was', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-restart'));

    const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
    const cancel = buttons.find(b => b.text === pl.localGame.reset.cancel);
    expect(cancel?.style).toBe('cancel');
    expect(cancel?.onPress).toBeUndefined();
    expect(screen.getByTestId('local-game-resume')).toBeOnTheScreen();
  });

  // The class of bug that has twice eaten a couple's progress: a paused game
  // outliving the deck it was dealt from, and resuming with that old queue.
  // After a reset here the game starts in place — dealt fresh from the full deck
  // on the names in the form, never the old queue picked back up — and the only
  // navigation is into the game.
  test('after a reset the game opens in place on the full deck', async () => {
    const full = [question(1), question(2), question(3), question(4)];
    jest.mocked(fetchGameDeck).mockResolvedValue(deck(full));
    await saveLocalGameState(paused());
    renderScreen();

    // What the couple has in the field wins — not the remembered name.
    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-restart'));
    await pressResetConfirm(alert);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(fetchGameDeck).toHaveBeenCalledTimes(1);
    const dealt = await loadLocalGameState();
    expect(dealt?.player2).toBe('Ala');
    expect(dealt?.cursor).toBe(0);
    expect(
      dealt?.queue.filter(item => item.kind === 'question'),
    ).toHaveLength(full.length);
    // The game's own card count says the reset worked; no toast over it.
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  // The same validation as a tap: a name that does not pass keeps the couple
  // here, with the field's own message and a word that the reset did happen.
  test('after a reset with no usable name it stays on the setup', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(await screen.findByTestId('local-game-player2'), '');
    fireEvent.press(screen.getByTestId('local-game-restart'));
    await pressResetConfirm(alert);

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2Required);
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      pl.localGame.reset.done,
    );
    // The old game is gone either way: the reset went through.
    expect(screen.queryByTestId('local-game-resume')).toBeNull();
    expect(await loadLocalGameState()).toBeNull();
  });

  // From the summary the couple arrives here only to be dealt a game. The setup
  // hands its place to the game, so it does not stay on the stack beneath it.
  test('entered to start after a reset, it replaces itself with the game', async () => {
    const full = [question(1), question(2), question(3)];
    jest.mocked(fetchGameDeck).mockResolvedValue(deck(full));
    await savePartnerName('Wiktoria');
    renderScreen({ autoStart: true });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('LocalGame'));
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(fetchGameDeck).toHaveBeenCalledTimes(1);
    expect(
      (await loadLocalGameState())?.queue.filter(i => i.kind === 'question'),
    ).toHaveLength(full.length);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  // Nothing of the form shows while that start runs: the couple sees the game
  // arrive, not the setup flash up under it.
  test('entered to start, it shows no form while the game is dealt', async () => {
    jest.mocked(fetchGameDeck).mockReturnValue(new Promise(() => {}));
    await savePartnerName('Wiktoria');
    renderScreen({ autoStart: true });

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalled());
    expect(screen.queryByTestId('local-game-start')).toBeNull();
  });

  test('entered to start with no usable name, it shows the form and stays', async () => {
    jest.mocked(useAuth).mockReturnValue({
      user,
      couple: { partnerNameLocal: null },
    } as ReturnType<typeof useAuth>);
    renderScreen({ autoStart: true });

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2Required);
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('local-game-start')).toBeOnTheScreen();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      pl.localGame.reset.done,
    );
  });

  test('entered to start, a deck that does not come keeps them on the setup', async () => {
    jest.mocked(fetchGameDeck).mockRejectedValue(new Error('offline'));
    await savePartnerName('Wiktoria');
    renderScreen({ autoStart: true });

    expect(
      await screen.findByTestId('local-game-setup-error'),
    ).toHaveTextContent(pl.localGame.deckError);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      pl.localGame.reset.done,
    );
  });

  // Only a reset sends the param; a plain visit waits for the tap as it always has.
  test('a plain visit does not start the game by itself', async () => {
    await savePartnerName('Wiktoria');
    renderScreen();

    await screen.findByTestId('local-game-start');
    await new Promise(resolve => setImmediate(resolve));
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a 429 says so and keeps the paused game', async () => {
    jest
      .mocked(resetDeck)
      .mockRejectedValue({ isAxiosError: true, response: { status: 429 } });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-restart'));
    await pressResetConfirm(alert);

    expect(
      await screen.findByTestId('local-game-setup-error'),
    ).toHaveTextContent(pl.localGame.reset.tooManyAttempts);
    expect(reset).not.toHaveBeenCalled();
    // Nothing starts on a failed reset.
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(await loadLocalGameState()).not.toBeNull();
    expect(screen.getByTestId('local-game-resume')).toBeOnTheScreen();
  });

  // The demo's guard, and the reason it matters: dealing a fresh deck here would
  // silently drop the cards already played but not yet reported.
  test('the same setup picks the paused game up rather than redealing', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('the same setup is picked up without a warning', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(alert).not.toHaveBeenCalled();
  });

  // One slot: this deal ends the paused game, and nothing on a category tile
  // says so. Asking is the only alternative to a second slot.
  // Since 3D the category is no longer part of the setup, so a different setup
  // means one thing: a different partner. The decision this guards — resume the
  // paused game, or deal over it — did not change, only the axis it turns on.
  test('a different setup warns before it overwrites the paused game', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        pl.localGame.overwriteTitle,
        pl.localGame.overwriteMessage,
        expect.any(Array),
      ),
    );
    // Nothing has happened yet — the deck is dealt on the answer, not on the
    // question.
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect((await loadLocalGameState())?.categorySlug).toBe('randka');
  });

  test('cancelling the warning leaves the paused game where it was', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));
    await waitFor(() => expect(alert).toHaveBeenCalled());

    // The cancel button carries no action at all: dismissing IS doing nothing.
    const cancel = overwriteButtons()?.find(
      button => button.text === pl.localGame.overwriteCancel,
    );
    expect(cancel?.style).toBe('cancel');
    expect(cancel?.onPress).toBeUndefined();

    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect((await loadLocalGameState())?.categorySlug).toBe('randka');
    expect(screen.getByTestId('local-game-resume')).toBeOnTheScreen();
  });

  test('confirming the warning deals the new game over the old one', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(navigate).toHaveBeenCalledWith('LocalGame');
    expect((await loadLocalGameState())?.categorySlug).toBeNull();
  });

  // Abandoning a paused game must not drop what it still owes the map. The mount
  // flush failed (offline, say), so the cards are still on disk when the couple
  // confirms: they go out first, and only then does the new deal replace them.
  test('confirming sends the paused game\'s owed cards before dealing', async () => {
    await saveLocalGameState({
      ...paused(),
      playedUlids: ['Q1'],
      pendingReport: ['Q1'],
    });
    jest
      .mocked(reportPlayedCards)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ playedTotal: 1, newlyPlayed: 1 });
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(reportPlayedCards).toHaveBeenCalledTimes(2);
    expect(
      jest.mocked(reportPlayedCards).mock.invocationCallOrder[1],
    ).toBeLessThan(jest.mocked(fetchGameDeck).mock.invocationCallOrder[0]);
    expect((await loadLocalGameState())?.player2).toBe('Ala');
  });

  test('owed cards that still cannot be sent keep the paused game', async () => {
    await saveLocalGameState({
      ...paused(),
      playedUlids: ['Q1'],
      pendingReport: ['Q1'],
    });
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('offline'));
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    expect(
      await screen.findByTestId('local-game-setup-error'),
    ).toHaveTextContent(pl.localGame.owedReportError);
    expect(fetchGameDeck).not.toHaveBeenCalled();
    const kept = await loadLocalGameState();
    expect(kept?.player2).toBe('Wiktoria');
    expect(kept?.pendingReport).toEqual(['Q1']);
  });

  test('a different partner deals a fresh deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('local-game-start'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect((await loadLocalGameState())?.player2).toBe('Ala');
  });

  // The safety net for the live report (S3c): the app was killed between playing
  // a card and the answer coming back, so the card is still owed. This runs on
  // mount — before the couple can tap a category and overwrite the buffer.
  test('an interrupted session resends what it still owes, on entry', async () => {
    const interrupted = {
      ...paused(),
      playedUlids: ['Q1', 'Q2'],
      pendingReport: ['Q1', 'Q2'],
    };
    await saveLocalGameState(interrupted);
    renderScreen();

    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']),
    );
    // Still resumable — flushing is not finishing.
    expect(await screen.findByTestId('local-game-resume')).toBeOnTheScreen();
    expect(await loadLocalGameState()).not.toBeNull();
  });

  // Once the server has them, the resumed session must not carry them into its
  // next transition and send them again.
  test('a landed flush settles the buffer on disk', async () => {
    const interrupted = {
      ...paused(),
      playedUlids: ['Q1', 'Q2'],
      pendingReport: ['Q1', 'Q2'],
    };
    await saveLocalGameState(interrupted);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
    await waitFor(async () =>
      expect((await loadLocalGameState())?.pendingReport).toEqual([]),
    );
    // Played is the session's own count and stays as it was.
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1', 'Q2']);
  });

  // The usual case since S3c: the cards went out as they were played.
  test('a session that owes nothing reports nothing', async () => {
    await saveLocalGameState({ ...paused(), playedUlids: ['Q1'] });
    renderScreen();

    await screen.findByTestId('local-game-resume');
    expect(reportPlayedCards).not.toHaveBeenCalled();
  });

  // The last card of a session: its report was still in flight when the game
  // screen went away, so nothing confirmed it. This is where it lands.
  test('a finished session is flushed and then cleared', async () => {
    const finished = {
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1', 'Q2', 'Q3'],
      pendingReport: ['Q3'],
    };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledWith(['Q3']));
    await waitFor(async () => expect(await loadLocalGameState()).toBeNull());
    expect(screen.queryByTestId('local-game-resume')).toBeNull();
  });

  test('a failed flush keeps the buffer for the next visit', async () => {
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('network'));
    const finished = {
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1'],
      pendingReport: ['Q1'],
    };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
    expect((await loadLocalGameState())?.pendingReport).toEqual(['Q1']);
  });

  // The upgrade case, and the reason the setup passes the STORED slug to
  // matchesSetup rather than the null it now deals with.
  //
  // A couple paused a game before the picker was hidden, so their session
  // carries a category. Comparing it against null would fail the guard, warn
  // them that starting will end the game they were trying to resume, and then
  // end it. Nothing on screen would say what had happened.
  test('a game paused with a category still resumes, without a warning', async () => {
    await saveLocalGameState(paused('randka', 'Randka'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(alert).not.toHaveBeenCalled();
    expect(fetchGameDeck).not.toHaveBeenCalled();
    // Still on disk, still carrying its category.
    expect((await loadLocalGameState())?.categorySlug).toBe('randka');
  });

  // A finished session is not a paused one: the mount effect clears it, so
  // nothing is offered back and nothing is at risk of being overwritten.
  test('a finished session neither offers a resume nor warns', async () => {
    await saveLocalGameState({
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1', 'Q2', 'Q3'],
      pendingReport: [],
    });
    renderScreen();

    const mix = await screen.findByTestId('local-game-start');
    await waitFor(() => expect(screen.queryByTestId('local-game-resume')).toBeNull());

    fireEvent.press(mix);

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(alert).not.toHaveBeenCalled();
  });
});
