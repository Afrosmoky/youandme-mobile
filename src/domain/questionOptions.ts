// Picking an answer instead of writing one (S2).
//
// The answer stays plain text — the labels the couple picked, joined. Nothing
// downstream learns a new shape: the memory saved from a picked answer is the
// same string a written one would have been, which is why Memories, the report
// and the progress map are untouched by choice cards.
//
// That leaves one job for this module: turn a stored answer back into "which
// options are ticked", and a tick back into a stored answer. Both live here
// rather than in the picker component because the matching has a real edge to it
// (see below) and is worth testing without a renderer.

// Read as text, so the saved memory reads like a sentence rather than a list.
export const OPTION_SEPARATOR = ', ';

/**
 * Which of `items` the answer text says are picked.
 *
 * Matched against the WHOLE label, anchored at the separator, never by splitting
 * the answer on it: option labels contain commas of their own ("Pozostanie
 * wysłuchanym, aby poczuć się zrozumianym" is one option, not two), so a split
 * would tear them in half and tick nothing.
 *
 * The one shape this cannot read is a label that is itself a comma-delimited
 * segment of another label on the same card. No card has that today, and the
 * cost if one ever does is a wrongly ticked box, not a lost answer.
 */
export function selectedOptions(value: string, items: string[]): string[] {
  return items.filter(item => isPicked(value, item));
}

function isPicked(value: string, item: string): boolean {
  return (
    value === item ||
    value.startsWith(item + OPTION_SEPARATOR) ||
    value.endsWith(OPTION_SEPARATOR + item) ||
    value.includes(OPTION_SEPARATOR + item + OPTION_SEPARATOR)
  );
}

/**
 * The answer text after tapping `option`.
 *
 * Single choice replaces (a radio has no empty state to tap back into), multiple
 * choice toggles. The result is always rebuilt in the card's own order, so the
 * same set of ticks reads the same way however it was clicked into being.
 */
export function toggleOption(
  value: string,
  items: string[],
  option: string,
  multiple: boolean,
): string {
  if (!multiple) {
    return option;
  }

  const picked = selectedOptions(value, items);
  const next = picked.includes(option)
    ? picked.filter(item => item !== option)
    : [...picked, option];

  return items.filter(item => next.includes(item)).join(OPTION_SEPARATOR);
}
