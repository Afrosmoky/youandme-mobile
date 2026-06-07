// Manually maintained navigation param list (no codegen in P1).
export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  // Reached via the jaity://reset-password?token=&email= deep link; both params
  // come from the email link's query string.
  ResetPassword: { token: string; email: string };
  // Authenticated entry point: decides whether to resume an active session or
  // send the user to the category picker.
  Bootstrap: undefined;
  CategoryPicker: undefined;
  // sessionUlid is passed when a fresh session was just started; absent when
  // resuming or when Question fetches the active session itself.
  Question: { sessionUlid?: string } | undefined;
  Memories: undefined;
  Profile: undefined;
};
