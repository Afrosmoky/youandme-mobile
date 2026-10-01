import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  CommonActions,
  StackActions,
  StackRouter,
} from '@react-navigation/routers';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { EarnCreditsActions } from './EarnCreditsActions';
import { getRewards } from '../api/rewards';
import { getDeck } from '../api/deck';
import type { Deck, Rewards } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/rewards', () => ({ getRewards: jest.fn() }));
jest.mock('../api/deck', () => ({ getDeck: jest.fn(), unlockQuestion: jest.fn() }));

// The navigation the link uses, recorded as calls — which method, which
// arguments — so the test can replay them through the REAL stack router below.
// Recording rather than asserting the call is the point: popTo('Deck') once
// passed a "calls popTo" test while it replaced the screen it came from.
type NavigationCall = { method: 'navigate' | 'popTo' | 'push'; args: unknown[] };
const mockCalls: NavigationCall[] = [];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockCalls.push({ method: 'navigate', args }),
    popTo: (...args: unknown[]) => mockCalls.push({ method: 'popTo', args }),
    push: (...args: unknown[]) => mockCalls.push({ method: 'push', args }),
  }),
}));

const ROUTE_NAMES = [
  'Home',
  'LocalGameSetup',
  'LocalGameSummary',
  'Profile',
  'Deck',
  'Rewards',
];
const router = StackRouter({});
const routerOptions = {
  routeNames: ROUTE_NAMES,
  routeParamList: {},
  routeGetIdList: {},
};

// A stack of these screens, top last, as the navigator would hold it.
const stackOf = (names: string[]) =>
  router.getRehydratedState(
    { index: names.length - 1, routes: names.map(name => ({ name })) },
    routerOptions,
  );

// The recorded call, turned into the action React Navigation would dispatch
// for it, and applied to the stack. Returns the screens left, bottom first.
const replay = (names: string[], call: NavigationCall): string[] => {
  const [name, params, options] = call.args as [
    string,
    object | undefined,
    { merge?: boolean; pop?: boolean } | undefined,
  ];
  const action =
    call.method === 'navigate'
      ? CommonActions.navigate(name, params, options)
      : call.method === 'popTo'
      ? StackActions.popTo(name, params)
      : StackActions.push(name, params);
  const next = router.getStateForAction(stackOf(names), action, routerOptions);
  if (next === null) {
    return names;
  }
  return next.routes.map(route => route.name);
};

const rewards = (overrides: Partial<Rewards> = {}): Rewards => ({
  credits: 0,
  shareRewardClaimed: false,
  ratingRewardClaimed: false,
  ads: { remainingToday: 0, dailyCap: 0 },
  ...overrides,
});

const deck = (lockedTotal = 40, unlockedCount = 0): Deck => ({
  lockedTotal,
  unlockedCount,
  complete: unlockedCount >= lockedTotal,
  cards: [],
});

const renderActions = (unlockLink?: boolean) =>
  renderWithQueryClient(
    <EarnCreditsActions testID="earn" unlockLink={unlockLink} />,
  );

