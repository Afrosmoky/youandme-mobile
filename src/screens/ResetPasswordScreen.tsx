import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { resetPassword } from '../api/passwordReset';
import { PasswordInput } from '../components/PasswordInput';
import { parseApiError, FieldErrors } from '../api/errors';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { token, email } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Backend errors keyed to fields not shown here (e.g. errors.email for an
  // expired token) have nowhere to render inline, so we surface the topLevel
  // message as a banner above the form.
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
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
    setTopLevelError(null);
    setFieldErrors(prev => {
      if (!prev.password) {
        return prev;
      }
      const next = { ...prev };
      delete next.password;
      return next;
    });
  };

  const onConfirmChange = (value: string) => {
    setConfirm(value);
    setTopLevelError(null);
  };

  const onSubmit = async () => {
    if (!valid) {
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setTopLevelError(null);
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
      // Always surface the banner — field errors keyed to email/token are
      // invisible otherwise, leaving submit looking like a no-op.
      setTopLevelError(parsed.topLevel);
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

      {topLevelError && (
        <Text testID="reset-password-banner" style={styles.errorBanner}>
          {topLevelError}
        </Text>
      )}

      <PasswordInput
        value={password}
        onChangeText={onPasswordChange}
        placeholder={pl.resetPassword.password}
        testID="reset-password-password"
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <PasswordInput
        value={confirm}
        onChangeText={onConfirmChange}
        placeholder={pl.resetPassword.passwordConfirm}
        testID="reset-password-confirm"
        autoComplete="new-password"
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
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  errorBanner: {
    color: '#b00020',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
    marginBottom: 16,
    textAlign: 'center',
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
