import {
  LAST_ACCOUNT_KEY,
  LAST_COUPLE_KEY,
  bindDeviceToAccount,
  clearDeviceLocalGameData,
} from './deviceLocal';
import { loadPartnerName, savePartnerName } from './partnerName';
import { kv } from './kv';
import { loadLocalGameState, saveLocalGameState } from './localGameState';
import { startLocalGame } from '../domain/localGame';
import { CHALLENGES } from '../domain/challenges';
import { Question } from '../domain/types';

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: ['bliskosc'],
  options: null,
  liked: false,
  isLocked: false,
});

// A session with the other player's name on it and an answer typed in — the
// data that must not greet the next account on this phone.
const session = () =>
  startLocalGame({
    player1: 'Piotr',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: [question(1), question(2)],
    challenges: CHALLENGES,
    interval: 2,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

beforeEach(async () => {
  // The mock store lives for the module registry's lifetime, not the test's.
  await clearDeviceLocalGameData();
  await kv.remove(LAST_ACCOUNT_KEY);
  await kv.remove(LAST_COUPLE_KEY);
});

describe('clearDeviceLocalGameData', () => {
  test('drops the stored game', async () => {
    await saveLocalGameState(session());

    await clearDeviceLocalGameData();

    expect(await loadLocalGameState()).toBeNull();
  });

  // The remembered name is the other half of what a sign-out has to take with
  // it: offering the next person on this phone the previous partner's name is
  // the worst thing this form can do.
  test('drops the remembered partner name', async () => {
    await savePartnerName('Wiktoria');

    await clearDeviceLocalGameData();

    expect(await loadPartnerName()).toBeNull();
  });

  test('does nothing when there is no game to drop', async () => {
    await expect(clearDeviceLocalGameData()).resolves.toBeUndefined();
    expect(await loadLocalGameState()).toBeNull();
  });
});

describe('bindDeviceToAccount', () => {
  test('a game left by another account is cleared on sign-in', async () => {
    await bindDeviceToAccount('u_01', 'c_01');
    await saveLocalGameState(session());

    await bindDeviceToAccount('u_99', 'c_99');

    expect(await loadLocalGameState()).toBeNull();
  });

  test('the same account signing back in keeps its paused game', async () => {
    await bindDeviceToAccount('u_01', 'c_01');
    await saveLocalGameState(session());

    await bindDeviceToAccount('u_01', 'c_01');

    expect((await loadLocalGameState())?.player2).toBe('Wiktoria');
  });

  // The barrier the account ulid cannot see: same person, same account, paired
  // with somebody else since. Nothing about the account changed, so only the
  // couple ulid can tell — and without it the setup screen would greet the new
  // relationship with the previous partner's name already typed in.
  test('a new couple under the same account clears what the last one left', async () => {
    await bindDeviceToAccount('u_01', 'c_01');
    await saveLocalGameState(session());
    await savePartnerName('Wiktoria');

    await bindDeviceToAccount('u_01', 'c_02');

    expect(await loadLocalGameState()).toBeNull();
    expect(await loadPartnerName()).toBeNull();
  });

  // A device that upgrades into this build has no owner recorded, and the game
  // on it may be exactly the leaked one. Unknown counts as somebody else.
  test('a game with no owner recorded is cleared', async () => {
    await saveLocalGameState(session());

    await bindDeviceToAccount('u_01', 'c_01');

    expect(await loadLocalGameState()).toBeNull();
  });
});
