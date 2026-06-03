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
