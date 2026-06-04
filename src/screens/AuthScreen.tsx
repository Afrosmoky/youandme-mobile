import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../auth/AuthContext';
import { validateNickname } from '../domain/validation';
import { RootStackParamList } from '../navigation/types';
import { pl } from '../i18n/pl';

type Mode = 'login' | 'register';

type AuthNav = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

// OAuth client IDs. webClientId is the backend's audience; iosClientId comes
// from GoogleService-Info.plist. Android is wired in a later round.
const GOOGLE_WEB_CLIENT_ID =
  '1050573934208-6s4a631jirskdjgpmlt5pbmu4sa9fnn5.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '1050573934208-9bkc5dv1jedoin87p8l5k281e343i2o1.apps.googleusercontent.com';

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
  const { login, register, signInWithGoogle } = useAuth();
  const navigation = useNavigation<AuthNav>();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const isRegister = mode === 'register';
  // In register mode the nickname must pass the front-side rules before we let
  // the user submit. Empty input shows no error yet, but still blocks submit.
  const nicknameOk = !isRegister || validateNickname(nickname).valid;

  const onNicknameChange = (value: string) => {
    setNickname(value);
    const result = validateNickname(value);
    setNicknameError(
      value.length > 0 && !result.valid ? result.error ?? null : null,
    );
  };

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
    setNicknameError(null);
  };

  // Google is always a sign-in (the backend creates the account on first use),
  // so the button behaves the same in login and register mode.
  const onGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success' || !response.data.idToken) {
        // Cancelled, or no token returned — treat as a soft cancellation.
        Alert.alert(pl.appTitle, pl.auth.googleCancelled);
        return;
      }
      await signInWithGoogle(response.data.idToken);
      // On success the token changes and RootNavigator swaps to QuestionScreen.
    } catch (err) {
      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        Alert.alert(pl.appTitle, pl.auth.googleCancelled);
        return;
      }
      Alert.alert(pl.appTitle, pl.auth.googleSignInError);
    } finally {
      setGoogleSubmitting(false);
    }
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
        <>
          <TextInput
            testID="auth-nickname"
            style={styles.input}
            placeholder={pl.auth.nickname}
            autoCapitalize="none"
            autoCorrect={false}
            value={nickname}
            onChangeText={onNicknameChange}
          />
          {nicknameError && (
            <Text testID="auth-nickname-error" style={styles.error}>
              {nicknameError}
            </Text>
          )}
        </>
      )}

      {!isRegister && (
        <TouchableOpacity
          testID="auth-forgot-password"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgot}>
          <Text style={styles.forgotText}>{pl.auth.forgotPassword}</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        testID="auth-submit"
        style={[
          styles.button,
          (submitting || !nicknameOk) && styles.buttonDisabled,
        ]}
        onPress={onSubmit}
        disabled={submitting || !nicknameOk}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegister ? pl.auth.submitRegister : pl.auth.submitLogin}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        testID="auth-google"
        style={[styles.googleButton, googleSubmitting && styles.buttonDisabled]}
        onPress={onGoogleSignIn}
        disabled={googleSubmitting}>
        {googleSubmitting ? (
          <ActivityIndicator color="#333" />
        ) : (
          <Text style={styles.googleButtonText}>{pl.auth.googleSignIn}</Text>
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
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotText: {
    color: '#555',
    fontSize: 14,
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
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  googleButtonText: {
    color: '#333',
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
