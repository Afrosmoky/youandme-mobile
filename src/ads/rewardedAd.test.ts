import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { showRewardedAd } from './rewardedAd';

// Every ad request carries a server-issued nonce from P7 on.
const NONCE = 'n_abc123';

type Listener = () => void;

// Stands in for the native ad object: records the listeners rewardedAd.ts
// registers so a test can fire the events AdMob would fire.
function makeFakeAd() {
  const listeners = new Map<string, Listener>();
  const unsubscribed: string[] = [];
  return {
    listeners,
    unsubscribed,
    load: jest.fn(),
    show: jest.fn(() => Promise.resolve()),
    addAdEventListener: jest.fn((type: string, listener: Listener) => {
      listeners.set(type, listener);
      return () => unsubscribed.push(type);
    }),
    emit(type: string) {
      listeners.get(type)?.();
    },
  };
}

type FakeAd = ReturnType<typeof makeFakeAd>;

function stubAd(): FakeAd {
  const ad = makeFakeAd();
  jest
    .mocked(RewardedAd.createForAdRequest)
    .mockReturnValue(ad as unknown as ReturnType<
      typeof RewardedAd.createForAdRequest
    >);
  return ad;
}

describe('showRewardedAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('requests the test ad unit with the nonce as SSV custom data', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);

    expect(RewardedAd.createForAdRequest).toHaveBeenCalledWith(
      TestIds.REWARDED,
      {
        requestNonPersonalizedAdsOnly: true,
        // What the SSV callback echoes back to our backend — without it the
        // view could never be attributed to a couple, so it would never be paid.
        serverSideVerificationOptions: { customData: NONCE },
      },
    );

    // Settle the pending promise so the test leaves nothing hanging.
    ad.emit(AdEventType.ERROR);
    await outcome;
  });

  test('shows the ad once loaded and resolves earned on the reward', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);
    ad.emit(RewardedAdEventType.LOADED);
    expect(ad.show).toHaveBeenCalled();

    ad.emit(RewardedAdEventType.EARNED_REWARD);

    await expect(outcome).resolves.toBe('earned');
  });

  test('resolves dismissed when the ad closes without a reward', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);
    ad.emit(RewardedAdEventType.LOADED);
    ad.emit(AdEventType.CLOSED);

    await expect(outcome).resolves.toBe('dismissed');
  });

  // CLOSED always follows EARNED_REWARD; the outcome must stay 'earned'.
  test('keeps the earned outcome when close follows the reward', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);
    ad.emit(RewardedAdEventType.LOADED);
    ad.emit(RewardedAdEventType.EARNED_REWARD);
    ad.emit(AdEventType.CLOSED);

    await expect(outcome).resolves.toBe('earned');
  });

  test('resolves unavailable on a load error (no fill)', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);
    ad.emit(AdEventType.ERROR);

    await expect(outcome).resolves.toBe('unavailable');
    expect(ad.show).not.toHaveBeenCalled();
  });

  test('resolves unavailable when the network never answers', async () => {
    stubAd();

    const outcome = showRewardedAd(NONCE);
    jest.advanceTimersByTime(15_000);

    await expect(outcome).resolves.toBe('unavailable');
  });

  test('unsubscribes every listener once settled', async () => {
    const ad = stubAd();

    const outcome = showRewardedAd(NONCE);
    ad.emit(RewardedAdEventType.LOADED);
    ad.emit(RewardedAdEventType.EARNED_REWARD);
    await outcome;

    expect(ad.unsubscribed).toHaveLength(ad.listeners.size);
  });
});
