import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAuthToken } from '../api/client';
import * as authApi from '../api/auth';
import { fetchMe } from '../api/profile';
import { clearToken, loadToken, saveToken } from './storage';
import { AuthResponse, User } from '../domain/types';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (input: authApi.LoginInput) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  // Exchanges a Google ID token for a session and stores it like a login.
  signInWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  // Refetches the current user from /me into the cache.
  refreshUser: () => Promise<void>;
  // Replaces the cached user directly (e.g. with the result of PATCH /me).
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On cold start, restore the token from the keychain. P1 has no /me endpoint,
  // so `user` stays null until the next login/register; the navigator gates on
  // `token`, not `user`.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await loadToken();
        if (active && stored) {
          setAuthToken(stored);
          setToken(stored);
        }
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

  const value = useMemo<AuthContextValue>(() => {
    const applyAuth = async (data: AuthResponse) => {
      setAuthToken(data.token);
      await saveToken(data.token);
      setUser(data.user);
      setToken(data.token);
    };

    return {
      user,
      token,
      loading,
      login: async input => {
        await applyAuth(await authApi.login(input));
      },
      register: async input => {
        await applyAuth(await authApi.register(input));
      },
      signInWithGoogle: async idToken => {
        await applyAuth(await authApi.signInWithGoogle(idToken));
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Best-effort: clear local state even if the request fails.
        }
        await clearToken();
        setAuthToken(null);
        setUser(null);
        setToken(null);
      },
      refreshUser: async () => {
        setUser(await fetchMe());
      },
      setUser: nextUser => {
        setUser(nextUser);
      },
    };
  }, [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
