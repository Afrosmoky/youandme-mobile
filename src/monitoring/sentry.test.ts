import * as Sentry from '@sentry/react-native';
import { initSentry, wrapWithSentry } from './sentry';
import { scrubBreadcrumb, scrubEvent } from './scrub';

// The init options are a privacy decision, not a preference. Each assertion
// below corresponds to a way the SDK would otherwise collect what two people
// wrote to each other, so a future "let's turn this on and see" has to break a
// test that says why.

const init = Sentry.init as jest.Mock;
const wrap = Sentry.wrap as jest.Mock;

describe('initSentry', () => {
  beforeEach(() => {
    init.mockClear();
    initSentry();
  });

  const options = () => init.mock.calls[0][0];

  it('sends to the EU ingest host', () => {
    expect(options().dsn).toContain('.ingest.de.sentry.io/');
  });

  it('stays silent in development so dev noise never reaches the quota', () => {
    // __DEV__ is true under Jest, which is exactly the dev build case.
    expect(options().enabled).toBe(false);
    expect(options().environment).toBe('dev');
  });

  it('collects no personal information', () => {
    expect(options().sendDefaultPii).toBe(false);
  });

  it('never attaches screenshots, view hierarchies or failed request bodies', () => {
    expect(options().attachScreenshot).toBe(false);
    expect(options().attachViewHierarchy).toBe(false);
    expect(options().enableCaptureFailedRequests).toBe(false);
    expect(options().enableLogs).toBe(false);
  });

  it('has no replay configured, which is what keeps replay out of the build', () => {
    expect(options().replaysSessionSampleRate).toBeUndefined();
    expect(options().replaysOnErrorSampleRate).toBeUndefined();
  });

  it('routes every event and breadcrumb through the scrubbers', () => {
    expect(options().beforeSend).toBe(scrubEvent);
    expect(options().beforeBreadcrumb).toBe(scrubBreadcrumb);
  });

  it('leaves release and dist to the native layer', () => {
    // A hand-written release would drift from build.gradle/pbxproj and stop
    // source maps from applying. See the comment in sentry.ts.
    expect(options().release).toBeUndefined();
    expect(options().dist).toBeUndefined();
  });

  it('samples traces sparingly', () => {
    expect(options().tracesSampleRate).toBe(0.1);
  });
});

describe('wrapWithSentry', () => {
  it('turns off text extraction from touched components', () => {
    wrap.mockClear();
    const Root = () => null;

    wrapWithSentry(Root);

    // The SDK default is true, and masking only applies with Session Replay on.
    // Left alone, a tap on a memory card writes that memory into a breadcrumb.
    expect(wrap.mock.calls[0][1].touchEventBoundaryProps).toEqual({
      extractTextFromChildren: false,
    });
  });
});
