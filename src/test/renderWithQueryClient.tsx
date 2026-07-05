import React, { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Renders a component tree wrapped in a QueryClientProvider for tests.
//
// A fresh QueryClient per call keeps tests isolated — no cache bleeds from one
// test into the next. `retry: false` makes rejected queries fail fast instead
// of retrying (which would slow tests and swallow the first error).
export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Disable cache garbage collection: with a finite gcTime the client
        // schedules a setTimeout that outlives the test and makes Jest warn
        // about a worker failing to exit. Infinity schedules no timer.
        gcTime: Infinity,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
