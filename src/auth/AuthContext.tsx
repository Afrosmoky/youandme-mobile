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
import { AuthResponse, Couple, User } from '../domain/types';

type AuthContextValue = {
  user: User | null;
  // The user's couple (P3: auto-created at registration). Null until the first
  // authenticated response (login/register/google) or a /me refresh.
  couple: Couple | null;
  token: string | null;
  loading: boolean;
  login: (input: authApi.LoginInput) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  // Exchanges a Google ID token for a session and stores it like a login.
  signInWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  // Refetches the current user + couple from /me into the cache.
  refreshUser: () => Promise<void>;
  // Replaces the cached user directly (e.g. with the result of PATCH /me).
  setUser: (user: User) => void;
  // Replaces the cached couple directly (e.g. with the result of PATCH /me).
  setCouple: (couple: Couple | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
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
      setCouple(data.couple);
      setToken(data.token);
    };

    return {
      user,
      couple,
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
        setCouple(null);
        setToken(null);
      },
      refreshUser: async () => {
        const { user: freshUser, couple: freshCouple } = await fetchMe();
        setUser(freshUser);
        setCouple(freshCouple);
      },
      setUser: nextUser => {
        setUser(nextUser);
      },
      setCouple: nextCouple => {
        setCouple(nextCouple);
      },
    };
  }, [user, couple, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
