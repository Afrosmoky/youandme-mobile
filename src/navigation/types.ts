// Manually maintained navigation param list (no codegen in P1).
export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  // Reached via the jaity://reset-password?token=&email= deep link; both params
  // come from the email link's query string.
  ResetPassword: { token: string; email: string };
  // Authenticated entry point: decides whether to resume an active session or
  // send the user to the home hub.
  Bootstrap: undefined;
  // Home hub (P4): daily card + session + memories tiles.
  Home: undefined;
  // Daily card (P4): the couple's question of the day.
  DailyCard: undefined;
  // Weekly ritual (P4): read-only ritual of the week.
  Ritual: undefined;
  CategoryPicker: undefined;
  // Local two-player game (P10). The session itself lives in AsyncStorage, so
  // the screens read it rather than being handed it — which is also what makes
  // resuming after a cold start work at all.
  LocalGameSetup: undefined;
  LocalGame: undefined;
  // The one thing the summary cannot read off disk (S3d): which milestones the
  // game screen had already accounted for when it sent the couple here. The
  // report of the LAST card is still in flight at that point, so the unlock it
  // may earn arrives to this screen — and only this set can tell it apart from
  // the milestones the session started with or already celebrated on a card.
  // Absent when there was no game screen to ask (a finished session found on
  // disk), which correctly means "celebrate nothing".
  LocalGameSummary: { seenMilestones?: string[] } | undefined;
  // Where jaity://email-verified lands, after the backend has done the verifying
  // and its page handed the couple back to the app (P11 deep links).
  EmailVerified: undefined;
  // Announced-but-not-built feature (P11). The screen is generic and the copy
  // comes from here, so the same route serves the remote game now and the
  // ranking later without a second near-identical screen. Purely informational
  // — nothing here is locked, bought or unlocked.
  ComingSoon: { title: string; body: string };
  // Closed deck (P7): what the couple has unlocked, and what a credit buys.
  Deck: undefined;
  // Credit balance (P7). Reached from Home via the deck, or from the deck header.
  Rewards: undefined;
  // Progress map (P8): milestones unlocked by the number of cards played.
  ProgressMap: undefined;
  // sessionUlid is passed when a fresh session was just started; absent when
  // resuming or when Question fetches the active session itself.
  Question: { sessionUlid?: string } | undefined;
  Memories: undefined;
  // One memory in full (P9): re-opened from the list, and — once FCM lands in
  // slice 2 — the target of the anniversary push, which carries only the ulid.
  MemoryCard: { memoryUlid: string };
  Profile: undefined;
};
