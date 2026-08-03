import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../auth/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { BootstrapScreen } from '../screens/BootstrapScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { DailyCardScreen } from '../screens/DailyCardScreen';
import { RitualScreen } from '../screens/RitualScreen';
import { CategoryPickerScreen } from '../screens/CategoryPickerScreen';
import { DeckScreen } from '../screens/DeckScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { ProgressMapScreen } from '../screens/ProgressMapScreen';
import { QuestionScreen } from '../screens/QuestionScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { pl } from '../i18n/pl';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Custom-scheme deep linking. jaity://reset-password?token=&email= → the
// ResetPassword screen, with the query string parsed into route params.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['jaity://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

export function RootNavigator() {
  const { token, loading } = useAuth();

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
            name="Question"
            component={QuestionScreen}
            options={{ title: pl.question.headerTitle }}
          />
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
