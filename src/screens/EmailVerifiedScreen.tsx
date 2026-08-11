import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation/types';
import { Badge } from '../components/Badge';
import { ScreenContainer } from '../components/ScreenContainer';
import { queryKeys } from '../queries/queryKeys';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerified'>;

// Same text glyph as the rest of the app, with U+FE0E so iOS draws it as text
// in our gold rather than as a red emoji.
const HEART = '♥︎';

// Where jaity://email-verified lands (P11 deep links).
//
// The verifying already happened on the backend - the link in the mail is a
// signed URL only the server can check, and the page it renders is what carried
// the couple here. So this screen has nothing to verify and nothing to ask for;
// it says so, and drops the cached status on the way in.
//
// That invalidation is the only functional thing here: the app was very likely
// running while the browser did the verifying, so `verification-status` is
// sitting there saying `verified: false`, and the "confirm your email" banner
// on the profile would stay up until something happened to refetch it.
export function EmailVerifiedScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.verificationStatus });
  }, [queryClient]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.emailVerified.headerTitle}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  return (
    <ScreenContainer
      testID="email-verified-screen"
      contentContainerStyle={styles.content}>
      <View style={styles.block}>
        <Text style={styles.glyph}>{HEART}</Text>

        <Badge testID="email-verified-badge" style={styles.badge}>
          {pl.emailVerified.badge}
        </Badge>

        <Text testID="email-verified-title" style={styles.title}>
          {pl.emailVerified.title}
        </Text>
        <Text testID="email-verified-body" style={styles.body}>
          {pl.emailVerified.body}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    block: {
      alignItems: 'center',
    },
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h1,
      color: colors.gold.deep,
      marginBottom: spacing.lg,
    },
    // Badge pins itself to flex-start; this screen is a centred column.
    badge: {
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    body: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
  });
};
