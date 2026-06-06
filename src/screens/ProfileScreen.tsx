import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  fetchMe,
  fetchVerificationStatus,
  resendVerificationEmail,
  updateMe,
  UpdateMeInput,
  VerificationStatus,
} from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { parseApiError, FieldErrors } from '../api/errors';
import { validateNickname } from '../domain/validation';
import { User } from '../domain/types';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// P2 keeps the timezone picker to the two values the backend seeds; the full
// list lands in stage IV.
const TIMEZONES = ['Europe/Warsaw', 'UTC'];
const DEFAULT_TIMEZONE = 'Europe/Warsaw';

export function ProfileScreen(_props: Props) {
  const { logout, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [baseUser, setBaseUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [verification, setVerification] = useState<VerificationStatus | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [me, status] = await Promise.all([
          fetchMe(),
          fetchVerificationStatus(),
        ]);
        if (!active) {
          return;
        }
        setBaseUser(me);
        setNickname(me.nickname);
        setTimezone(me.timezone ?? DEFAULT_TIMEZONE);
        setVerification(status);
      } catch {
        Alert.alert(pl.appTitle, pl.profile.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onNicknameChange = (value: string) => {
    setNickname(value);
    setFieldErrors(prev => {
      if (!prev.nickname) {
        return prev;
      }
      const next = { ...prev };
      delete next.nickname;
      return next;
    });
    const result = validateNickname(value);
    setNicknameError(result.valid ? null : result.error ?? null);
  };

  const baseTimezone = baseUser?.timezone ?? DEFAULT_TIMEZONE;
  const dirty =
    baseUser != null &&
    (nickname !== baseUser.nickname || timezone !== baseTimezone);
  const nicknameValid = validateNickname(nickname).valid;
  const canSave = dirty && nicknameValid && !saving;

  const onSave = async () => {
    if (!baseUser) {
      return;
    }
    const payload: UpdateMeInput = {};
    if (nickname !== baseUser.nickname) {
      payload.nickname = nickname;
    }
    if (timezone !== baseTimezone) {
      payload.timezone = timezone;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const updated = await updateMe(payload);
      setBaseUser(updated);
      setNickname(updated.nickname);
      setTimezone(updated.timezone ?? DEFAULT_TIMEZONE);
      setUser(updated);
      Alert.alert(pl.appTitle, pl.profile.savedToast);
    } catch (err) {
      const parsed = parseApiError(err, pl.profile.saveError);
      setFieldErrors(parsed.fields);
      // No field detail (network, 500): fall back to the banner alert.
      if (Object.keys(parsed.fields).length === 0) {
        Alert.alert(pl.appTitle, parsed.topLevel);
      }
    } finally {
      setSaving(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      Alert.alert(pl.appTitle, pl.profile.verificationSentToast);
    } catch {
      Alert.alert(pl.appTitle, pl.profile.saveError);
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      testID="profile-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {verification && !verification.verified && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pl.profile.verifyBadge}</Text>
          <TouchableOpacity
            testID="profile-resend-verification"
            onPress={onResend}
            disabled={resending}>
            {resending ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.badgeAction}>
                {pl.profile.resendVerification}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>{pl.profile.email}</Text>
      <Text style={styles.readonly}>{baseUser?.email}</Text>

      <Text style={styles.label}>{pl.profile.nickname}</Text>
      <TextInput
        testID="profile-nickname"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        value={nickname}
        onChangeText={onNicknameChange}
      />
      {(nicknameError ?? fieldErrors.nickname) && (
        <Text testID="profile-nickname-error" style={styles.error}>
          {nicknameError ?? fieldErrors.nickname}
        </Text>
      )}

      <Text style={styles.label}>{pl.profile.timezone}</Text>
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

      <Text style={styles.label}>{pl.profile.locale}</Text>
      <Text style={styles.readonly}>{baseUser?.locale ?? 'pl'}</Text>

      <TouchableOpacity
        testID="profile-save"
        style={[styles.button, !canSave && styles.buttonDisabled]}
        onPress={onSave}
        disabled={!canSave}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{pl.profile.save}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        testID="profile-logout"
        style={[styles.button, styles.logoutButton]}
        onPress={logout}>
        <Text style={styles.logoutButtonText}>{pl.profile.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#fff4e5',
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  badgeText: {
    color: '#8a5a00',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeAction: {
    color: '#0a84ff',
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  readonly: {
    fontSize: 16,
    color: '#222',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  tzRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tzOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  tzOptionActive: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  tzText: {
    color: '#333',
    fontSize: 15,
  },
  tzTextActive: {
    color: '#fff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b00020',
  },
  logoutButtonText: {
    color: '#b00020',
    fontSize: 16,
    fontWeight: '600',
  },
});
