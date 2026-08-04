import notifee from '@notifee/react-native';
import {handlePushMessage, handlePushPress} from './pushHandler';
import {openMemoryCard} from '../navigation/navigationRef';
import {queryClient} from '../queries/queryClient';
import {queryKeys} from '../queries/queryKeys';

jest.mock('../navigation/navigationRef', () => ({openMemoryCard: jest.fn()}));

const anniversary = {
  type: 'memory_anniversary',
  memory_ulid: 'm_01',
  kind: 'year',
  years: '1',
  title: 'Rok temu',
  body: 'Rok temu zapisaliście wspomnienie.',
};

const adReward = {
  type: 'ad_reward_granted',
  amount: '1',
  title: 'Kredyt przyznany',
  body: 'Nagroda za obejrzaną reklamę jest już na Waszym koncie.',
};

describe('handlePushMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  // FCM sends our pushes data-only, so nothing reaches the couple unless
  // notifee draws it — and the copy comes from `data`, not from `notification`.
  test('draws an anniversary push on the memories channel', async () => {
    await handlePushMessage({data: anniversary});

    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: 'memories'}),
    );
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rok temu',
        body: 'Rok temu zapisaliście wspomnienie.',
        data: anniversary,
      }),
    );
  });

  // Its own channel: muting anniversary reminders must not also mute the
  // message that says a credit arrived.
  test('draws an ad-reward push on the rewards channel and refreshes the balance', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await handlePushMessage({data: adReward});

    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: 'rewards'}),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.rewards});
    invalidateSpy.mockRestore();
  });

  test('an anniversary does not touch the balance', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await handlePushMessage({data: anniversary});

    expect(invalidateSpy).not.toHaveBeenCalled();
    invalidateSpy.mockRestore();
  });

  // The routing is worth doing even for a message with nothing to show.
  test('acts on a payload it cannot draw, without drawing anything', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await handlePushMessage({data: {type: 'ad_reward_granted', amount: '1'}});

    expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.rewards});
    expect(notifee.displayNotification).not.toHaveBeenCalled();
    invalidateSpy.mockRestore();
  });

  // This runs in a headless background process: an unknown message is ignored,
  // never thrown, or the whole handler takes the app down with it.
  test('ignores a message it does not understand', async () => {
    await expect(
      handlePushMessage({data: {type: 'something_new'}}),
    ).resolves.toBeUndefined();
    await expect(handlePushMessage(undefined)).resolves.toBeUndefined();
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });
});

describe('handlePushPress', () => {
  beforeEach(() => jest.clearAllMocks());

  test('an anniversary press opens that memory', () => {
    handlePushPress(anniversary);

    expect(openMemoryCard).toHaveBeenCalledWith('m_01');
  });

  // The credit is already granted and already refreshed by the time anyone
  // taps; opening a screen would be the notification deciding what they came
  // for.
  test('an ad-reward press goes nowhere', () => {
    handlePushPress(adReward);

    expect(openMemoryCard).not.toHaveBeenCalled();
  });

  test('a press with no payload goes nowhere', () => {
    handlePushPress(undefined);

    expect(openMemoryCard).not.toHaveBeenCalled();
  });
});
