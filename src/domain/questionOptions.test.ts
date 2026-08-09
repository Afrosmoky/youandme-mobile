import { selectedOptions, toggleOption } from './questionOptions';

const items = ['Rada', 'Przytulenie', 'Przestrzeń'];

// The real card from the deck: three of its four options carry a comma of their
// own, which is exactly what a split-based parser gets wrong.
const commaItems = [
  'Pozostanie wysłuchanym, aby poczuć się zrozumianym',
  'Dostarczenie dobrej rady, która pomoże znaleźć rozwiązanie',
  'Pozostawienie przestrzeni na własne przemyślenia',
];

describe('selectedOptions', () => {
  test('an empty answer has nothing picked', () => {
    expect(selectedOptions('', items)).toEqual([]);
  });

  test('reads a single pick', () => {
    expect(selectedOptions('Przytulenie', items)).toEqual(['Przytulenie']);
  });

  test('reads several picks', () => {
    expect(selectedOptions('Rada, Przestrzeń', items)).toEqual([
      'Rada',
      'Przestrzeń',
    ]);
  });

  test('reads options that contain commas themselves', () => {
    const answer = `${commaItems[0]}, ${commaItems[2]}`;

    expect(selectedOptions(answer, commaItems)).toEqual([
      commaItems[0],
      commaItems[2],
    ]);
  });

  test('a written answer that merely mentions an option picks nothing', () => {
    expect(selectedOptions('Wolę radę od przytulenia', items)).toEqual([]);
  });
});

describe('toggleOption', () => {
  test('single choice replaces the previous pick', () => {
    expect(toggleOption('Rada', items, 'Przytulenie', false)).toBe(
      'Przytulenie',
    );
  });

  test('single choice keeps the pick when tapped again', () => {
    expect(toggleOption('Rada', items, 'Rada', false)).toBe('Rada');
  });

  test('multiple choice adds to the answer', () => {
    expect(toggleOption('Rada', items, 'Przestrzeń', true)).toBe(
      'Rada, Przestrzeń',
    );
  });

  test('multiple choice removes an already picked option', () => {
    expect(toggleOption('Rada, Przestrzeń', items, 'Rada', true)).toBe(
      'Przestrzeń',
    );
  });

  test('unticking the last option empties the answer', () => {
    expect(toggleOption('Rada', items, 'Rada', true)).toBe('');
  });

  // Whatever order they were tapped in, the answer reads in the card's order.
  test('multiple choice rebuilds the answer in the card order', () => {
    const first = toggleOption('Przestrzeń', items, 'Rada', true);

    expect(first).toBe('Rada, Przestrzeń');
    expect(toggleOption(first, items, 'Przytulenie', true)).toBe(
      'Rada, Przytulenie, Przestrzeń',
    );
  });

  test('toggling survives options that contain commas', () => {
    const answer = toggleOption('', commaItems, commaItems[1], true);

    expect(answer).toBe(commaItems[1]);
    expect(toggleOption(answer, commaItems, commaItems[1], true)).toBe('');
  });
});
