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
import { requestPasswordReset } from '../api/passwordReset';
import { parseApiError, FieldErrors } from '../api/errors';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// Basic shape check only; the backend stays the source of truth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setFieldErrors(prev => {
      if (!prev.email) {
        return prev;
      }
      const next = { ...prev };
      delete next.email;
      return next;
    });
  };

  const onSubmit = async () => {
    if (!emailValid) {
      Alert.alert(pl.appTitle, pl.forgotPassword.invalidEmail);
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    try {
      await requestPasswordReset(email);
      Alert.alert(pl.appTitle, pl.forgotPassword.sentToast);
      navigation.goBack();
    } catch (err) {
      const parsed = parseApiError(err, pl.forgotPassword.error);
      setFieldErrors(parsed.fields);
      // No field detail (network, 500): fall back to the banner alert.
      if (Object.keys(parsed.fields).length === 0) {
        Alert.alert(pl.appTitle, parsed.topLevel);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      testID="forgot-password-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{pl.forgotPassword.title}</Text>

      <TextInput
        style={styles.input}
        placeholder={pl.forgotPassword.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={onEmailChange}
      />
      {fieldErrors.email && (
        <Text testID="forgot-password-email-error" style={styles.fieldError}>
          {fieldErrors.email}
        </Text>
      )}

      <TouchableOpacity
        testID="forgot-password-submit"
        style={[
          styles.button,
          (submitting || !emailValid) && styles.buttonDisabled,
        ]}
        onPress={onSubmit}
        disabled={submitting || !emailValid}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{pl.forgotPassword.submit}</Text>
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
    marginBottom: 16,
    fontSize: 16,
  },
  fieldError: {
    color: '#b00020',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
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
