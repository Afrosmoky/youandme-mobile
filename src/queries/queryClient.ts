import { QueryClient } from '@tanstack/react-query';

// Single app-wide QueryClient. Created at module scope so it survives re-renders
// and is shared by every screen through the QueryClientProvider in App.tsx.
//
// Defaults tuned for mobile:
// - staleTime 30s: server state (categories, memories) rarely changes between
//   quick navigations, so avoid refetching on every screen focus.
// - retry 1: one retry smooths over a flaky mobile connection without making
//   a genuinely-down request hang for the user.
// - refetchOnWindowFocus false: RN has no browser "window focus" event. Any
//   AppState-driven refetch is a deliberate later slice, not an implicit default.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
