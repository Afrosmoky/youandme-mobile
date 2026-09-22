import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme, useTheme, withGlowRoom } from '../theme';

type Props = {
  liked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  testID?: string;
};

// P5 Slice 1b: the like heart. Provisional look pending Wiktoria's style guide
// (task #36) — a text glyph, not an icon library (keeps the P4 no-icon-lib
// decision). Filled heart in gold when liked, outline heart in muted otherwise.
// Each glyph is followed by U+FE0E (variation selector-15) forcing text
// presentation: without it iOS renders U+2665 as a red emoji that ignores
// `color`. Written as explicit escapes so the invisible selector survives copy.
const HEART_FILLED = '♥︎';
const HEART_OUTLINE = '♡︎';

// 3C. The scale comes from the web's `pulse-heart` keyframes (1 -> 1.15); the
// durations are ours, because a one-shot needs to be short where a loop can be
// slow.
const PULSE_SCALE = 1.15;
const PULSE_IN_MS = 120;
const PULSE_OUT_MS = 160;

export function LikeHeart({ liked, onToggle, disabled, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * A single pulse when the heart FILLS — and this is OUR decision, not a port.
   *
   * Worth being explicit about, because the obvious assumption is wrong and
   * someone will go looking: the web has `animate-pulse-heart`, but it applies it
   * in exactly one place, GameClient.tsx inside the `loading` branch, on a 64px
   * icon next to "łączymy…". That is a spinner wearing a heart. The web does not
   * animate the LIKE heart at all, so there was nothing here to reproduce.
   *
   * A loop was rejected on the same grounds as the pulsing headings: this heart
   * sits beside the question a couple is reading, and a permanently moving thing
   * next to text competes with it. One pulse acknowledges the tap and stops.
   *
   * Only on false -> true. Unliking has nothing to celebrate, and the initial
   * value is skipped deliberately: without that, opening a list of hearted
   * memories would set every row pulsing at once.
   *
   * Scale rides the native driver — it is a transform — so this costs nothing
   * per frame. The web also grows a drop-shadow through the same keyframes; that
   * half is dropped, because shadow radius is not native-driver animatable and
   * would drag the whole thing onto the JS bridge for an effect measured in
   * pixels.
   */
  const scale = useRef(new Animated.Value(1)).current;
  const wasLiked = useRef(liked);
  useEffect(() => {
    const justFilled = liked && !wasLiked.current;
    wasLiked.current = liked;
    if (!justFilled) {
      return;
    }
    Animated.sequence([
      Animated.timing(scale, {
        toValue: PULSE_SCALE,
        duration: PULSE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: PULSE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liked, scale]);

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.Text
        style={[
          styles.glyph,
          // The glow belongs to the filled state only: an outline heart is an
          // invitation, and a glowing invitation would read as already taken.
          liked ? styles.heartGlow : styles.heartFlat,
          {
            color: liked ? theme.colors.gold.primary : theme.colors.text.muted,
            transform: [{ scale }],
          },
        ]}>
        {liked ? HEART_FILLED : HEART_OUTLINE}
      </Animated.Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => {
  const { typography, glow } = theme;
  return StyleSheet.create({
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h2,
      lineHeight: typography.size.h2 * 1.2,
    },
    heartGlow: withGlowRoom({
      ...glow.label,
    }),
    heartFlat: glow.none,
  });
};
