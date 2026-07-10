import React, { useMemo } from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '../theme';
import { SectionLabel } from './SectionLabel';

type Props = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  error?: string;
  // Shown under the field when there is no error (e.g. the partner-name hint).
  hint?: string;
  placeholder?: string;
  // false renders the value as plain read-only text (no input box), matching the
  // read-only fields in the profile mockup (e-mail, locale).
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Labelled input: a gold caps label over the field, with an inline error
// (`${testID}-error`) or a hint below it.
export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  editable = true,
  autoCapitalize,
  keyboardType,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.wrapper, style]}>
      <SectionLabel style={styles.label}>{label}</SectionLabel>
      {editable ? (
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
        />
      ) : (
        <Text testID={testID} style={styles.readonly}>
          {value}
        </Text>
      )}
      {error ? (
        <Text testID={testID ? `${testID}-error` : undefined} style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.bg.elevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
    },
    readonly: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      paddingVertical: spacing.xs,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginTop: spacing.xs,
    },
    hint: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
  });
};
