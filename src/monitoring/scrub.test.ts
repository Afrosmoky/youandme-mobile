import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import { scrubBreadcrumb, scrubEvent, stripQuery } from './scrub';

// Guards for the one thing this app cannot get wrong: the couple's answers are
// theirs. Every test here stands for a route by which a memory, an answer or an
// identity could otherwise reach Sentry.

const ANSWER = 'Pierwszy raz pomyslalem o tobie w autobusie linii 14';

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return { event_id: 'abc', ...overrides } as ErrorEvent;
}

describe('scrubEvent', () => {
  it('drops the request section, bodies and headers included', () => {
    const event = makeEvent({
      request: {
        url: 'https://api.example.test/api/v1/memories',
        data: { answer_a: ANSWER },
        headers: { Authorization: 'Bearer secret-token' },
      },
    });

    expect(scrubEvent(event).request).toBeUndefined();
  });

  it('drops the free-form extra bag', () => {
    const event = makeEvent({ extra: { answer: ANSWER, whatever: 'x' } });

    expect(scrubEvent(event).extra).toBeUndefined();
  });

  it('drops the response context', () => {
    const event = makeEvent({
      contexts: {
        response: { body: ANSWER },
        device: { model: 'Pixel 8' },
      },
    });

    const scrubbed = scrubEvent(event);

    expect(scrubbed.contexts?.response).toBeUndefined();
    // Diagnostics we do want are untouched.
    expect(scrubbed.contexts?.device).toEqual({ model: 'Pixel 8' });
  });

  it('redacts sensitive keys wherever they are nested', () => {
    const event = makeEvent({
      contexts: {
        payload: {
          question: 'Co cie w nim rozczula?',
          nested: { answerB: ANSWER, email: 'ktos@example.test' },
          safe: 'keep-me',
        },
      },
    });

    const payload = scrubEvent(event).contexts?.payload as Record<
      string,
      unknown
    >;

    expect(payload.question).toBe('[redacted]');
    expect(payload.safe).toBe('keep-me');
    expect(payload.nested).toEqual({
      answerB: '[redacted]',
      email: '[redacted]',
    });
  });

  it('matches sensitive keys regardless of casing or separators', () => {
    const event = makeEvent({
      contexts: { payload: { 'Answer-A': ANSWER, answer_b: ANSWER } },
    });

    expect(scrubEvent(event).contexts?.payload).toEqual({
      'Answer-A': '[redacted]',
      answer_b: '[redacted]',
    });
  });

  it('reduces a ZodError to issue codes and paths, dropping received values', () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: 'ZodError',
            value: JSON.stringify([
              {
                code: 'invalid_type',
                expected: 'string',
                path: ['data', 0, 'answer_a'],
                received: ANSWER,
              },
              { code: 'invalid_value', path: [], values: [ANSWER] },
            ]),
          },
        ],
      },
    });

    const value = scrubEvent(event).exception?.values?.[0].value ?? '';

    expect(value).not.toContain(ANSWER);
    expect(value).toContain('invalid_type @ data.0.answer_a');
    expect(value).toContain('invalid_value @ <root>');
  });

  it('says nothing when a ZodError message is not the shape we expect', () => {
    const event = makeEvent({
      exception: { values: [{ type: 'ZodError', value: ANSWER }] },
    });

    expect(scrubEvent(event).exception?.values?.[0].value).toBe(
      'ZodError (contents removed)',
    );
  });

  it('leaves an ordinary error and its stack alone', () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Cannot read property id of undefined',
            stacktrace: {
              frames: [{ filename: 'src/api/memories.ts', lineno: 42 }],
            },
          },
        ],
      },
    });

    const exception = scrubEvent(event).exception?.values?.[0];

    expect(exception?.value).toBe('Cannot read property id of undefined');
    expect(exception?.stacktrace?.frames?.[0]).toEqual({
      filename: 'src/api/memories.ts',
      lineno: 42,
    });
  });

  it('survives a cyclic event without hanging', () => {
    const cyclic: Record<string, unknown> = { answer: ANSWER };
    cyclic.self = cyclic;
    const event = makeEvent({ contexts: { cyclic } });

    const scrubbed = scrubEvent(event).contexts?.cyclic as Record<
      string,
      unknown
    >;

    expect(scrubbed.answer).toBe('[redacted]');
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console breadcrumbs entirely', () => {
    const breadcrumb: Breadcrumb = {
      category: 'console',
      message: `Saving: ${ANSWER}`,
    };

    expect(scrubBreadcrumb(breadcrumb)).toBeNull();
  });

  it('keeps an http path but drops its query string', () => {
    const breadcrumb: Breadcrumb = {
      category: 'xhr',
      data: {
        url: 'https://api.example.test/api/v1/memories?draft=' + ANSWER,
        method: 'GET',
        status_code: 200,
      },
    };

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.data?.url).toBe(
      'https://api.example.test/api/v1/memories',
    );
    expect(scrubbed?.data?.status_code).toBe(200);
  });

  it('redacts sensitive keys in breadcrumb data', () => {
    const breadcrumb: Breadcrumb = {
      category: 'touch',
      data: { path: [{ name: 'MemoryCard', label: 'memories-card' }] },
    };

    expect(scrubBreadcrumb(breadcrumb)?.data?.path).toEqual([
      { name: 'MemoryCard', label: 'memories-card' },
    ]);
  });
});

describe('stripQuery', () => {
  it.each([
    ['https://a.test/p?x=1', 'https://a.test/p'],
    ['https://a.test/p#frag', 'https://a.test/p'],
    ['https://a.test/p', 'https://a.test/p'],
  ])('%s -> %s', (input, expected) => {
    expect(stripQuery(input)).toBe(expected);
  });
});
