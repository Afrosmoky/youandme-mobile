// User-facing strings (Polish). Code stays English; only what the user sees
// lives here. Flat keys are enough for P1.
export const pl = {
  appTitle: 'Ja i Ty',

  auth: {
    loginTitle: 'Zaloguj się',
    registerTitle: 'Załóż konto',
    email: 'E-mail',
    password: 'Hasło',
    nickname: 'Nick',
    submitLogin: 'Zaloguj się',
    submitRegister: 'Zarejestruj się',
    switchToRegister: 'Nie masz konta? Zarejestruj się',
    switchToLogin: 'Masz już konto? Zaloguj się',
    genericError: 'Coś poszło nie tak. Spróbuj ponownie.',
    invalidCredentials: 'Nieprawidłowy e-mail lub hasło.',
    validationError: 'Sprawdź wprowadzone dane.',
    nicknameInvalid:
      'Nick może zawierać tylko małe litery, cyfry i podkreślenia (3-30 znaków)',
    nicknameReserved: 'Ta nazwa jest zarezerwowana',
    forgotPassword: 'Zapomniałem hasła',
    googleSignIn: 'Zaloguj przez Google',
    googleSignInError: 'Logowanie przez Google się nie powiodło.',
    googleCancelled: 'Logowanie przez Google zostało anulowane.',
  },

  profile: {
    title: 'Profil',
    headerButton: 'Profil',
    email: 'E-mail',
    nickname: 'Nick',
    timezone: 'Strefa czasowa',
    locale: 'Język',
    save: 'Zapisz zmiany',
    logout: 'Wyloguj',
    verifyBadge: 'Email niezweryfikowany',
    resendVerification: 'Wyślij ponownie weryfikację',
    savedToast: 'Zmiany zostały zapisane.',
    verificationSentToast: 'Wysłaliśmy nową wiadomość weryfikacyjną.',
    loadError: 'Nie udało się pobrać profilu.',
    saveError: 'Nie udało się zapisać zmian.',
  },

  forgotPassword: {
    title: 'Reset hasła',
    email: 'E-mail',
    submit: 'Wyślij link resetu hasła',
    sentToast: 'Link został wysłany na podany adres email.',
    invalidEmail: 'Podaj poprawny adres e-mail.',
    error: 'Nie udało się wysłać linku. Spróbuj ponownie.',
  },

  resetPassword: {
    title: 'Ustaw nowe hasło',
    password: 'Nowe hasło',
    passwordConfirm: 'Powtórz nowe hasło',
    submit: 'Zresetuj hasło',
    passwordsDontMatch: 'Hasła nie są takie same.',
    passwordTooShort: 'Hasło musi mieć co najmniej 8 znaków.',
    successAlert: 'Hasło zostało zresetowane, zaloguj się nowym.',
    errorAlert: 'Nie udało się zresetować hasła. Link mógł wygasnąć.',
  },

  question: {
    headerTitle: 'Pytanie',
    memoriesButton: 'Wspomnienia',
    answerPlaceholder: 'Twoja odpowiedź...',
    save: 'Zapisz wspomnienie',
    next: 'Następne pytanie',
    saved: 'Zapisano',
    savedBody: 'Wspomnienie zostało zapisane.',
    loadError: 'Nie udało się pobrać pytania.',
    saveError: 'Nie udało się zapisać wspomnienia.',
    emptyAnswer: 'Najpierw wpisz odpowiedź.',
  },

  memories: {
    headerTitle: 'Wspomnienia',
    logout: 'Wyloguj',
    empty: 'Nie masz jeszcze żadnych wspomnień.',
    loadError: 'Nie udało się pobrać wspomnień.',
  },
} as const;
