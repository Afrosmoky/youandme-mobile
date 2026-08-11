import React, { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../theme';

// Renders a component tree wrapped in a QueryClientProvider for tests.
//
// A fresh QueryClient per call keeps tests isolated — no cache bleeds from one
// test into the next. `retry: false` makes rejected queries fail fast instead
// of retrying (which would slow tests and swallow the first error).
//
// The client is returned alongside the render result so a test can assert on it
// (e.g. spy on invalidateQueries) — it is the same client the rendered hooks use
// via useQueryClient().
//
// An existing client can be passed in to keep the cache across two renders, for
// the one thing a fresh-client-per-render cannot express: a screen handing over
// to another screen the way the navigator does it, with the in-flight requests
// of the first one landing in the second one's cache (S3d).
export function renderWithQueryClient(
  ui: ReactElement,
  existingClient?: QueryClient,
) {
  const queryClient =
    existingClient ??
    new QueryClient({
      defaultOptions: {
        // Disable cache garbage collection on both queries and mutations: with a
        // finite gcTime the client schedules a setTimeout that outlives the test
        // and makes Jest warn about a worker failing to exit. Infinity schedules
        // no timer. retry: false makes a rejected call fail fast into onError.
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
  return {
    queryClient,
    ...render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ThemeProvider>,
    ),
  };
}
