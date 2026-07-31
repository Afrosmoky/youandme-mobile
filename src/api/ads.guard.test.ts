// Node types are pulled in for this file alone. tsconfig narrows `types` to
// ["jest"] on purpose — app code must not typecheck against APIs React Native
// does not have — but this guard genuinely reads the source tree from disk.
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Guard against the P6 client-side ad grant coming back.
//
// In P6 the client called POST /ad-reward after EARNED_REWARD and the server
// paid on its word. P7 moves the grant to the AdMob SSV webhook precisely
// because that was spoofable, and credits now buy real cards. Reintroducing the
// client path would not just double-grant — it would reopen the hole SSV was
// built to close, quietly, since the UI would look identical.
//
// This asserts over the source tree rather than over behaviour on purpose: the
// thing being prevented is code EXISTING, and no runtime test can notice a
// call that a future screen makes but today's tests never exercise.
const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('the P6 client-side ad grant stays removed', () => {
  const files = sourceFiles(SRC).filter(
    path => !path.endsWith('ads.guard.test.ts'),
  );

  test('finds source files to scan (the scan itself is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test('no module references claimAdReward', () => {
    const offenders = files.filter(path =>
      readFileSync(path, 'utf8').includes('claimAdReward'),
    );

    expect(offenders).toEqual([]);
  });

  test('no module posts to the bare /ad-reward endpoint', () => {
    // Matches '/ad-reward' as a complete string literal only, so the legitimate
    // '/ad-reward/nonce' does not trip the guard.
    const bareEndpoint = /['"`]\/ad-reward['"`]/;
    const offenders = files.filter(path =>
      bareEndpoint.test(readFileSync(path, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });
});
