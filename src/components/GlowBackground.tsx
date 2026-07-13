import React, { useMemo } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

const GLOW = require('../../assets/images/glow.png');

type Props = {
  // Width/height of the glow image in px.
  size?: number;
  // Opacity of the glow (0–1).
  intensity?: number;
  // Positions the glow layer (e.g. offset it towards the top for Auth).
  style?: StyleProp<ViewStyle>;
};

// A soft radial gold glow, painted behind the screen content. The PNG is a
// neutral white radial-alpha mask; the gold comes from the token via tintColor,
// so the colour stays theme-driven. pointerEvents="none" lets touches pass through.
export function GlowBackground({ size = 420, intensity = 0.6, style }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      <Image
        source={GLOW}
        resizeMode="contain"
        style={[styles.glow, { width: size, height: size, opacity: intensity }]}
      />
    </View>
  );
}

const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    layer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    glow: {
      tintColor: theme.colors.gold.primary,
    },
  });
};
