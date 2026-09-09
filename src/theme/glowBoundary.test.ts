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
  // The one style behind every navigation-header title (ScreenTitle).
  'screenTitle',
  // Titles that live in a screen's body. Unlike the header ones these genuinely
  // differ — h1 or h2, gold or off-white, centred or not — so they were left as
  // their own styles rather than forced through one component.
  'title',
  // The wordmark's two spans (Logo). A shadow on a parent Text is not inherited
  // by nested ones, so it has to sit on each.
  'word',
  'amp',
  // SectionLabel's own two states: the gold caps glow, `flat` is the prepared
  // escape hatch that switches it off.
  'glow',
  'flat',
  // The like heart, glowing only while filled (LikeHeart).
  'heartGlow',
  'heartFlat',
]);

/**
 * Styles named outright, because a name-based rule is a heuristic and these are
 * the cases that actually matter.
 *
 * All five carry text a couple READS rather than navigates by. Three of them are
 * the trap that made this test necessary — the question body is set in the
 * heading typeface at the h2 size, so it looks like a heading to any rule based
 * on font or scale. The ritual body is the same shape of risk arriving from the
 * other side: its screen title DOES glow (it is a short label acting as the
 * screen's heading), and the body right underneath it must not, even though both
 * come from the same server payload.
 */
const PROTECTED: {file: string; key: string}[] = [
  {file: 'src/screens/DailyCardScreen.tsx', key: 'question'},
  {file: 'src/screens/QuestionScreen.tsx', key: 'questionBody'},
  {file: 'src/screens/LocalGameScreen.tsx', key: 'question'},
  {file: 'src/screens/RitualScreen.tsx', key: 'body'},
  {file: 'src/screens/MemoriesScreen.tsx', key: 'answer'},
];

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

  // The canary. The allow-list above is only meaningful while the scan actually
  // reaches something, so a refactor that renamed the token — or broke the
  // matcher — would otherwise turn every test here green by making it blind.
  //
  // Asserted by FILE rather than by style key: keys get renamed for good reasons
  // (3D collapsed fourteen `headerTitle` styles into ScreenTitle's own), and a
  // canary that has to be edited every time something is renamed teaches people
  // to edit canaries.
  test('the scan actually finds the glows that exist', () => {
    const files = new Set(glowUses().map(use => use.file));

    expect(files).toContain('src/components/ScreenTitle.tsx');
    expect(files).toContain('src/components/Logo.tsx');
    expect(files).toContain('src/components/SectionLabel.tsx');
  });

  // The specific styles this slice must not touch, checked by name rather than
  // by inference — these are the ones that carry what people read.
  test('nothing a couple reads is allowed to glow', () => {
    const glowing = new Set(glowUses().map(use => use.key));

    for (const forbidden of FORBIDDEN_EXAMPLES) {
      expect(glowing.has(forbidden)).toBe(false);
    }
  });

  // Named file and key, so this keeps holding even if somebody renames the
  // style to something the heuristic above would wave through.
  test('the five styles that carry read text never glow', () => {
    const uses = glowUses();

    for (const protectedStyle of PROTECTED) {
      expect(uses).not.toContainEqual(protectedStyle);
    }
  });

  // ...and the pairs above have to actually exist, or the test guards nothing.
  test('every protected style is really there to be protected', () => {
    for (const {file, key} of PROTECTED) {
      const source = readFileSync(join(__dirname, '..', '..', file), 'utf8');

      expect(source).toContain(`    ${key}: {`);
    }
  });
});
