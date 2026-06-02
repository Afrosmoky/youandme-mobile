import axios from 'axios';
import { Platform } from 'react-native';

// iOS simulator reaches the host backend via localhost; the Android emulator
// maps the host machine to 10.0.2.2. Override both with JAITY_API_URL when
// pointing at a non-local backend.
const defaultBaseURL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: process.env.JAITY_API_URL ?? defaultBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// The current Sanctum token, kept in module scope so the request interceptor
// can read it without importing AuthContext (which would be a cycle).
// AuthContext is the single writer via setAuthToken.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

apiClient.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
