import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '../theme';

// The same two glyphs LikeHeart draws, and for the same reason: a text glyph
// rather than an icon library (the P4 no-icon-lib decision still stands), each
// followed by U+FE0E so iOS renders text rather than a red emoji that ignores
// `color`.
const HEART_FILLED = '♥︎';
const HEART_OUTLINE = '♡︎';

type LikeProps = {
  liked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  // The corner heart gets this; the mirrored one gets `${testID}-mirror`.
  testID?: string;
};

type Props = {
  children: React.ReactNode;
  // When given, the card carries the heart in two corners. Omitted on a card
  // there is nothing to like — a challenge is an instruction the couple
  // performs, not a card of the deck.
  like?: LikeProps;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// The card frame of the game (S_polish): surface, a gold hairline, and the
// question inside it. Used by the local game and the daily card, so the two
// stop being two different-looking things that are the same thing.
//
// Dumb by construction, in the shape PasswordInput and OptionPicker set: props
// and children, no state, no knowledge of what is being played. Deliberately NOT
// a third variant of Card — that one is the list tile (categories, memories, the
// resume card, the exhaustion panel), and giving it a second job would leave
// every tile in the app carrying the game's border logic.
//
// The two hearts are the one piece of behaviour here, and they live in the frame
// rather than in the screens on purpose. "One like, shown in two corners" is a
// property of the card: the screen hands over a single `liked` and a single
// `onToggle`, so there is no second copy of the state to drift, and no way for a
// tap on one corner to disagree with the other.
export function GameCard({ children, like, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View testID={testID} style={[styles.card, like && styles.withHearts, style]}>
      {like && (
        <CornerHeart
          {...like}
          style={styles.heartTopLeft}
          testID={like.testID}
        />
      )}

      {children}

      {/* Turned through 180°, so the pair reads as one card seen from either
          side of the phone — which is how it is actually held. */}
      {like && (
        <CornerHeart
          {...like}
          style={[styles.heartBottomRight, styles.mirrored]}
          testID={like.testID ? `${like.testID}-mirror` : undefined}
        />
      )}
    </View>
  );
}

function CornerHeart({
  liked,
  onToggle,
  disabled,
  style,
  testID,
}: LikeProps & { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      style={[styles.heart, style]}
      // Both corners are real targets, not decoration: the glyph is small, so
      // the tappable area is grown well past it.
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Text
        style={[
          styles.glyph,
          {
            color: liked ? theme.colors.gold.primary : theme.colors.text.muted,
          },
        ]}>
        {liked ? HEART_FILLED : HEART_OUTLINE}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bg.surface,
      borderWidth: 1.5,
      borderColor: colors.gold.deep,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    // Room for the corners, so a long question never runs under a heart.
    withHearts: {
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xxxl,
    },
    heart: {
      position: 'absolute',
      zIndex: 1,
    },
    heartTopLeft: {
      top: spacing.sm,
      left: spacing.md,
    },
    heartBottomRight: {
      bottom: spacing.sm,
      right: spacing.md,
    },
    mirrored: {
      transform: [{ rotate: '180deg' }],
    },
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h3,
      lineHeight: typography.size.h3 * 1.2,
    },
  });
};
