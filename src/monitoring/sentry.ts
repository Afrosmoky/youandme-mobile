// The only module that talks to the Sentry SDK (P11 S4). Everything else —
// config values, scrubbing — sits in modules with no native dependency, so this
// file stays small enough to read in one go and audit for what we send.

import type React from 'react';
import * as Sentry from '@sentry/react-native';
import {
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE,
} from '../config/sentry';
import { scrubBreadcrumb, scrubEvent } from './scrub';

/**
 * Starts crash reporting.
 *
 * Must be called as the very first thing in `index.js`, before the FCM and
 * notifee background handlers are registered. Those handlers run in a headless
 * process with no App rendered — a separate entry into the same bundle — so an
 * init that lived in `App.tsx` would leave every background push crash
 * unreported. Being first also means the SDK's global error handlers are in
 * place before any of our module-scope work can throw.
 */
export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: SENTRY_ENABLED,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,

    // `release` and `dist` are deliberately not set. The SDK reads them from
    // the native layer (bundle id, version, build number), which is the same
    // string sentry-cli stamps when it uploads source maps — a hand-written
    // constant would drift from build.gradle/pbxproj on the first version bump
    // and quietly stop stacks from being symbolicated.

    // --- Everything below is about not seeing the couple's data. ---

    // No IP address, no user identity, no cookies or headers. We never call
    // Sentry.setUser either: a crash is attributable to a build, not a person.
    sendDefaultPii: false,
    // Would attach request and response bodies of failed HTTP calls — which for
    // this app means the answer being saved. Off by default in the SDK; stated
    // here so that turning it on has to be a deliberate edit.
    enableCaptureFailedRequests: false,
    // A screenshot of a crash in this app is a photograph of what two people
    // wrote to each other. Same for the view hierarchy, which carries the text
    // of every rendered node.
    attachScreenshot: false,
    attachViewHierarchy: false,
    // Structured logs would forward console output to Sentry.
    enableLogs: false,

    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

/**
 * Wraps the root component in Sentry's touch/profiler boundaries.
 *
 * `extractTextFromChildren: false` is the load-bearing part. It defaults to
 * TRUE in the SDK, and text masking only kicks in when Session Replay is
 * enabled (which it is not, and will not be) — so with the default, every tap
 * walks the component tree and writes the touched components' visible text into
 * a breadcrumb. One tap on a memory card would put that memory in the next
 * crash report. With it off, the touch breadcrumb falls back to
 * accessibilityLabel, then aria-label, then testID; we set no accessibility
 * labels anywhere, and our testIDs are `{screen}-{field}` slugs.
 */
export function wrapWithSentry<P extends Record<string, unknown>>(
  RootComponent: React.ComponentType<P>,
): React.ComponentType<P> {
  return Sentry.wrap(RootComponent, {
    touchEventBoundaryProps: { extractTextFromChildren: false },
  });
}
