import React from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  children: React.ReactNode;
  // When provided, the card is a pressable surface (category tiles); otherwise
  // a static panel (memory cards).
  onPress?: () => void;
  // 'surface' = neutral panel; 'gold' = highlighted card with a gold border
  // (the "Mix" tile).
  variant?: 'surface' | 'gold';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  onPress,
  variant = 'surface',
  disabled,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor:
        variant === 'gold' ? colors.bg.goldTint : colors.bg.surface,
      borderWidth: 1,
      borderColor:
        variant === 'gold' ? colors.gold.borderStrong : colors.border.subtle,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={cardStyle}>
      {children}
    </View>
  );
}
