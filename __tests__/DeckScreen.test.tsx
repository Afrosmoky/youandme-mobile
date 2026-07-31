import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {DeckScreen} from '../src/screens/DeckScreen';
import {getDeck, unlockQuestion} from '../src/api/deck';
import {getRewards} from '../src/api/rewards';
import type {RootStackParamList} from '../src/navigation/types';
import type {Deck, Rewards} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/deck', () => ({
  getDeck: jest.fn(),
  unlockQuestion: jest.fn(),
}));
jest.mock('../src/api/rewards', () => ({getRewards: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Deck'>;

const deck: Deck = {
  lockedTotal: 40,
  unlockedCount: 1,
  complete: false,
  cards: [
    {
      ulid: 'q_01',
      category: {slug: 'na_poznanie', name: 'Na poznanie'},
      unlocked: true,
    },
    {
      ulid: 'q_02',
      category: {slug: 'na_poznanie', name: 'Na poznanie'},
      unlocked: false,
    },
  ],
};

const rewards: Rewards = {
  credits: 2,
  shareRewardClaimed: false,
  ratingRewardClaimed: false,
  ads: {remainingToday: 5, dailyCap: 5},
};

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'Deck', name: 'Deck', params: undefined},
  } as unknown as Props;
}

describe('DeckScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDeck).mockResolvedValue(deck);
    jest.mocked(getRewards).mockResolvedValue(rewards);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('lists the deck with a state badge per card and shows progress', async () => {
    renderWithQueryClient(<DeckScreen {...makeProps()} />);

    expect(await screen.findByTestId('deck-progress')).toHaveTextContent(
      pl.deck.progress(1, 40),
    );
    expect(screen.getByTestId('deck-state-q_01')).toHaveTextContent(
      pl.deck.unlockedBadge,
    );
    expect(screen.getByTestId('deck-state-q_02')).toHaveTextContent(
      pl.deck.lockedBadge,
    );
  });

  // The listing must never carry question text: a locked card would be leaking
  // exactly what the credit is supposed to buy.
  test('offers unlock only on locked cards and shows no question text', async () => {
    renderWithQueryClient(<DeckScreen {...makeProps()} />);

    expect(await screen.findByTestId('deck-unlock-q_02')).toBeOnTheScreen();
    expect(screen.queryByTestId('deck-unlock-q_01')).toBeNull();
    expect(screen.getAllByText(pl.deck.hiddenBody)).toHaveLength(2);
  });

  test('shows the credit balance next to the deck', async () => {
    renderWithQueryClient(<DeckScreen {...makeProps()} />);

    expect(await screen.findByTestId('deck-credits')).toHaveTextContent(
      `${pl.rewards.creditsLabel}: 2`,
    );
  });

  // The whole point of decision 3: the unlock response carries the new balance
  // and the new deck, so the screen updates without a second read.
  test('unlocking opens the card and drops the balance without refetching', async () => {
    jest.mocked(unlockQuestion).mockResolvedValue({
      credits: 1,
      deck: {
        ...deck,
        unlockedCount: 2,
        cards: deck.cards.map(card => ({...card, unlocked: true})),
      },
    });

    renderWithQueryClient(<DeckScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('deck-unlock-q_02'));

    await waitFor(() => expect(unlockQuestion).toHaveBeenCalledWith('q_02'));
    await waitFor(() =>
      expect(screen.getByTestId('deck-state-q_02')).toHaveTextContent(
        pl.deck.unlockedBadge,
      ),
    );
    expect(screen.getByTestId('deck-credits')).toHaveTextContent(
      `${pl.rewards.creditsLabel}: 1`,
    );
    expect(screen.queryByTestId('deck-unlock-q_02')).toBeNull();
    // One initial load each, and no follow-up read after the mutation.
    expect(getDeck).toHaveBeenCalledTimes(1);
    expect(getRewards).toHaveBeenCalledTimes(1);
  });

  test('a rejected unlock shows the server reason and leaves the deck alone', async () => {
    jest.mocked(unlockQuestion).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {message: 'Za mało kredytów.'},
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<DeckScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('deck-unlock-q_02'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        'Za mało kredytów.',
      ),
    );
    expect(screen.getByTestId('deck-state-q_02')).toHaveTextContent(
      pl.deck.lockedBadge,
    );
  });

  test('disables unlocking at a zero balance', async () => {
    jest.mocked(getRewards).mockResolvedValue({...rewards, credits: 0});

    renderWithQueryClient(<DeckScreen {...makeProps()} />);

    await waitFor(() =>
      expect(screen.getByTestId('deck-credits')).toHaveTextContent(
        `${pl.rewards.creditsLabel}: 0`,
      ),
    );
    expect(screen.getByTestId('deck-unlock-q_02')).toBeDisabled();
  });

  test('announces a complete deck', async () => {
    jest.mocked(getDeck).mockResolvedValue({
      ...deck,
      unlockedCount: 40,
      complete: true,
      cards: deck.cards.map(card => ({...card, unlocked: true})),
    });

    renderWithQueryClient(<DeckScreen {...makeProps()} />);

    expect(await screen.findByTestId('deck-complete')).toHaveTextContent(
      pl.deck.complete,
    );
  });
});
