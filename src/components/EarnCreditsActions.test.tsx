import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { EarnCreditsActions } from './EarnCreditsActions';
import { getRewards } from '../api/rewards';
import { getDeck } from '../api/deck';
import type { Deck, Rewards } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/rewards', () => ({ getRewards: jest.fn() }));
jest.mock('../api/deck', () => ({ getDeck: jest.fn(), unlockQuestion: jest.fn() }));

const mockPopTo = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ popTo: mockPopTo, navigate: jest.fn() }),
}));

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
  test('with a balance, it leads to the deck to unlock them', async () => {
    jest.mocked(getRewards).mockResolvedValue(rewards({ credits: 5 }));
    renderActions();

    const link = await screen.findByTestId('earn-unlock');
    expect(link).toHaveTextContent(pl.earn.unlockLink(5));

    fireEvent.press(link);
    expect(mockPopTo).toHaveBeenCalledWith('Deck');
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
