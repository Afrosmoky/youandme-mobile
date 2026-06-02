import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../auth/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { QuestionScreen } from '../screens/QuestionScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { pl } from '../i18n/pl';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ title: pl.appTitle }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Question"
            component={QuestionScreen}
            options={{ title: pl.question.headerTitle }}
          />
          <Stack.Screen
            name="Memories"
            component={MemoriesScreen}
            options={{ title: pl.memories.headerTitle }}
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
