import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Navigation from outside React (P9): a notification is pressed in a notifee
// handler, which is not a component and has no hooks.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Where a press wanted to go before the app could take it there. A cold start
// from a pressed notification arrives while the navigator is still showing the
// auth stack — or nothing at all — so the destination has to wait somewhere
// until an authenticated stack exists. BootstrapScreen is the one place that
// knows the couple is in, and it collects this on the way through.
let pendingMemoryUlid: string | null = null;

// True only once the authenticated stack is mounted. Asking for the route names
// rather than for a token keeps this module free of auth state: MemoryCard is
// registered in the authenticated branch of RootNavigator and nowhere else, so
// its presence IS the answer to "can we navigate there".
function canReachMemoryCard(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  return navigationRef.getRootState()?.routeNames?.includes('MemoryCard') ?? false;
}

// Opens a memory now if the app can, and remembers it if it cannot.
export function openMemoryCard(memoryUlid: string): void {
  if (canReachMemoryCard()) {
    navigationRef.navigate('MemoryCard', { memoryUlid });
    return;
  }
  pendingMemoryUlid = memoryUlid;
}

// Reads and clears in one step: a pending destination is consumed once, or a
// second trip through Bootstrap (a later login, say) would reopen a memory the
// couple already dismissed.
export function takePendingMemoryUlid(): string | null {
  const ulid = pendingMemoryUlid;
  pendingMemoryUlid = null;
  return ulid;
}
