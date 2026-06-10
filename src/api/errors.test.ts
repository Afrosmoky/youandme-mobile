import axios from 'axios';
import {parseApiError} from './errors';
import {pl} from '../i18n/pl';

describe('parseApiError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  test('returns the network error message when there is no response', () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const result = parseApiError({message: 'Network Error'}, 'fallback');

    expect(result).toEqual({topLevel: pl.common.networkError, fields: {}});
  });

  test('returns the server error message for a 5xx', () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const result = parseApiError({response: {status: 500}}, 'fallback');

    expect(result).toEqual({topLevel: pl.common.serverError, fields: {}});
  });

  test('returns invalid credentials for a 401', () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const result = parseApiError({response: {status: 401}}, 'fallback');

    expect(result.topLevel).toBe(pl.auth.invalidCredentials);
  });

  test('returns the too-many-attempts message for a 429', () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const result = parseApiError({response: {status: 429}}, 'fallback');

    expect(result.topLevel).toBe(pl.auth.tooManyAttempts);
  });

  test('extracts per-field messages and the top-level message from a 422', () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const result = parseApiError(
      {
        response: {
          status: 422,
          data: {
            message: 'Ten nick jest już zajęty.',
            errors: {nickname: ['Ten nick jest już zajęty.']},
          },
        },
      },
      'fallback',
    );

    expect(result.topLevel).toBe('Ten nick jest już zajęty.');
    expect(result.fields).toEqual({nickname: 'Ten nick jest już zajęty.'});
  });

  test('returns the fallback for a non-axios error', () => {
    const result = parseApiError(new Error('boom'), 'fallback');

    expect(result).toEqual({topLevel: 'fallback', fields: {}});
  });
});
