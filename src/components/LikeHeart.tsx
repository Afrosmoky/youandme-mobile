import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Theme, useTheme } from '../theme';

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

export function LikeHeart({ liked, onToggle, disabled, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text
        style={[
          styles.glyph,
          {
            color: liked
              ? theme.colors.gold.primary
              : theme.colors.text.muted,
          },
        ]}>
        {liked ? HEART_FILLED : HEART_OUTLINE}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => {
  const { typography } = theme;
  return StyleSheet.create({
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h2,
      lineHeight: typography.size.h2 * 1.2,
    },
  });
};
