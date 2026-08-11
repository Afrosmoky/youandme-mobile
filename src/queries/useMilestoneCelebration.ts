import { useCallback, useEffect, useRef, useState } from 'react';
import { Milestone } from '../domain/types';
import { newlyUnlockedMilestone, unlockedSlugs } from '../domain/progressMap';
import { notifyProgressMilestone } from '../notifications/notifee';
import { useProgress } from './useProgress';

// Watches the progress map for a milestone unlocked while the couple is playing,
// and hands the screen what it needs to celebrate it.
//
// Nothing announces an unlock: the backend only reports it in GET /progress, and
// both save paths invalidate that key (see useSaveMemory / useAnswerDailyCard).
// So the refetch that follows a saved card is exactly where a new milestone
// shows up, and the detection is a diff of the unlocked slugs between two
// readings.
//
// WHERE THE PREVIOUS SET LIVES: `seenRef` — a ref owned by whichever screen
// mounts this hook, so it lives and dies with that mount. It is deliberately not
// persisted anywhere, and by default the first reading only ever seeds it:
//
//   - first entry to the screen — one reading, no previous, no modal;
//   - cold start of a couple who already has six milestones behind them — same
//     single reading, so nothing fires for history;
//   - a backend backfill that flips several at once between app launches —
//     still arrives as one first reading here.
//
// What is left is the only thing worth a modal: a locked -> unlocked transition
// this mount actually watched happen. Mount it where cards are played
// (DailyCardScreen, QuestionScreen) — on a read-only screen it would seed a
// baseline and correctly never fire again.
//
// `seenAtMount` is the one way out of that rule, and it exists for exactly one
// situation (S3d): a screen that takes over mid-watch from another one, and can
// therefore say what was already accounted for. The local game hands it to the
// summary screen when a card lands the couple there before its report has come
// back — see LocalGameScreen. Passing it means "I know what came before", so the
// first reading is a real diff rather than a seed; passing an EMPTY array is a
// legitimate baseline of "nothing was unlocked" and is not the same as passing
// nothing at all. Anything already in the set can never fire, which is what
// keeps a milestone celebrated on the card from being celebrated again here.
export function useMilestoneCelebration(seenAtMount?: readonly string[]) {
  const { data: progress } = useProgress();
  // Seeded on the first render only (useRef ignores the argument after that), so
  // a re-render with the same params cannot reseed and re-arm a celebration.
  const seenRef = useRef<ReadonlySet<string> | null>(
    seenAtMount ? new Set(seenAtMount) : null,
  );
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!progress) {
      return;
    }
    const previous = seenRef.current;
    seenRef.current = new Set(unlockedSlugs(progress));
    if (previous === null) {
      // Baseline only — see above.
      return;
    }
    const fresh = newlyUnlockedMilestone(previous, progress);
    if (fresh) {
      setMilestone(fresh);
      // Self-guarded on AppState: in the foreground the modal is the
      // celebration, so the push only goes out from the background.
      notifyProgressMilestone(fresh.name);
    }
    // TanStack's structural sharing keeps `progress` identical across a refetch
    // that changed nothing, so an idle refetch does not even re-run this — and
    // if it ever did, the diff would be empty anyway.
  }, [progress]);

  const dismiss = useCallback(() => setMilestone(null), []);

  // What this mount has accounted for so far — the baseline it started from plus
  // everything it has celebrated since. A caller handing the watch over to
  // another screen passes this to it (see the comment above); `undefined` means
  // no reading of the map has landed here yet, so there is nothing to hand over
  // and the next screen has to seed its own baseline.
  //
  // A function rather than a value: seenRef is not state, and a screen only ever
  // needs it at the moment it navigates.
  const seenMilestones = useCallback(
    () => (seenRef.current ? [...seenRef.current] : undefined),
    [],
  );

  return { milestone, dismiss, seenMilestones };
}
