import React from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {RewardsScreen} from '../src/screens/RewardsScreen';
import {getRewards} from '../src/api/rewards';
import type {RootStackParamList} from '../src/navigation/types';
import type {Rewards} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/rewards', () => ({getRewards: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Rewards'>;

const rewards: Rewards = {
  credits: 3,
  shareRewardClaimed: true,
  ratingRewardClaimed: false,
  ads: {remainingToday: 4, dailyCap: 5},
};

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'Rewards', name: 'Rewards', params: undefined},
  } as unknown as Props;
}

describe('RewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRewards).mockResolvedValue(rewards);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('shows the credit balance', async () => {
    renderWithQueryClient(<RewardsScreen {...makeProps()} />);

    expect(await screen.findByTestId('rewards-credits')).toHaveTextContent('3');
  });

  test('shows how many ads are left today', async () => {
    renderWithQueryClient(<RewardsScreen {...makeProps()} />);

    expect(await screen.findByTestId('rewards-ads-today')).toHaveTextContent(
      pl.rewards.adsToday(4, 5),
    );
  });

  // A zero balance is a real state, not a missing one — it must read as 0
  // rather than falling back to the placeholder.
  test('renders a zero balance as zero', async () => {
    jest.mocked(getRewards).mockResolvedValue({...rewards, credits: 0});

    renderWithQueryClient(<RewardsScreen {...makeProps()} />);

    expect(await screen.findByTestId('rewards-credits')).toHaveTextContent('0');
  });

  test('alerts when the balance cannot be loaded', async () => {
    jest.mocked(getRewards).mockRejectedValue(new Error('network'));

    renderWithQueryClient(<RewardsScreen {...makeProps()} />);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.rewards.loadError,
      ),
    );
  });
});
