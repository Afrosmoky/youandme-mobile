/**
 * Ja i Ty — mobile client (slice 1).
 *
 * @format
 */

import React from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator, linking } from './src/navigation/RootNavigator';
import { queryClient } from './src/queries/queryClient';
import { ThemeProvider } from './src/theme';

// RN has no window-focus event; drive TanStack's focus signal from AppState so
// focus-refetch queries (the daily card) refresh when returning from background.
focusManager.setEventListener(handleFocus => {
  const sub = AppState.addEventListener('change', state =>
    handleFocus(state === 'active'),
  );
  return () => sub.remove();
});

function App() {
  // P11a is dark-only; ThemeProvider owns scheme resolution (see its comment),
  // so the status bar is light-content to sit on the dark theme background.
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
