import { readFileSync } from 'fs';
import { join } from 'path';

// ios/sentry.properties and android/sentry.properties are committed, because
// the org, project and region URL are not secrets. The auth token is, and the
// Sentry wizard writes it straight into exactly these two files without
// gitignoring them. We do not run the wizard, but this test is what makes that
// decision survive someone trying it later.

const PROPERTIES_FILES = ['ios/sentry.properties', 'android/sentry.properties'];

describe.each(PROPERTIES_FILES)('%s', file => {
  const contents = readFileSync(join(__dirname, '../..', file), 'utf8');

  it('contains no auth token', () => {
    expect(contents).not.toMatch(/^\s*auth\.token\s*=/m);
  });

  it('names the EU region host, not sentry.io', () => {
    // An EU-region org uploads to de.sentry.io; the wrong host fails the
    // release build with a 404 that reads like a permissions problem.
    expect(contents).toMatch(/^defaults\.url=https:\/\/de\.sentry\.io\/$/m);
  });
});
