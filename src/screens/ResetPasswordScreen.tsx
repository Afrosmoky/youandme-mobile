import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { resetPassword } from '../api/passwordReset';
import { parseApiError, FieldErrors } from '../api/errors';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { token, email } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = !tooShort && password === confirm;

  // Only show an inline error once the user has typed something.
  const inlineError = (() => {
    if (password.length > 0 && tooShort) {
      return pl.resetPassword.passwordTooShort;
    }
    if (mismatch) {
      return pl.resetPassword.passwordsDontMatch;
    }
    return null;
  })();

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors(prev => {
      if (!prev.password) {
        return prev;
      }
      const next = { ...prev };
      delete next.password;
      return next;
    });
  };

  const onSubmit = async () => {
    if (!valid) {
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    try {
      await resetPassword({
        token,
        email,
        password,
        passwordConfirmation: confirm,
      });
      Alert.alert(pl.appTitle, pl.resetPassword.successAlert);
      navigation.navigate('Auth');
    } catch (err) {
      const parsed = parseApiError(err, pl.resetPassword.errorAlert);
      setFieldErrors(parsed.fields);
      // No field detail (expired token, network): fall back to the alert.
      if (Object.keys(parsed.fields).length === 0) {
        Alert.alert(pl.appTitle, parsed.topLevel);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      testID="reset-password-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{pl.resetPassword.title}</Text>

      <TextInput
        style={styles.input}
        placeholder={pl.resetPassword.password}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={onPasswordChange}
      />
      {fieldErrors.password && (
        <Text testID="reset-password-password-error" style={styles.fieldError}>
          {fieldErrors.password}
        </Text>
      )}
      <TextInput
        style={styles.input}
        placeholder={pl.resetPassword.passwordConfirm}
        secureTextEntry
        autoCapitalize="none"
        value={confirm}
        onChangeText={setConfirm}
      />

      {inlineError && <Text style={styles.error}>{inlineError}</Text>}

      <TouchableOpacity
        testID="reset-password-submit"
        style={[styles.button, (submitting || !valid) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting || !valid}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{pl.resetPassword.submit}</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  fieldError: {
    color: '#b00020',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
