import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { linking } from './linking';
import { useAuth } from '../auth/AuthContext';
import { usePushRegistration } from '../notifications/usePushRegistration';
import { AuthScreen } from '../screens/AuthScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { BootstrapScreen } from '../screens/BootstrapScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { DailyCardScreen } from '../screens/DailyCardScreen';
import { EmailVerifiedScreen } from '../screens/EmailVerifiedScreen';
import { RitualScreen } from '../screens/RitualScreen';
import { CategoryPickerScreen } from '../screens/CategoryPickerScreen';
import { LocalGameSetupScreen } from '../screens/LocalGameSetupScreen';
import { LocalGameScreen } from '../screens/LocalGameScreen';
import { LocalGameSummaryScreen } from '../screens/LocalGameSummaryScreen';
import { ComingSoonScreen } from '../screens/ComingSoonScreen';
import { DeckScreen } from '../screens/DeckScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { ProgressMapScreen } from '../screens/ProgressMapScreen';
import { QuestionScreen } from '../screens/QuestionScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { MemoryCardScreen } from '../screens/MemoryCardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { pl } from '../i18n/pl';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Re-exported so callers keep one import for the navigator and its links.
export { linking };


export function RootNavigator() {
  const { token, loading } = useAuth();

  // P9: tell the backend where to push, for as long as there is a session to
  // push about. Hooks run before the early return below on purpose.
  usePushRegistration(token != null);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {token == null ? (
        <>
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ title: pl.appTitle }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: pl.forgotPassword.title }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: pl.resetPassword.title }}
          />
          <Stack.Screen name="EmailVerified" component={EmailVerifiedScreen} />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Bootstrap"
            component={BootstrapScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: pl.home.headerTitle }}
          />
          <Stack.Screen
            name="DailyCard"
            component={DailyCardScreen}
            options={{ title: pl.dailyCard.headerTitle }}
          />
          <Stack.Screen
            name="Ritual"
            component={RitualScreen}
            options={{ title: pl.ritual.headerTitle }}
          />
          <Stack.Screen
            name="CategoryPicker"
            component={CategoryPickerScreen}
            options={{ title: pl.categoryPicker.title }}
          />
          <Stack.Screen
            name="LocalGameSetup"
            component={LocalGameSetupScreen}
            options={{ title: pl.localGame.setupHeaderTitle }}
          />
          <Stack.Screen
            name="LocalGame"
            component={LocalGameScreen}
            options={{
              title: pl.localGame.headerTitle,
              // No back arrow, no swipe: "Przerwij" (→ Home) is the only way out
              // of a game in progress. Going back would land on a still-mounted
              // LocalGameSetup holding the session it read when IT mounted —
              // stale by then. The resume card would be missing, the
              // matchesSetup guard would compare against null and overwrite a
              // game in progress with a fresh deck, and the pending report would
              // never flush (all three hang off the same mount effect).
              // Leaving via Home unwinds the setup screen too, so the next entry
              // always re-reads what is actually on disk.
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="LocalGameSummary"
            component={LocalGameSummaryScreen}
            options={{
              title: pl.localGame.summaryHeaderTitle,
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Question"
            component={QuestionScreen}
            options={{ title: pl.question.headerTitle }}
          />
          {/* Title comes from the route params, set in the screen itself. */}
          <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
          {/*
            Both deep-link targets live in this branch too. Resetting a password
            while already signed in is an ordinary thing to do - the request can
            come from another device, or the session can outlive it - and until
            P11 that link landed nowhere at all for a signed-in couple.
          */}
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: pl.resetPassword.title }}
          />
          <Stack.Screen name="EmailVerified" component={EmailVerifiedScreen} />
          <Stack.Screen
            name="Deck"
            component={DeckScreen}
            options={{ title: pl.deck.headerTitle }}
          />
          <Stack.Screen
            name="Rewards"
            component={RewardsScreen}
            options={{ title: pl.rewards.headerTitle }}
          />
          <Stack.Screen
            name="ProgressMap"
            component={ProgressMapScreen}
            options={{ title: pl.progress.headerTitle }}
          />
          <Stack.Screen
            name="Memories"
            component={MemoriesScreen}
            options={{ title: pl.memories.headerTitle }}
          />
          <Stack.Screen
            name="MemoryCard"
            component={MemoryCardScreen}
            options={{ title: pl.memoryCard.headerTitle }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: pl.profile.title }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
