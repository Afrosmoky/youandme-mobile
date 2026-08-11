import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// The address comes from the build type (see src/config/api.ts). It used to
// read process.env.JAITY_API_URL with a platform default behind it, which
// promised an override that could never happen: nothing inlines env vars into
// this bundle, so that lookup was always undefined and every release build
// shipped with localhost baked in.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
