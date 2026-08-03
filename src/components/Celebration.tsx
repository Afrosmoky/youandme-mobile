import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Theme, useTheme } from '../theme';
import { GlowBackground } from './GlowBackground';
import { GoldButton } from './GoldButton';
import { pl } from '../i18n/pl';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  onDismiss: () => void;
};

// Celebration modal in the P11a look: gold glow, big gold title, a dismiss CTA.
//
// The words come from the caller. P4 celebrates a streak of days here, P8 a
// milestone unlocked on the progress map, and the two share nothing but this
// frame — so the component holds the frame and nothing else. Only the dismiss
// CTA stays fixed: it is part of the frame, not of the occasion.
export function Celebration({ visible, title, body, onDismiss }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <View testID="celebration" style={styles.card}>
          <GlowBackground size={280} intensity={0.4} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <GoldButton
            testID="celebration-dismiss"
            title={pl.celebration.dismiss}
            onPress={onDismiss}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    scrim: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.deep + 'cc',
      padding: spacing.xxl,
    },
    card: {
      alignSelf: 'stretch',
      backgroundColor: colors.bg.surface,
      borderWidth: 1,
      borderColor: colors.gold.borderStrong,
      borderRadius: radius.lg,
      padding: spacing.xxl,
      alignItems: 'center',
      overflow: 'hidden',
    },
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.gold.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    body: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    button: {
      alignSelf: 'stretch',
    },
  });
};
