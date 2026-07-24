import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UpdateMeInput } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { useVerificationStatus } from '../queries/useVerificationStatus';
import { useUpdateMe } from '../queries/useUpdateMe';
import { useChangePassword } from '../queries/useChangePassword';
import { useResendVerification } from '../queries/useResendVerification';
import { PasswordInput } from '../components/PasswordInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { Banner } from '../components/Banner';
import { SectionLabel } from '../components/SectionLabel';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { claimShareReward } from '../api/share';
import { parseApiError, FieldErrors } from '../api/errors';
import { validateNickname } from '../domain/validation';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// P2 keeps the timezone picker to the two values the backend seeds; the full
// list lands in stage IV.
const TIMEZONES = ['Europe/Warsaw', 'UTC'];
const DEFAULT_TIMEZONE = 'Europe/Warsaw';

// P5 share target. Landing page placeholder until store links exist (P12). The
// URL is passed to Share separately from the message so the link is not doubled
// on Android (which appends url to message).
const SHARE_URL = 'https://jaity.app';

export function ProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // P3: user + couple come from the auth context (hydrated at startup by
  // BootstrapScreen, refreshed after login). The screen only fetches the
  // verification status itself.
  const { user, couple, logout, setUser, setCouple } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [timezone, setTimezone] = useState(user?.timezone ?? DEFAULT_TIMEZONE);
  const [partnerName, setPartnerName] = useState(
    couple?.partnerNameLocal ?? '',
  );

  // Server reads/writes go through TanStack; the form fields above stay local
  // client state.
  const {
    data: verification,
    isLoading,
    isError,
  } = useVerificationStatus();
  const { mutate: save, isPending: saving } = useUpdateMe();
  const { mutate: resend, isPending: resending } = useResendVerification();
  const { mutate: changePasswordMutate, isPending: changingPassword } =
    useChangePassword();

  // Change-password form is fully independent of the profile form above.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>(
    {},
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.profile.title}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  // Re-seed the editable fields whenever the cached user/couple change (initial
  // hydration, or after a successful save pushes fresh values back).
  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setTimezone(user.timezone ?? DEFAULT_TIMEZONE);
    }
    setPartnerName(couple?.partnerNameLocal ?? '');
  }, [user, couple]);

  // Mirror the pre-TanStack catch: a failed status load shows the same alert.
  // Fires once per transition into the error state (temporary pattern for this
  // slice; superseded when error UI lands in P11).
  useEffect(() => {
    if (isError) {
      Alert.alert(pl.appTitle, pl.profile.loadError);
    }
  }, [isError]);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onNicknameChange = (value: string) => {
    setNickname(value);
    clearFieldError('nickname');
    const result = validateNickname(value);
    setNicknameError(result.valid ? null : result.error ?? null);
  };

  const onPartnerNameChange = (value: string) => {
    setPartnerName(value);
    clearFieldError('partner_name_local');
  };

  const baseTimezone = user?.timezone ?? DEFAULT_TIMEZONE;
  const basePartnerName = couple?.partnerNameLocal ?? '';
  const dirty =
    user != null &&
    (nickname !== user.nickname ||
      timezone !== baseTimezone ||
      partnerName !== basePartnerName);
  const nicknameValid = validateNickname(nickname).valid;
  const canSave = dirty && nicknameValid && !saving;

  const onSave = () => {
    if (!user) {
      return;
    }
    const payload: UpdateMeInput = {};
    if (nickname !== user.nickname) {
      payload.nickname = nickname;
    }
    if (timezone !== baseTimezone) {
      payload.timezone = timezone;
    }
    if (partnerName !== basePartnerName) {
      // Empty input clears the partner name back to null.
      payload.partner_name_local = partnerName.trim() || null;
    }
    setFieldErrors({});
    save(payload, {
      onSuccess: ({ user: updatedUser, couple: updatedCouple }) => {
        setUser(updatedUser);
        setCouple(updatedCouple);
        Alert.alert(pl.appTitle, pl.profile.savedToast);
      },
      onError: err => {
        const parsed = parseApiError(err, pl.profile.saveError);
        setFieldErrors(parsed.fields);
        // No field detail (network, 500): fall back to the banner alert.
        if (Object.keys(parsed.fields).length === 0) {
          Alert.alert(pl.appTitle, parsed.topLevel);
        }
      },
    });
  };

  // Opens the native share sheet. Claims the reward only when the user actually
  // picks a target (sharedAction) — dismissing withdraws the gesture. The claim
  // is best-effort and idempotent server-side, so any failure stays silent (the
  // bonus is granted server-side; there is nothing local to correct).
  const onShare = async () => {
    try {
      const result = await Share.share({
        message: pl.share.message,
        url: SHARE_URL,
      });
      if (result.action === Share.sharedAction) {
        await claimShareReward();
        Alert.alert(pl.appTitle, pl.share.thanksToast);
      }
    } catch {
      // Share sheet failed to open, or the claim call failed — nothing to
      // recover here; the reward is idempotent and server-owned.
    }
  };

  const onResend = () => {
    resend(undefined, {
      onSuccess: () => {
        Alert.alert(pl.appTitle, pl.profile.verificationSentToast);
      },
      onError: () => {
        Alert.alert(pl.appTitle, pl.profile.saveError);
      },
    });
  };

  // Front-side mismatch check; only flagged once the user has typed a
  // confirmation, so the field is not red while still empty.
  const confirmError =
    confirmPassword.length > 0 && newPassword !== confirmPassword
      ? pl.profile.passwordsDoNotMatch
      : null;
  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !changingPassword;

  const onChangePassword = () => {
    setPasswordError(null);
    setPasswordFieldErrors({});
    changePasswordMutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert(pl.appTitle, pl.profile.passwordChanged);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: err => {
          const parsed = parseApiError(err, pl.profile.passwordChangeError);
          setPasswordError(parsed.topLevel);
          setPasswordFieldErrors(parsed.fields);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer testID="profile-screen">
      {verification && !verification.verified && (
        <Banner
          variant="warning"
          title={pl.profile.verifyBadge}
          action={pl.profile.resendVerification}
          onAction={onResend}
          actionLoading={resending}
          actionTestID="profile-resend-verification"
          style={styles.banner}
        />
      )}

      <TextField
        label={pl.profile.email}
        value={user?.email ?? ''}
        editable={false}
      />

      <TextField
        label={pl.profile.nickname}
        testID="profile-nickname"
        value={nickname}
        onChangeText={onNicknameChange}
        error={nicknameError ?? fieldErrors.nickname}
        autoCapitalize="none"
      />

      <TextField
        label={pl.profile.partnerName}
        testID="profile-partner-name"
        value={partnerName}
        onChangeText={onPartnerNameChange}
        error={fieldErrors.partner_name_local}
        hint={pl.profile.partnerNameHint}
      />

      <SectionLabel style={styles.tzLabel}>
        {pl.profile.timezone}
      </SectionLabel>
      <View style={styles.tzRow}>
        {TIMEZONES.map(tz => {
          const active = tz === timezone;
          return (
            <TouchableOpacity
              key={tz}
              testID={`profile-tz-${tz}`}
              style={[styles.tzOption, active && styles.tzOptionActive]}
              onPress={() => setTimezone(tz)}>
              <Text style={active ? styles.tzTextActive : styles.tzText}>
                {tz}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextField
        label={pl.profile.locale}
        value={user?.locale ?? 'pl'}
        editable={false}
      />

      <GoldButton
        testID="profile-save"
        title={pl.profile.save}
        onPress={onSave}
        disabled={!canSave}
        loading={saving}
        style={styles.saveButton}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {pl.profile.changePasswordTitle}
        </Text>

        {passwordError && (
          <Text testID="profile-password-error" style={styles.passwordError}>
            {passwordError}
          </Text>
        )}

        <PasswordInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={pl.profile.currentPassword}
          testID="profile-current-password"
          error={passwordFieldErrors.current_password}
          autoComplete="password"
        />
        <PasswordInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={pl.profile.newPassword}
          testID="profile-new-password"
          error={passwordFieldErrors.new_password}
          autoComplete="new-password"
        />
        <PasswordInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={pl.profile.confirmPassword}
          testID="profile-confirm-password"
          error={confirmError ?? undefined}
          autoComplete="new-password"
        />

        <GoldButton
          testID="profile-change-password-submit"
          title={pl.profile.changePasswordButton}
          onPress={onChangePassword}
          disabled={!canChangePassword}
          loading={changingPassword}
          style={styles.changePasswordButton}
        />
      </View>

      <OutlineButton
        testID="profile-share"
        title={pl.profile.shareApp}
        onPress={onShare}
        style={styles.shareButton}
      />

      <TouchableOpacity
        testID="profile-logout"
        style={styles.logout}
        onPress={logout}>
        <Text style={styles.logoutText}>{pl.profile.logout}</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
    banner: {
      marginBottom: spacing.xl,
    },
    tzLabel: {
      marginBottom: spacing.sm,
    },
    tzRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
    },
    tzOption: {
      borderWidth: 1,
      borderColor: colors.border.subtle,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
    },
    tzOptionActive: {
      backgroundColor: colors.bg.goldTint,
      borderColor: colors.gold.borderStrong,
    },
    tzText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
    },
    tzTextActive: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    saveButton: {
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.xxl,
      paddingTop: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    sectionTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    passwordError: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    changePasswordButton: {
      marginTop: spacing.xs,
    },
    shareButton: {
      marginTop: spacing.xl,
    },
    logout: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    logoutText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.muted,
    },
  });
};
