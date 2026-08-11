import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Banner } from '../components/Banner';
import { GlowBackground } from '../components/GlowBackground';
import { GoldButton } from '../components/GoldButton';
import { PasswordInput } from '../components/PasswordInput';
import { parseApiError, FieldErrors } from '../api/errors';
import { useResetPassword } from '../queries/useResetPassword';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, email } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Backend errors keyed to fields not shown here (e.g. errors.email for an
  // expired token) have nowhere to render inline, so we surface the topLevel
  // message as a banner above the form.
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const { mutate: submitReset, isPending } = useResetPassword();

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = !tooShort && password === confirm;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.resetPassword.title}</Text>
      ),
    });
  }, [navigation, styles, theme]);

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

  const onSubmit = () => {
    if (!valid) {
      return;
    }
    setFieldErrors({});
    setTopLevelError(null);
    submitReset(
      { token, email, password, passwordConfirmation: confirm },
      {
        onSuccess: () => {
          Alert.alert(pl.appTitle, pl.resetPassword.successAlert);
          navigation.navigate('Auth');
        },
        onError: err => {
          const parsed = parseApiError(err, pl.resetPassword.errorAlert);
          setFieldErrors(parsed.fields);
          // Always surface the banner — field errors keyed to email/token are
          // invisible otherwise, leaving submit looking like a no-op.
          setTopLevelError(parsed.topLevel);
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      testID="reset-password-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowBackground size={360} intensity={0.35} style={styles.glow} />

      {topLevelError && (
        <Banner
          variant="error"
          testID="reset-password-banner"
          title={topLevelError}
          style={styles.banner}
        />
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

      <GoldButton
        testID="reset-password-submit"
        title={pl.resetPassword.submit}
        onPress={onSubmit}
        loading={isPending}
        disabled={isPending || !valid}
        style={styles.submit}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    // Same recipe as AuthScreen and ForgotPassword: a short form centred on the
    // dark background, so KeyboardAvoidingView rather than ScreenContainer.
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      backgroundColor: colors.bg.base,
    },
    glow: {
      justifyContent: 'flex-start',
      paddingTop: spacing.xxxl,
    },
    banner: {
      marginBottom: spacing.lg,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    submit: {
      marginTop: spacing.xs,
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
  });
};
