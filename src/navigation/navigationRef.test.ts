import {
  navigationRef,
  openMemoryCard,
  takePendingMemoryUlid,
} from './navigationRef';

// Stands in for the navigator's state: MemoryCard is registered only in the
// authenticated branch of RootNavigator, which is what makes its presence the
// answer to "is the couple in yet".
const mockNavigator = (ready: boolean, routeNames: string[]) => {
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(ready);
  jest
    .spyOn(navigationRef, 'getRootState')
    .mockReturnValue({routeNames} as never);
};

describe('openMemoryCard', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    takePendingMemoryUlid();
  });

  test('navigates straight there when the app is already inside', () => {
    mockNavigator(true, ['Bootstrap', 'Home', 'Memories', 'MemoryCard']);
    const navigate = jest
      .spyOn(navigationRef, 'navigate')
      .mockImplementation(() => {});

    openMemoryCard('m_01');

    expect(navigate).toHaveBeenCalledWith('MemoryCard', {memoryUlid: 'm_01'});
    expect(takePendingMemoryUlid()).toBeNull();
  });

  // A cold start from a pressed notification: the container is not mounted yet,
  // so the destination waits instead of being thrown away.
  test('remembers the memory when the navigator is not ready', () => {
    mockNavigator(false, []);

    openMemoryCard('m_01');

    expect(takePendingMemoryUlid()).toBe('m_01');
  });

  // Logged out (or still on the auth stack): navigating would have nowhere to
  // go, and the push must survive until the couple is in.
  test('remembers the memory when only the auth stack exists', () => {
    mockNavigator(true, ['Auth', 'ForgotPassword', 'ResetPassword']);
    const navigate = jest
      .spyOn(navigationRef, 'navigate')
      .mockImplementation(() => {});

    openMemoryCard('m_01');

    expect(navigate).not.toHaveBeenCalled();
    expect(takePendingMemoryUlid()).toBe('m_01');
  });
});

describe('takePendingMemoryUlid', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    takePendingMemoryUlid();
  });

  // Consumed on read: a second trip through Bootstrap (a later login, say) must
  // not reopen a memory the couple already dismissed.
  test('hands the memory over exactly once', () => {
    mockNavigator(false, []);
    openMemoryCard('m_01');

    expect(takePendingMemoryUlid()).toBe('m_01');
    expect(takePendingMemoryUlid()).toBeNull();
  });

  test('is null when no push is waiting', () => {
    expect(takePendingMemoryUlid()).toBeNull();
  });
});
