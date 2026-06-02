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
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { pl } from '../i18n/pl';

type Mode = 'login' | 'register';

// Maps an API/network failure to a Polish message for the user.
function messageForError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return pl.auth.invalidCredentials;
    }
    if (error.response?.status === 422) {
      return pl.auth.validationError;
    }
  }
  return pl.auth.genericError;
}

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ email, password, nickname });
      } else {
        await login({ email, password });
      }
      // On success the token changes and RootNavigator swaps to QuestionScreen.
    } catch (err) {
      const message = messageForError(err);
      setError(message);
      Alert.alert(pl.appTitle, message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>
        {isRegister ? pl.auth.registerTitle : pl.auth.loginTitle}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={pl.auth.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={pl.auth.password}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder={pl.auth.nickname}
          autoCapitalize="none"
          autoCorrect={false}
          value={nickname}
          onChangeText={setNickname}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        testID="auth-submit"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegister ? pl.auth.submitRegister : pl.auth.submitLogin}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleMode} style={styles.switch}>
        <Text style={styles.switchText}>
          {isRegister ? pl.auth.switchToLogin : pl.auth.switchToRegister}
        </Text>
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
    fontSize: 24,
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
  switch: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#555',
    fontSize: 14,
  },
});
