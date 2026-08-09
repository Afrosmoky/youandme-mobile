import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { selectedOptions, toggleOption } from '../domain/questionOptions';
import { Theme, useTheme } from '../theme';
import { SectionLabel } from './SectionLabel';

type Props = {
  // The card's own labels, in the card's own order.
  items: string[];
  // false renders radios (pick one), true checkboxes (pick as many as you like).
  multiple: boolean;
  // The answer text, which is also where the ticks come from — see below.
  value: string;
  onChange: (next: string) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  // Each option is `${testID}-${index}`.
  testID?: string;
};

// The picker for a question answered by choosing (S2). Round markers for one
// choice, square for several — the shape is the affordance, so the two modes are
// told apart before anything is tapped.
//
// Stateless on purpose: what is ticked is DERIVED from the answer text, which is
// the thing that actually gets saved. Keeping a private copy of the selection
// would give the screen two truths to reconcile at exactly the awkward moments —
// the handover from one player to the other, and a game resumed mid-card — and
// the ticks would drift from the answer without anyone noticing.
export function OptionPicker({
  items,
  multiple,
  value,
  onChange,
  label,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const picked = selectedOptions(value, items);

  return (
    <View testID={testID} style={[styles.wrapper, style]}>
      {label ? <SectionLabel style={styles.label}>{label}</SectionLabel> : null}
      {items.map((item, index) => {
        const checked = picked.includes(item);
        return (
          <TouchableOpacity
            key={item}
            testID={testID ? `${testID}-${index}` : undefined}
            style={[styles.option, checked && styles.optionChecked]}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked }}
            onPress={() => onChange(toggleOption(value, items, item, multiple))}>
            <View
              style={[
                styles.marker,
                multiple ? styles.markerSquare : styles.markerRound,
                checked && styles.markerChecked,
              ]}>
              {checked ? (
                <View
                  style={[
                    styles.dot,
                    multiple ? styles.dotSquare : styles.dotRound,
                  ]}
                />
              ) : null}
            </View>
            <Text style={[styles.text, checked && styles.textChecked]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    wrapper: {
      marginBottom: spacing.lg,
    },
    label: {
      marginBottom: spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.bg.elevated,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    optionChecked: {
      borderColor: colors.gold.deep,
      backgroundColor: colors.bg.goldTint,
    },
    marker: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      // Nudged down to sit on the first line of a label that wraps.
      marginTop: 2,
    },
    markerRound: {
      borderRadius: radius.pill,
    },
    markerSquare: {
      borderRadius: radius.sm / 2,
    },
    markerChecked: {
      borderColor: colors.gold.primary,
    },
    dot: {
      width: 10,
      height: 10,
      backgroundColor: colors.gold.primary,
    },
    dotRound: {
      borderRadius: radius.pill,
    },
    dotSquare: {
      borderRadius: 2,
    },
    text: {
      flex: 1,
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.bright,
      lineHeight: typography.size.body * 1.4,
    },
    textChecked: {
      color: colors.text.primary,
    },
  });
};
