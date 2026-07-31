import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {RewardsScreen} from '../src/screens/RewardsScreen';
import {getRewards} from '../src/api/rewards';
import {redeemCode} from '../src/api/premium';
import type {RootStackParamList} from '../src/navigation/types';
import type {Rewards} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/rewards', () => ({getRewards: jest.fn()}));
jest.mock('../src/api/premium', () => ({redeemCode: jest.fn()}));

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

  describe('redeeming a promo code', () => {
    const typeCode = (value: string) =>
      fireEvent.changeText(screen.getByTestId('rewards-code'), value);

    test('sends the code and confirms, clearing the field', async () => {
      jest.mocked(redeemCode).mockResolvedValue(undefined);

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      typeCode('JAITY-TEST');
      fireEvent.press(screen.getByTestId('rewards-code-submit'));

      await waitFor(() => expect(redeemCode).toHaveBeenCalledWith('JAITY-TEST'));
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.rewards.codeRedeemed,
      );
      await waitFor(() =>
        expect(screen.getByTestId('rewards-code')).toHaveDisplayValue(''),
      );
    });

    test('trims surrounding whitespace before sending', async () => {
      jest.mocked(redeemCode).mockResolvedValue(undefined);

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      typeCode('  JAITY-TEST  ');
      fireEvent.press(screen.getByTestId('rewards-code-submit'));

      await waitFor(() => expect(redeemCode).toHaveBeenCalledWith('JAITY-TEST'));
    });

    test('refuses an empty code without calling the API', async () => {
      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      fireEvent.press(screen.getByTestId('rewards-code-submit'));

      expect(
        await screen.findByTestId('rewards-code-error'),
      ).toHaveTextContent(pl.rewards.codeEmpty);
      expect(redeemCode).not.toHaveBeenCalled();
    });

    test('shows the server reason for an invalid code (422)', async () => {
      jest.mocked(redeemCode).mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message: 'Ten kod wygasł.',
            errors: {code: ['Ten kod wygasł.']},
          },
        },
      });
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      typeCode('WYGASLY');
      fireEvent.press(screen.getByTestId('rewards-code-submit'));

      expect(
        await screen.findByTestId('rewards-code-error'),
      ).toHaveTextContent('Ten kod wygasł.');
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    // 409 used to fall through parseApiError into the generic fallback, which
    // made "already redeemed" read like a connection failure.
    test('shows the server reason for an already redeemed code (409)', async () => {
      jest.mocked(redeemCode).mockRejectedValueOnce({
        response: {
          status: 409,
          data: {message: 'Ten kod został już zrealizowany.'},
        },
      });
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      typeCode('JAITY-TEST');
      fireEvent.press(screen.getByTestId('rewards-code-submit'));

      expect(
        await screen.findByTestId('rewards-code-error'),
      ).toHaveTextContent('Ten kod został już zrealizowany.');
    });

    test('clears the error as soon as the user edits the code', async () => {
      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      await screen.findByTestId('rewards-code');

      fireEvent.press(screen.getByTestId('rewards-code-submit'));
      await screen.findByTestId('rewards-code-error');

      typeCode('J');

      await waitFor(() =>
        expect(screen.queryByTestId('rewards-code-error')).toBeNull(),
      );
    });
  });
});
