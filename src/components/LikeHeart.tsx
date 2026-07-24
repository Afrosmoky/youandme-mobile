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
// decision). Filled ♥ in gold when liked, outline ♡ in muted otherwise. If the
// glyph renders as an emoji instead of the font face, we tune it in P11b — no
// native icon dependency added for it.
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
        {liked ? '♥' : '♡'}
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
