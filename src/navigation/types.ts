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
  // Closed deck (P7): what the couple has unlocked, and what a credit buys.
  Deck: undefined;
  // Credit balance (P7). Reached from Home via the deck, or from the deck header.
  Rewards: undefined;
  // sessionUlid is passed when a fresh session was just started; absent when
  // resuming or when Question fetches the active session itself.
  Question: { sessionUlid?: string } | undefined;
  Memories: undefined;
  Profile: undefined;
};
