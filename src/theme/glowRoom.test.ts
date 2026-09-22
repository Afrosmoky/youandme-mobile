import { withGlowRoom } from './glowRoom';

const R = 14;
const glowing = { textShadowRadius: R, color: 'gold' };

const edges = (style: object) => {
  const s = style as Record<string, unknown>;
  return {
    margin: [s.marginTop, s.marginBottom, s.marginLeft, s.marginRight],
    padding: [s.paddingTop, s.paddingBottom, s.paddingLeft, s.paddingRight],
  };
};

describe('withGlowRoom', () => {
  test('with no margins of its own, pads by the radius and takes it back', () => {
    expect(edges(withGlowRoom(glowing))).toEqual({
      margin: [-R, -R, -R, -R],
      padding: [R, R, R, R],
    });
  });

  // The case that made this a function: a token-borne `margin: -R` would lose
  // to this `marginBottom` in Yoga, and everything below would drop by R.
  test('caller gave marginBottom: it is kept, minus the room', () => {
    const out = withGlowRoom({ ...glowing, marginBottom: 12 });

    expect(edges(out).margin).toEqual([-R, 12 - R, -R, -R]);
  });

  test('caller gave margin: every edge keeps it, minus the room', () => {
    const out = withGlowRoom({ ...glowing, margin: 8 });

    expect(edges(out).margin).toEqual([8 - R, 8 - R, 8 - R, 8 - R]);
    expect(out).not.toHaveProperty('margin');
  });

  test('resolves each edge from its most specific form, as Yoga does', () => {
    const out = withGlowRoom({
      ...glowing,
      margin: 1,
      marginVertical: 2,
      marginHorizontal: 3,
      marginTop: 4,
      marginRight: 5,
    });

    expect(edges(out).margin).toEqual([4 - R, 2 - R, 3 - R, 5 - R]);
    expect(out).not.toHaveProperty('marginVertical');
    expect(out).not.toHaveProperty('marginHorizontal');
  });

  test('reads marginStart/End as left/right', () => {
    const out = withGlowRoom({ ...glowing, marginStart: 6, marginEnd: 7 });

    expect(edges(out).margin).toEqual([-R, -R, 6 - R, 7 - R]);
    expect(out).not.toHaveProperty('marginStart');
  });

  test("caller's padding is added to, not replaced", () => {
    const out = withGlowRoom({
      ...glowing,
      padding: 2,
      paddingHorizontal: 10,
    });

    expect(edges(out).padding).toEqual([2 + R, 2 + R, 10 + R, 10 + R]);
  });

  test('a non-numeric edge is left as written and gets no room', () => {
    const out = withGlowRoom({ ...glowing, marginLeft: 'auto', marginTop: 3 });

    expect(edges(out)).toEqual({
      margin: [3 - R, -R, 'auto', -R],
      padding: [R, R, 0, R],
    });
  });

  test('explicit radius wins over the style (glow on nested spans)', () => {
    const out = withGlowRoom({ fontSize: 44, marginBottom: 8 }, 28);

    expect(edges(out).margin).toEqual([-28, 8 - 28, -28, -28]);
  });

  test('no glow, no change', () => {
    const flat = { color: 'gold', marginBottom: 8 };

    expect(withGlowRoom(flat)).toBe(flat);
    const zero = { ...flat, textShadowRadius: 0 };
    expect(withGlowRoom(zero)).toBe(zero);
  });

  test('leaves everything else alone', () => {
    const out = withGlowRoom({ ...glowing, fontSize: 12 });

    expect(out).toMatchObject({ textShadowRadius: R, color: 'gold', fontSize: 12 });
  });
});
