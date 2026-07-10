import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  // Passed to the inner TextInput; the toggle gets `${testID}-toggle` and the
  // inline error `${testID}-error`.
  testID?: string;
  error?: string;
  autoComplete?: 'password' | 'new-password';
};

// Password field with a show/hide toggle. Hidden by default (dots); tapping
// "Pokaż" reveals the characters, "Ukryj" hides them again.
export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  testID,
  error,
  autoComplete = 'password',
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TextInput
          testID={testID}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity
          testID={testID ? `${testID}-toggle` : undefined}
          onPress={() => setShowPassword(prev => !prev)}
          style={styles.toggle}>
          <Text style={styles.toggleText}>
            {showPassword ? pl.common.passwordHide : pl.common.passwordShow}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    wrapper: {
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg.elevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
    },
    toggle: {
      paddingVertical: spacing.md,
      paddingLeft: spacing.md,
    },
    toggleText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginTop: spacing.xs,
    },
  });
};
