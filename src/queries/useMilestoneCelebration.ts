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
// persisted anywhere, and the first reading only ever seeds it:
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
export function useMilestoneCelebration() {
  const { data: progress } = useProgress();
  const seenRef = useRef<ReadonlySet<string> | null>(null);
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

  return { milestone, dismiss };
}
