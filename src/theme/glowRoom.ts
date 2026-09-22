import { TextStyle } from 'react-native';

// Makes room inside a Text's frame for its glow, without moving anything.
//
// WHY. On iOS a Text draws its glyphs AND their shadow in `drawRect` of a view
// the exact size of the text frame (RCTParagraphTextView), and whatever drawRect
// paints is clipped to the layer's bounds. A 14-28px glow around 12-44px text is
// cut straight along that frame, and the cut-off blur reads as a lighter
// rectangle behind every glowing text. Android does not clip here (the parent
// has clipChildren = false), so there it simply changes nothing visible.
//
// HOW. Padding equal to the glow radius gives the shadow room inside the frame
// (the text itself is drawn in the content frame, inside the padding), and an
// equal negative margin gives that room back, so the Text occupies exactly the
// space it did before.
//
// WHY A FUNCTION AND NOT PADDING/MARGIN IN THE TOKENS. Yoga resolves an edge
// from its most specific form: `marginBottom` beats `marginVertical` beats
// `margin`, whatever order they were written in. A token carrying `margin: -R`
// would be silently undone by any caller writing `marginBottom: 8`, and the
// layout under that text would drop by R. So the caller's margins are resolved
// edge by edge first, the same way Yoga would, and the compensation is merged
// into each resolved value. Padding is resolved the same way and the room is
// ADDED to it, never replaces it.
//
// Assumes LTR (the app is Polish-only): marginStart/End are read as left/right.
//
// An edge whose margin or padding is not a plain number (a percentage, 'auto')
// is left exactly as the caller wrote it and gets no room: there is no number
// to subtract from, and padding without its compensating margin would move the
// layout, which is worse than a clipped glow.

type EdgeKey = 'Top' | 'Bottom' | 'Left' | 'Right';
type Value = TextStyle['margin'];

const EDGES: EdgeKey[] = ['Top', 'Bottom', 'Left', 'Right'];

// Most specific first, mirroring Yoga's resolution.
function resolve(
  style: TextStyle,
  prop: 'margin' | 'padding',
  edge: EdgeKey,
): Value {
  const s = style as Record<string, Value>;
  const axis = edge === 'Top' || edge === 'Bottom' ? 'Vertical' : 'Horizontal';
  const logical = edge === 'Left' ? 'Start' : edge === 'Right' ? 'End' : null;
  return (
    s[`${prop}${edge}`] ??
    (logical ? s[`${prop}${logical}`] : undefined) ??
    s[`${prop}${axis}`] ??
    s[prop]
  );
}

const SHORTHANDS = [
  'margin',
  'marginVertical',
  'marginHorizontal',
  'marginStart',
  'marginEnd',
  'padding',
  'paddingVertical',
  'paddingHorizontal',
  'paddingStart',
  'paddingEnd',
] as const;

/**
 * Returns `style` with room for its glow. `radius` defaults to the style's own
 * `textShadowRadius`; pass it explicitly when the glow sits on nested spans
 * rather than on the Text being laid out (Logo). Takes a FLAT style object.
 */
export function withGlowRoom(
  style: TextStyle,
  radius: number | undefined = style.textShadowRadius,
): TextStyle {
  if (!radius) {
    return style;
  }
  const out: Record<string, unknown> = { ...style };
  for (const key of SHORTHANDS) {
    delete out[key];
  }
  for (const edge of EDGES) {
    const margin = resolve(style, 'margin', edge) ?? 0;
    const padding = resolve(style, 'padding', edge) ?? 0;
    if (typeof margin === 'number' && typeof padding === 'number') {
      out[`margin${edge}`] = margin - radius;
      out[`padding${edge}`] = padding + radius;
    } else {
      out[`margin${edge}`] = margin;
      out[`padding${edge}`] = padding;
    }
  }
  return out as TextStyle;
}
