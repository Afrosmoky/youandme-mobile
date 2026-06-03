import { pl } from '../i18n/pl';

// Front-side nickname rules, mirrored from youandme-api. Keep in sync with the
// backend validator; the front check only spares a round-trip and gives an
// instant message — the backend stays the source of truth.
const NICKNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const RESERVED_NICKNAMES = [
  'admin',
  'support',
  'help',
  'root',
  'system',
  'youandme',
  'jaity',
  'mod',
  'moderator',
  'official',
];

export type NicknameValidation = { valid: boolean; error?: string };

export function validateNickname(value: string): NicknameValidation {
  if (!NICKNAME_PATTERN.test(value)) {
    return { valid: false, error: pl.auth.nicknameInvalid };
  }
  if (RESERVED_NICKNAMES.includes(value)) {
    return { valid: false, error: pl.auth.nicknameReserved };
  }
  return { valid: true };
}
