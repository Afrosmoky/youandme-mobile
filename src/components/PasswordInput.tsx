import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TextInput
          testID={testID}
          style={styles.input}
          placeholder={placeholder}
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

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggle: {
    paddingVertical: 12,
    paddingLeft: 12,
  },
  toggleText: {
    color: '#0a84ff',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    fontSize: 13,
    marginTop: 6,
  },
});
