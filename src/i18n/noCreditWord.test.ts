import { readFileSync } from 'fs';
import { join } from 'path';

// Why this test exists, so it does not get deleted as odd in six months:
//
// "Kredyt" is our word, not the couple's. Testers met it at every place the app
// offers more cards — "polecenie i ocena dokładają kredyty" — and could not say
// what one was worth or what it did. Since build 5 the app speaks of cards only:
// a credit opens exactly one closed card (UNLOCK_COST in src/domain/rewards.ts),
// so "+5 kart" says the same thing in the couple's language.
//
// The rule has no exceptions on purpose. The ad strings went over to cards too,
// although ads are switched off, because an exception kept "for later" is the one
// that leaks back first. It reads the FILE rather than the `pl` object, so a
// comment or a function template that brings the word back fails as well: a
// comment is where the next string gets copied from.
//
// If the unit ever stops being one card per credit, this is the wrong test to
// change: the copy must then say what a card costs, in cards.
test('pl.ts never says "kredyt"', () => {
  const source = readFileSync(join(__dirname, 'pl.ts'), 'utf8');

  const offending = source
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => /kredyt/i.test(text));

  expect(offending).toEqual([]);
});
