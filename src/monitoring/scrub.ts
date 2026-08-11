// Scrubbing layer between the app and Sentry (P11 S4).
//
// This app holds the private answers of two people. Sentry has to see that
// something crashed, where, and in which build — it must never see what the
// couple wrote. Everything here runs on the event on its way out, after the SDK
// has assembled it and before it is sent.
//
// Deliberately free of any runtime import from `@sentry/react-native`: the two
// functions are plain data transforms, so they are unit-testable without the
// native module. Only types are imported, and those are erased at build time.

import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/**
 * Keys whose values are content rather than diagnostics.
 *
 * Compared after normalising (lowercased, non-alphanumerics dropped), so
 * `answer_a`, `answerA` and `Answer-A` all match the same entry. Anything
 * carrying what a person typed, what was asked, or who they are.
 */
const SENSITIVE_KEYS = new Set([
  'answer',
  'answera',
  'answerb',
  'question',
  'questiontext',
  'text',
  'body',
  'content',
  'note',
  'memory',
  'memories',
  'nickname',
  'email',
  'password',
  'token',
  'idtoken',
  'authorization',
]);

const REDACTED = '[redacted]';

/** How deep to walk a nested object before giving up. */
const MAX_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/**
 * Replaces the value of every sensitive key anywhere in `value`, in place.
 *
 * In place rather than by copy because Sentry hands us the event it is about to
 * serialise and expects it back; rebuilding it would drop the prototypes the
 * SDK relies on. Cycles are guarded (an event can reference the same context
 * object twice) and depth is capped, so a pathological structure cannot hang
 * the send path.
 */
function redactInPlace(value: unknown, seen: WeakSet<object>, depth = 0): void {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach(item => redactInPlace(item, seen, depth + 1));
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (isSensitiveKey(key)) {
      record[key] = REDACTED;
      continue;
    }
    redactInPlace(record[key], seen, depth + 1);
  }
}

/**
 * Drops the query string from a URL, keeping the path.
 *
 * The path is diagnostics — `/api/v1/memories/{ulid}` tells us which endpoint
 * broke, and a ulid is an identifier, not content. A query string is where
 * tokens and free text end up, so it goes.
 */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Rewrites a zod validation failure so it carries no payload.
 *
 * `ZodError.message` in zod 4 is a JSON dump of the issue list, and some issue
 * codes carry the value that failed — which, for a response from
 * `/api/v1/memories`, is a memory. We keep what makes the error actionable (the
 * issue codes and the paths they failed at) and drop everything else.
 */
function summarizeZodError(value: string): string {
  try {
    const issues: unknown = JSON.parse(value);
    if (!Array.isArray(issues)) {
      return 'ZodError (contents removed)';
    }
    const summary = issues
      .map(issue => {
        const { code, path } = (issue ?? {}) as {
          code?: unknown;
          path?: unknown;
        };
        const where = Array.isArray(path) && path.length ? path.join('.') : '<root>';
        return `${typeof code === 'string' ? code : 'issue'} @ ${where}`;
      })
      .join(', ');
    return `ZodError: ${summary || '<no issues>'}`;
  } catch {
    // Not the JSON shape we expected — say nothing rather than guess.
    return 'ZodError (contents removed)';
  }
}

function isZodErrorType(type: string | undefined): boolean {
  return type === 'ZodError' || type === '$ZodError';
}

/**
 * `beforeSend`: last gate before an event leaves the device.
 *
 * Structural drops first (whole sections that exist only to carry payloads),
 * then the zod special case, then the key walk over what is left.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // Request bodies and headers. Nothing here is worth the risk: our failing
  // requests carry the answer being saved, and the headers carry the Sanctum
  // token.
  delete event.request;
  // `extra` is the free-form bag; anything that ever lands there arrived from a
  // call site we would have to audit one by one.
  delete event.extra;

  if (event.contexts) {
    delete event.contexts.response;
    delete event.contexts.state;
  }

  event.exception?.values?.forEach(exception => {
    if (isZodErrorType(exception.type) && typeof exception.value === 'string') {
      exception.value = summarizeZodError(exception.value);
    }
  });

  redactInPlace(event, new WeakSet());
  return event;
}

/**
 * `beforeBreadcrumb`: gate on the trail of what happened before the crash.
 *
 * Returning `null` drops the crumb entirely.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console output is dropped wholesale. We log nothing ourselves (there is no
  // console call in src/), so every crumb in this category comes from React
  // Native or a library and is not worth the chance that one of them prints
  // something we handed it.
  if (breadcrumb.category === 'console') {
    return null;
  }

  const url = breadcrumb.data?.url;
  if (breadcrumb.data && typeof url === 'string') {
    breadcrumb.data.url = stripQuery(url);
  }

  redactInPlace(breadcrumb.data, new WeakSet());
  return breadcrumb;
}
