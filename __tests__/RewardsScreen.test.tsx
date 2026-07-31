import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {RewardsScreen} from '../src/screens/RewardsScreen';
import {getRewards} from '../src/api/rewards';
import {redeemCode} from '../src/api/premium';
import {requestAdRewardNonce} from '../src/api/ads';
import {showRewardedAd} from '../src/ads/rewardedAd';
import type {RootStackParamList} from '../src/navigation/types';
import type {Rewards} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/rewards', () => ({getRewards: jest.fn()}));
jest.mock('../src/api/premium', () => ({redeemCode: jest.fn()}));
jest.mock('../src/api/ads', () => ({requestAdRewardNonce: jest.fn()}));
jest.mock('../src/ads/rewardedAd', () => ({showRewardedAd: jest.fn()}));

// The ad section is gated on a build-time constant, so the tests need to see it
// both ways: shipped-today (off) and ready-for-launch (on). A getter keeps the
// binding live, since babel reads the named import at each use site.
let mockAdRewardEnabled = false;
jest.mock('../src/config/features', () => ({
  get AD_REWARD_ENABLED() {
    return mockAdRewardEnabled;
  },
}));

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
    mockAdRewardEnabled = false;
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

  // What actually ships today: the ad path is written and covered below, but a
  // build without a public SSV callback URL must not offer it, because the
  // credit it promises would never arrive.
  test('hides the ad section while SSV is not live', async () => {
    renderWithQueryClient(<RewardsScreen {...makeProps()} />);
    await screen.findByTestId('rewards-credits');

    expect(screen.queryByTestId('rewards-ad-section')).toBeNull();
    expect(screen.queryByTestId('rewards-watch-ad')).toBeNull();
  });

  describe('watching an ad for a credit (flag on)', () => {
    beforeEach(() => {
      mockAdRewardEnabled = true;
      jest.mocked(requestAdRewardNonce).mockResolvedValue('n_abc123');
    });

    test('fetches a nonce and hands it to the ad', async () => {
      jest.mocked(showRewardedAd).mockResolvedValue('earned');

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));

      await waitFor(() => expect(requestAdRewardNonce).toHaveBeenCalled());
      expect(showRewardedAd).toHaveBeenCalledWith('n_abc123');
    });

    // The heart of the P7 change: finishing the ad grants nothing here. The
    // server pays when the SSV callback lands, so all the client may claim is
    // that the credit is on its way.
    test('a completed ad promises a credit and refetches the balance', async () => {
      jest.mocked(showRewardedAd).mockResolvedValue('earned');

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));

      expect(
        await screen.findByTestId('rewards-credit-pending'),
      ).toHaveTextContent(pl.ads.pending);
      expect(
        await screen.findByTestId('rewards-refresh-balance'),
      ).toBeOnTheScreen();
      // Once on mount, once after the ad: the balance is re-read, not written.
      await waitFor(() => expect(getRewards).toHaveBeenCalledTimes(2));
    });

    test('the refresh button re-reads the balance', async () => {
      jest.mocked(showRewardedAd).mockResolvedValue('earned');

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));
      fireEvent.press(await screen.findByTestId('rewards-refresh-balance'));

      await waitFor(() => expect(getRewards).toHaveBeenCalledTimes(3));
    });

    test('closing the ad early promises nothing and says nothing', async () => {
      jest.mocked(showRewardedAd).mockResolvedValue('dismissed');

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));

      await waitFor(() => expect(showRewardedAd).toHaveBeenCalled());
      expect(screen.queryByTestId('rewards-credit-pending')).toBeNull();
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(getRewards).toHaveBeenCalledTimes(1);
    });

    test('an unavailable ad reports it and promises nothing', async () => {
      jest.mocked(showRewardedAd).mockResolvedValue('unavailable');

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.ads.unavailable,
        ),
      );
      expect(screen.queryByTestId('rewards-credit-pending')).toBeNull();
    });

    // No nonce means the view could never be attributed, so no ad is shown at
    // all — better than burning one the server can never pay for.
    test('a failed nonce request shows no ad', async () => {
      jest
        .mocked(requestAdRewardNonce)
        .mockRejectedValueOnce(new Error('network'));

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('rewards-watch-ad'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.ads.unavailable,
        ),
      );
      expect(showRewardedAd).not.toHaveBeenCalled();
    });

    test('offers no ad once the daily cap is spent', async () => {
      jest.mocked(getRewards).mockResolvedValue({
        ...rewards,
        ads: {remainingToday: 0, dailyCap: 5},
      });

      renderWithQueryClient(<RewardsScreen {...makeProps()} />);

      expect(await screen.findByTestId('rewards-ads-cap')).toHaveTextContent(
        pl.ads.capReached,
      );
      expect(screen.queryByTestId('rewards-watch-ad')).toBeNull();
    });
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
