import {readdirSync, readFileSync, statSync} from 'fs';
import {join} from 'path';

/**
 * The hard boundary of 3C: glow goes on headings, the wordmark and the heart —
 * never on the text people actually read.
 *
 * This is an ALLOW-LIST rather than a ban-list, and deliberately so. A ban-list
 * only catches the names somebody thought of; an allow-list makes every new glow
 * anywhere in the app a conscious act, because adding one fails this test until
 * the style is named here on purpose.
 *
 * The reason it needs guarding at all is the trap this slice uncovered: the
 * question body is rendered in the HEADING typeface at the h2 size
 * (DailyCardScreen, QuestionScreen, LocalGameScreen all do `family.heading` +
 * `size.h2`). So neither the font nor the size can tell a heading from the
 * content — only intent can, and intent is exactly what a test can pin down.
 */
const ALLOWED = new Set([
  // Screen titles, in the native header and in the body.
  'headerTitle',
  'title',
  // The wordmark's two spans (Logo). A shadow on a parent Text is not inherited
  // by nested ones, so it has to sit on each.
  'word',
  'amp',
  // SectionLabel's own two states: the gold caps glow, `flat` is the prepared
  // escape hatch that switches it off.
  'glow',
  'flat',
]);

// Where a glow must never appear, spelled out so the failure message can say
// what rule was broken rather than just which key was unexpected.
const FORBIDDEN_EXAMPLES = [
  'question',
  'questionBody',
  'answer',
  'body',
  'date',
  'playerLabel',
  'hint',
  'tileHint',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** Every style key that spreads or assigns a glow token, with its file. */
function glowUses(): {file: string; key: string}[] {
  const uses: {file: string; key: string}[] = [];
  for (const file of sourceFiles(join(__dirname, '..'))) {
    // tokens.ts declares the sets; theme.ts re-exports them. Neither applies one.
    if (/theme[\\/](tokens|theme)\.ts$/.test(file)) {
      continue;
    }
    let key = '(poza stylem)';
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      // A top-level entry of StyleSheet.create, with or without a block: style
      // properties sit at six spaces, so four is exactly the key level. Matching
      // only `key: {` would mis-attribute the one-line entries (SectionLabel's
      // `glow:` and `flat:`) to whichever block happened to open last.
      const opening = line.match(/^\s{4}(\w+):/);
      if (opening) {
        key = opening[1];
      }
      if (/(\.\.\.|: )(theme\.)?glow\./.test(line)) {
        uses.push({file: file.replace(/.*\/src\//, 'src/'), key});
      }
    }
  }
  return uses;
}

describe('the glow boundary', () => {
  // If this fails, the fix is almost never "add the key to ALLOWED". Read the
  // style first: if it holds something a couple reads rather than something they
  // navigate by, the glow is what is wrong.
  test('only named heading-ish styles carry a glow', () => {
    const offenders = glowUses().filter(use => !ALLOWED.has(use.key));

    expect(offenders).toEqual([]);
  });

  // The list above is only meaningful while it is actually reached, so this
  // fails if the scan stops finding anything — a refactor that renames the token
  // would otherwise turn the guard green by making it blind.
  test('the scan actually finds the glows that exist', () => {
    const keys = new Set(glowUses().map(use => use.key));

    expect(keys.has('headerTitle')).toBe(true);
    expect(keys.has('word')).toBe(true);
    expect(keys.size).toBeGreaterThan(2);
  });

  // The specific styles this slice must not touch, checked by name rather than
  // by inference — these are the ones that carry what people read.
  test('nothing a couple reads is allowed to glow', () => {
    const glowing = new Set(glowUses().map(use => use.key));

    for (const forbidden of FORBIDDEN_EXAMPLES) {
      expect(glowing.has(forbidden)).toBe(false);
    }
  });
});