describe('EarnCreditsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalls.length = 0;
    jest.mocked(getRewards).mockResolvedValue(rewards());
    jest.mocked(getDeck).mockResolvedValue(deck());
  });

  // The two reads land a tick apart, and a test that has seen what it needs can
  // end between them. Settle them inside act before the screen is unmounted.
  afterEach(async () => {
    // setTimeout, not setImmediate: TanStack batches its notifications on a
    // zero timeout, which a setImmediate can run ahead of.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  test('says what each way of earning gives', async () => {
    renderActions();

    expect(await screen.findByTestId('earn-share-gain')).toHaveTextContent(
      pl.earn.gain(5),
    );
    expect(screen.getByTestId('earn-rate-gain')).toHaveTextContent(
      pl.earn.gain(5),
    );
  });

  test('a reward already taken reads as taken', async () => {
    jest
      .mocked(getRewards)
      .mockResolvedValue(rewards({ shareRewardClaimed: true, credits: 5 }));
    renderActions();

    expect(await screen.findByTestId('earn-share-gain')).toHaveTextContent(
      pl.earn.claimed,
    );
    expect(screen.getByTestId('earn-rate-gain')).toHaveTextContent(
      pl.earn.gain(5),
    );
  });

  // Never a stand-in number: before the data arrives there is none.
  test('while loading, the buttons stand alone', async () => {
    jest.mocked(getRewards).mockReturnValue(new Promise(() => {}));
    renderActions();

    expect(await screen.findByTestId('earn-share')).toBeOnTheScreen();
    expect(screen.queryByTestId('earn-share-gain')).toBeNull();
    expect(screen.queryByTestId('earn-rate-gain')).toBeNull();
    expect(screen.queryByTestId('earn-unlock')).toBeNull();
  });

  test('if the deck cannot be read, the buttons stand alone', async () => {
    jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
    jest.mocked(getDeck).mockRejectedValue(new Error('offline'));
    renderActions();

    await waitFor(() => expect(getDeck).toHaveBeenCalled());
    // Let the remaining query settle inside act, so nothing updates after.
    // setTimeout, not setImmediate: TanStack batches its notifications on a
    // zero timeout, which a setImmediate can run ahead of.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByTestId('earn-share')).toBeOnTheScreen();
    expect(screen.queryByTestId('earn-share-gain')).toBeNull();
    expect(screen.queryByTestId('earn-unlock')).toBeNull();
  });

  // The gap this closes: cards earned here open only on the deck screen.
  test('with a balance, it offers the way to the deck', async () => {
    jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
    renderActions();

    expect(await screen.findByTestId('earn-unlock')).toHaveTextContent(
      pl.earn.unlockLink(5),
    );
  });

  // Where the link leaves the couple, from each screen that shows it — checked
  // on the stack the real router produces, not on which method was called.
  describe('where the link leads', () => {
    const pressLink = async () => {
      jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
      renderActions();
      fireEvent.press(await screen.findByTestId('earn-unlock'));
      expect(mockCalls).toHaveLength(1);
      return mockCalls[0];
    };

    // The case popTo got wrong: no deck on the stack, and the summary must
    // still be there to go back to — not the stale setup screen beneath it.
    test('from the game summary, the deck opens on top of it', async () => {
      const call = await pressLink();

      expect(
        replay(['Home', 'LocalGameSetup', 'LocalGameSummary'], call),
      ).toEqual(['Home', 'LocalGameSetup', 'LocalGameSummary', 'Deck']);
    });

    test('from the profile, back from the deck is the profile', async () => {
      const call = await pressLink();

      expect(replay(['Home', 'Profile'], call)).toEqual([
        'Home',
        'Profile',
        'Deck',
      ]);
    });

    // The rewards screen is opened from the deck: go back to that one rather
    // than stacking a second deck on top.
    test('from the rewards screen, it returns to the deck beneath', async () => {
      const call = await pressLink();

      expect(replay(['Home', 'Deck', 'Rewards'], call)).toEqual([
        'Home',
        'Deck',
      ]);
    });
  });

  test('with no balance there is no way to the deck', async () => {
    renderActions();

    await screen.findByTestId('earn-share-gain');
    expect(screen.queryByTestId('earn-unlock')).toBeNull();
  });

  // Nothing left to unlock: no promise of cards, no way in to a deck that has
  // nothing to open, whatever the balance says.
  test('a fully unlocked deck promises nothing', async () => {
    jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
    jest.mocked(getDeck).mockResolvedValue(deck(40, 40));
    renderActions();

    await waitFor(() => expect(getDeck).toHaveBeenCalled());
    // Let the remaining query settle inside act, so nothing updates after.
    // setTimeout, not setImmediate: TanStack batches its notifications on a
    // zero timeout, which a setImmediate can run ahead of.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId('earn-share-gain')).toBeNull();
    expect(screen.queryByTestId('earn-rate-gain')).toBeNull();
    expect(screen.queryByTestId('earn-unlock')).toBeNull();
  });

  test('the link can be left off where the screen has its own', async () => {
    jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
    renderActions(false);

    await screen.findByTestId('earn-share-gain');
    expect(screen.queryByTestId('earn-unlock')).toBeNull();
  });
});

describe('card counts in Polish', () => {
  test.each([
    [1, '+1 karta'],
    [2, '+2 karty'],
    [4, '+4 karty'],
    [5, '+5 kart'],
    [12, '+12 kart'],
    [14, '+14 kart'],
    [22, '+22 karty'],
    [25, '+25 kart'],
  ])('%i', (count, text) => {
    expect(pl.earn.gain(count)).toBe(text);
  });
});
