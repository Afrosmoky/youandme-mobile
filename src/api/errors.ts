import axios from 'axios';
import { pl } from '../i18n/pl';

// One message per field — the first entry of each Laravel error array.
export type FieldErrors = Record<string, string>;

export interface ParsedApiError {
  // Banner above the form; fallback when there is no per-field detail.
  topLevel: string;
  // Per-input inline errors, keyed by field name (snake_case from the backend).
  fields: FieldErrors;
}

// Laravel 422 body shape: { message: string, errors: { field: string[] } }.
// We surface the first message from each field's array.
function extractFields(errors: unknown): FieldErrors {
  const fields: FieldErrors = {};
  if (errors && typeof errors === 'object') {
    for (const [key, value] of Object.entries(
      errors as Record<string, unknown>,
    )) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'string'
      ) {
        fields[key] = value[0];
      } else if (typeof value === 'string') {
        fields[key] = value;
      }
    }
  }
  return fields;
}

// Turns an API/network failure into a banner string plus per-field messages.
// `fallback` is the screen-specific message used for network and unexpected
// errors. 401/429 map to fixed Polish strings; 422 reads the backend payload.
export function parseApiError(err: unknown, fallback: string): ParsedApiError {
  if (axios.isAxiosError(err)) {
    // No response at all = network failure (connection refused, timeout, DNS).
    // Must be checked before status so it is not masked as a generic error.
    if (!err.response) {
      return { topLevel: pl.common.networkError, fields: {} };
    }

    const status = err.response.status;
    const data = err.response.data as
      | { message?: unknown; errors?: unknown }
      | undefined;

    if (status === 401) {
      return { topLevel: pl.auth.invalidCredentials, fields: {} };
    }
    if (status === 429) {
      return { topLevel: pl.auth.tooManyAttempts, fields: {} };
    }
    if (status === 422) {
      const fields = extractFields(data?.errors);
      const message =
        typeof data?.message === 'string' && data.message.length > 0
          ? data.message
          : Object.values(fields)[0] ?? fallback;
      return { topLevel: message, fields };
    }
    // 409 = a conflict the server can explain better than we can ("this code is
    // already redeemed on your account"). Added in P7 for redeem; before it,
    // 409 fell through to the caller's generic fallback, which made "already
    // redeemed" indistinguishable from a network failure. Screens that treat a
    // 409 as stale state rather than a message (the daily card, the question
    // screen) handle it themselves and never reach this helper.
    if (status === 409) {
      const message =
        typeof data?.message === 'string' && data.message.length > 0
          ? data.message
          : fallback;
      return { topLevel: message, fields: {} };
    }
    // Server-side failure: a concrete "try later", not the generic fallback.
    if (status >= 500) {
      return { topLevel: pl.common.serverError, fields: {} };
    }
  }
  return { topLevel: fallback, fields: {} };
}
