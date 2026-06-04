// Manually maintained navigation param list (no codegen in P1).
export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  // Reached via the jaity://reset-password?token=&email= deep link; both params
  // come from the email link's query string.
  ResetPassword: { token: string; email: string };
  Question: undefined;
  Memories: undefined;
  Profile: undefined;
};
