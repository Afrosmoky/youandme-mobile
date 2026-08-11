import React, { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Badge } from '../components/Badge';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ComingSoon'>;

// The same text glyph the rest of the app uses (LikeHeart, GameCard), with
// U+FE0E so iOS renders it as text in our gold rather than as a red emoji.
const HEART = '♥︎';

// "Coming soon" (P11). One screen for every feature we have announced but not
// built: the remote game today, the ranking later. Everything it says arrives
// through route params, so adding the next one costs a copy entry and a tile,
// not another near-identical screen.
//
// Deliberately NOT part of the exhaustion funnel (S4) or the deck: nothing here
// is locked, spent or unlockable. It is a promise with a date we do not have
// yet, which is exactly why it carries no call to action — the way out is the
// header back button, and there is nothing else to do here.
export function ComingSoonScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { title, body } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => <Text style={styles.headerTitle}>{title}</Text>,
    });
  }, [navigation, styles, theme, title]);

  return (
    <ScreenContainer
      testID="coming-soon-screen"
      contentContainerStyle={styles.content}>
      <View style={styles.block}>
        <Text style={styles.glyph}>{HEART}</Text>

        <Badge testID="coming-soon-badge" style={styles.badge}>
          {pl.comingSoon.badge}
        </Badge>

        <Text testID="coming-soon-title" style={styles.title}>
          {title}
        </Text>
        <Text testID="coming-soon-body" style={styles.body}>
          {body}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    // Same trick as the empty/error states: the block centres itself, the
    // container gives it the room.
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
    // Badge pins itself to flex-start (it is normally a pill in a row); this
    // screen is a centred column, so the caller overrides it.
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
