/**
 * The stack to reset to when a game hands the couple back to the setup screen:
 * Home underneath, a brand-new LocalGameSetup on top.
 *
 * Why a reset and not the obvious alternatives, because both are wrong in ways
 * that cost the couple their progress rather than their patience:
 *
 * `popTo('LocalGameSetup')` returns to the instance that has been sitting
 * mounted underneath the game the whole time. Nothing remounts, so its mount
 * effect does not run — and three things hang off that effect: the resume card,
 * the `matchesSetup` guard, and the flush of whatever the last session still
 * owes the server (`pendingReport`). The buffer would then sit on disk until
 * some later cold entry into setup, and would be lost outright if the couple
 * dealt a new deck first. This is the P10 invariant spelled out in
 * RootNavigator: leaving via Home was what guaranteed setup re-read the disk.
 *
 * `replace('LocalGameSetup')` does remount, so the flush is safe — but it swaps
 * only the top route, leaving Home -> Setup(stale) -> Setup(fresh) and a back
 * arrow that walks onto the stale one. That is the same bug moved one screen
 * along rather than fixed.
 *
 * A reset says "through Home to setup" in one atomic step: exactly one setup
 * screen, freshly mounted, with the back arrow going where it always did.
 *
 * Data rather than a function so the call sites stay one line and the shape can
 * be asserted directly in a test.
 */
export const BACK_TO_SETUP = {
  index: 1,
  routes: [{ name: 'Home' as const }, { name: 'LocalGameSetup' as const }],
};

/**
 * The same way back, after a deck reset: a fresh setup that starts the game by
 * itself once it has loaded — through the start button's own handler, so the
 * names are validated and the deck is dealt exactly as a tap would.
 */
export const BACK_TO_SETUP_AND_START = {
  index: 1,
  routes: [
    { name: 'Home' as const },
    { name: 'LocalGameSetup' as const, params: { autoStart: true } },
  ],
};
