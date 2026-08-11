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
import { parseApiError, FieldErrors } from '../api/errors';
import { useRequestPasswordReset } from '../queries/useRequestPasswordReset';
import { GlowBackground } from '../components/GlowBackground';
import { GoldButton } from '../components/GoldButton';
import { TextField } from '../components/TextField';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// Basic shape check only; the backend stays the source of truth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { mutate: sendReset, isPending } = useRequestPasswordReset();

  const emailValid = EMAIL_PATTERN.test(email);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.forgotPassword.title}</Text>
      ),
    });
  }, [navigation, styles, theme]);

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

  const onSubmit = () => {
    if (!emailValid) {
      Alert.alert(pl.appTitle, pl.forgotPassword.invalidEmail);
      return;
    }
    setFieldErrors({});
    sendReset(email, {
      onSuccess: () => {
        Alert.alert(pl.appTitle, pl.forgotPassword.sentToast);
        navigation.goBack();
      },
      onError: err => {
        const parsed = parseApiError(err, pl.forgotPassword.error);
        setFieldErrors(parsed.fields);
        // No field detail (network, 500): fall back to the banner alert.
        if (Object.keys(parsed.fields).length === 0) {
          Alert.alert(pl.appTitle, parsed.topLevel);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      testID="forgot-password-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowBackground size={360} intensity={0.35} style={styles.glow} />

      {/* TextField renders the inline error as `${testID}-error`, which is the
          same id the screen used to put on a hand-rolled Text. */}
      <TextField
        testID="forgot-password-email"
        value={email}
        onChangeText={onEmailChange}
        placeholder={pl.forgotPassword.email}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <GoldButton
        testID="forgot-password-submit"
        title={pl.forgotPassword.submit}
        onPress={onSubmit}
        loading={isPending}
        disabled={isPending || !emailValid}
        style={styles.submit}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    // Same recipe as AuthScreen: this stack centres a short form on the dark
    // background rather than scrolling a padded page, so it keeps the
    // KeyboardAvoidingView instead of ScreenContainer.
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
