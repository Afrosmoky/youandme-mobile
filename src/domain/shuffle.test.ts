import { shuffle } from './shuffle';

const items = ['a', 'b', 'c', 'd', 'e'];

describe('shuffle', () => {
  test('keeps every item exactly once', () => {
    expect([...shuffle(items)].sort()).toEqual([...items].sort());
  });

  // CHALLENGES is a module-level constant shared by every session — shuffling it
  // in place would reorder the bundle for the rest of the app's life.
  test('leaves the input alone', () => {
    shuffle(items);

    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('an injected random makes the order deterministic', () => {
    // Always picks index 0 in the swap, so the permutation is fixed.
    const first = shuffle(items, () => 0);
    const second = shuffle(items, () => 0);

    expect(first).toEqual(second);
    expect(first).not.toEqual(items);
  });

  test('an empty pool shuffles to an empty pool', () => {
    expect(shuffle([])).toEqual([]);
  });
});
