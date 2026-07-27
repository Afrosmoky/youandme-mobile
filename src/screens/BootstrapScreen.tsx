import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { getActiveSession } from '../api/sessions';
import { GlowBackground } from '../components/GlowBackground';
import { Logo } from '../components/Logo';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Bootstrap'>;

// Authenticated entry point. Hydrates the cached user/couple, then decides where
// to land: resume an active session (→ Question) or go to the hub (→ Home).
// Renders a spinner while deciding and replaces itself so it never sits on the
// back stack.
export function BootstrapScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
          navigation.replace('Home');
        }
      } catch {
        if (active) {
          navigation.replace('Home');
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
      <GlowBackground size={520} intensity={0.55} />
      <Logo style={styles.logo} />
      <ActivityIndicator color={theme.colors.gold.primary} />
      <Text style={styles.text}>{pl.bootstrap.loading}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.deep,
    },
    logo: {
      marginBottom: spacing.xxl,
    },
    text: {
      marginTop: spacing.md,
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
    },
  });
};
