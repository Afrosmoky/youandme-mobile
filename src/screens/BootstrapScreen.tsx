import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { getActiveSession } from '../api/sessions';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Bootstrap'>;

// Authenticated entry point. Hydrates the cached user/couple, then decides where
// to land: resume an active session (→ Question) or pick a category. Renders a
// spinner while deciding and replaces itself so it never sits on the back stack.
export function BootstrapScreen({ navigation }: Props) {
  const { refreshUser } = useAuth();

  useEffect(() => {
    let active = true;
    (async () => {
      // Pull user + couple into the context so Profile (and Question's partner
      // snapshot) have them. Non-fatal: a failure still lets the user play.
      try {
        await refreshUser();
      } catch {
        // ignore — screens fall back to empty state
      }
      try {
        const session = await getActiveSession();
        if (!active) {
          return;
        }
        if (session) {
          navigation.replace('Question', { sessionUlid: session.ulid });
        } else {
          navigation.replace('CategoryPicker');
        }
      } catch {
        if (active) {
          navigation.replace('CategoryPicker');
        }
      }
    })();
    return () => {
      active = false;
    };
    // Run once on mount; the context callbacks are captured at first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.centered}>
      <ActivityIndicator />
      <Text style={styles.text}>{pl.bootstrap.loading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    color: '#777',
    fontSize: 15,
  },
});
