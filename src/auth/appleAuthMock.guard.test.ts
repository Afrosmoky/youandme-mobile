// Node types are pulled in for this file alone. tsconfig narrows `types` to
// ["jest"] on purpose — app code must not typecheck against APIs React Native
// does not have — but this guard genuinely reads the library from disk.
/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

// Guard against the Apple sign-in mock drifting from the library it stands in
// for.
//
// The library's typings declare its enums as `declare enum`, so
// `import { AppleError }` type-checks and is undefined at runtime. The mock in
// jest.setup.js used to export those enums by name, which made the tests agree
// with the mock while the device threw on the first tap of the Apple button.
// The real module cannot be loaded under Jest (ESM, native module), so its
// source is read as text instead: whatever the mock claims to export, the
// library has to export too, and the enum values the mock carries have to be the
// ones the library defines.
const LIB = join(
  __dirname,
  '../../node_modules/@invertase/react-native-apple-authentication/lib',
);
const indexSource = readFileSync(join(LIB, 'index.js'), 'utf8');
const moduleSource = readFileSync(join(LIB, 'AppleAuthModule.js'), 'utf8');

// The named exports of lib/index.js, in the few forms ES modules allow.
function exportedNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const m of source.matchAll(
    /export\s+(?:const|let|var|function|class)\s+(\w+)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const spec of m[1].split(',')) {
      const parts = spec.trim().split(/\s+as\s+/);
      const name = parts[parts.length - 1].trim();
      if (name) {
        names.add(name);
      }
    }
  }
  if (/export\s+default\b/.test(source)) {
    names.add('default');
  }
  return names;
}

// A class field such as `Error = { UNKNOWN: '1000', ... };`, parsed to an
// object. Only flat string/number literals, which is all these fields hold.
function classField(source: string, field: string): Record<string, unknown> {
  const block = source.match(
    new RegExp(`\\n\\s*${field}\\s*=\\s*\\{([^}]*)\\}`),
  );
  if (!block) {
    throw new Error(`AppleAuthModule.js no longer defines the ${field} field`);
  }
  const entries = [...block[1].matchAll(/(\w+)\s*:\s*('[^']*'|\d+)/g)].map(
    ([, key, raw]) =>
      [key, raw.startsWith("'") ? raw.slice(1, -1) : Number(raw)] as const,
  );
  return Object.fromEntries(entries);
}

const mocked = jest.requireMock<Record<string, unknown>>(
  '@invertase/react-native-apple-authentication',
);
const mockedAppleAuth = mocked.appleAuth as Record<string, unknown>;

describe('the Apple sign-in mock matches the library', () => {
  test('the library source is parsed (the check is not vacuous)', () => {
    expect(exportedNames(indexSource).has('appleAuth')).toBe(true);
    // `export *` would hide names from this parser; fail loudly if it appears.
    expect(indexSource).not.toMatch(/export\s*\*/);
  });

  test('every named export of the mock is a runtime export of the library', () => {
    const real = exportedNames(indexSource);
    const claimed = Object.keys(mocked).filter(key => key !== '__esModule');

    expect(claimed.filter(name => !real.has(name))).toEqual([]);
  });

  test('every member of the mocked appleAuth exists on the real instance', () => {
    const missing = Object.keys(mockedAppleAuth).filter(
      key =>
        !new RegExp(
          `(\\n\\s*${key}\\s*=|\\bget\\s+${key}\\s*\\(|\\n\\s*${key}\\s*\\()`,
        ).test(moduleSource),
    );

    expect(missing).toEqual([]);
  });

  test.each(['Error', 'Operation', 'Scope'])(
    'appleAuth.%s carries the library values',
    field => {
      expect(mockedAppleAuth[field]).toEqual(classField(moduleSource, field));
    },
  );
});
