// User-facing strings (Polish). Code stays English; only what the user sees
// lives here. Flat keys are enough for P1.
export const pl = {
  appTitle: 'Ja i Ty',

  common: {
    passwordShow: 'Pokaż',
    passwordHide: 'Ukryj',
    networkError:
      'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.',
    serverError: 'Coś poszło nie tak po stronie serwera. Spróbuj za chwilę.',
  },

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
    tooManyAttempts: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    nicknameInvalid:
      'Nick może zawierać tylko małe litery, cyfry i podkreślenia (3-30 znaków)',
    nicknameReserved: 'Ta nazwa jest zarezerwowana',
    referrerPlaceholder: 'Nick osoby polecającej (opcjonalnie)',
    referrerSelf: 'To Twój własny nick',
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
    shareApp: 'Udostępnij aplikację',
    rateApp: 'Oceń aplikację',
    watchAd: 'Obejrzyj reklamę po bonus',
    partnerName: 'Imię partnera',
    partnerNameHint: 'Imię osoby z którą grasz (opcjonalne)',
    verifyBadge: 'Email niezweryfikowany',
    resendVerification: 'Wyślij ponownie weryfikację',
    changePasswordTitle: 'Zmiana hasła',
    currentPassword: 'Obecne hasło',
    newPassword: 'Nowe hasło',
    confirmPassword: 'Powtórz nowe hasło',
    passwordsDoNotMatch: 'Hasła nie są identyczne.',
    changePasswordButton: 'Zmień hasło',
    passwordChanged: 'Hasło zostało zmienione.',
    passwordChangeError: 'Nie udało się zmienić hasła.',
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
    errorAlert:
      'Nie udało się zresetować hasła. Sprawdź link albo poproś o nowy.',
  },

  categoryPicker: {
    title: 'Wybierz kategorię',
    memoriesButton: 'Wspomnienia',
    mixButton: 'Tryb mix (wszystkie kategorie)',
    mixHint: 'Pytania z różnych kategorii wymieszane',
    loading: 'Ładuję kategorie...',
    error: 'Nie udało się załadować kategorii.',
    startSessionError: 'Nie udało się rozpocząć sesji.',
  },

  bootstrap: {
    loading: 'Ładuję...',
  },

  question: {
    headerTitle: 'Pytanie',
    mixLabel: 'Mix',
    // Header progress, e.g. "Na poznanie — 3 z 20".
    progress: (label: string, current: number, total: number) =>
      `${label} — ${current} z ${total}`,
    // Progress-bar counter, e.g. "3 / 20".
    counter: (current: number, total: number) => `${current} / ${total}`,
    placeholder: 'Wpisz odpowiedź...',
    submitButton: 'Zapisz wspomnienie',
    skipButton: 'Pomiń',
    endButton: 'Zakończ',
    sessionComplete: 'Skończyłeś tę talię. Wybierz kolejną kategorię.',
    sessionNotFound: 'Sesja wygasła. Wybierz kategorię ponownie.',
    loadError: 'Nie udało się pobrać pytania.',
    saveError: 'Nie udało się zapisać wspomnienia.',
    emptyAnswer: 'Najpierw wpisz odpowiedź.',
  },

  memories: {
    headerTitle: 'Wspomnienia',
    logout: 'Wyloguj',
    empty: 'Nie masz jeszcze żadnych wspomnień.',
    loadError: 'Nie udało się pobrać wspomnień.',
    // "Odpowiedź Ola"
    player: (name: string) => `Odpowiedź ${name}`,
    origin: {
      session: 'Sesja',
      daily: 'Karta dnia',
      challenge: 'Wyzwanie',
    },
  },

  home: {
    headerTitle: 'Ja i Ty',
    dailyCardTitle: 'Karta dnia',
    dailyCardTodo: 'Odpowiedzcie dziś',
    dailyCardDone: 'Odpowiedziane',
    // "3 dni serii"
    streak: (days: number) => `${days} dni serii`,
    streakNone: 'Zacznijcie serię dziś',
    ritualLabel: 'Rytuał tygodnia',
    sessionTitle: 'Sesja pytań',
    sessionHint: 'Wybierzcie kategorię i grajcie',
    memoriesTitle: 'Wspomnienia',
    memoriesHint: 'Wasze zapisane odpowiedzi',
    deckTitle: 'Talia i nagrody',
    deckHint: 'Odblokujcie kolejne pytania',
  },

  // P7. Credits become visible here for the first time — they had been growing
  // silently since P5. Copy is a neutral placeholder pending Wiktoria (#36).
  deck: {
    headerTitle: 'Talia',
    // "12 z 40 odblokowanych"
    progress: (unlocked: number, total: number) =>
      `${unlocked} z ${total} odblokowanych`,
    complete: 'Cała talia odblokowana.',
    unlockedBadge: 'Odblokowane',
    lockedBadge: 'Zamknięte',
    // The deck listing never carries question text — a locked card must not
    // leak what you would be paying for.
    hiddenBody: 'Treść odsłoni się w sesji',
    noCategory: 'Bez kategorii',
    unlockButton: 'Odblokuj (1 kredyt)',
    unlockError: 'Nie udało się odblokować pytania.',
    loadError: 'Nie udało się pobrać talii.',
    empty: 'Talia jest pusta.',
  },

  rewards: {
    headerTitle: 'Wasze nagrody',
    creditsLabel: 'Kredyty',
    creditsHint: 'Za kredyty odblokujecie zamknięte pytania.',
    // "Reklamy dziś: 4 z 5"
    adsToday: (remaining: number, cap: number) =>
      `Reklamy dziś: ${remaining} z ${cap}`,
    loadError: 'Nie udało się pobrać salda.',
    codeTitle: 'Kod promocyjny',
    codeLabel: 'Kod',
    codePlaceholder: 'np. JAITY-TEST',
    codeSubmit: 'Zrealizuj kod',
    // Neutral on purpose: the response does not tell us how many cards opened,
    // so the refreshed deck says that, not the toast.
    codeRedeemed: 'Kod zrealizowany. Talia jest odblokowana.',
    // Only used when the server gives no reason of its own (network, 5xx).
    codeError: 'Nie udało się zrealizować kodu.',
    codeEmpty: 'Najpierw wpisz kod.',
  },

  ritual: {
    headerTitle: 'Rytuał tygodnia',
    // "dzień 3 z 7"
    day: (day: number) => `dzień ${day} z 7`,
  },

  // P5 share. Copy is a neutral placeholder pending Wiktoria's sign-off (#36) —
  // no card promise (the deck is closed until P7). The URL is appended to this
  // message at the call site (ProfileScreen.onShare), not passed as Share's
  // separate `url`, so it survives targets that drop `url`.
  share: {
    message: 'Gramy w „Ja i Ty" — grę dla par. Wypróbuj z kimś bliskim.',
    thanksToast: 'Dzięki, że dzielisz się aplikacją!',
  },

  // P6 rating. Same placeholder rules as `share` above: neutral, no card
  // promise. Deliberately says nothing about the review itself — the native
  // prompt may never appear and we never learn whether the user rated, so the
  // toast can only thank for the gesture.
  rating: {
    thanksToast: 'Dzięki, że nas wspierasz!',
  },

  // P6 rewarded ads. Same placeholder rules as `share` and `rating` above:
  // neutral, no card promise. `capReached` deliberately says nothing about how
  // many are left — the cap is a server-side rule, not a promise to the user.
  ads: {
    thanksToast: 'Dzięki za obejrzenie!',
    capReached: 'Na dziś to już wszystko. Wróć jutro.',
    unavailable: 'Nie udało się wczytać reklamy. Spróbuj później.',
  },

  dailyCard: {
    headerTitle: 'Karta dnia',
    placeholder: 'Wpisz odpowiedź...',
    submitButton: 'Zapisz',
    answeredTitle: 'Odpowiedziane dziś',
    answeredLink: 'Odpowiedziane — zobacz we wspomnieniach',
    emptyAnswer: 'Najpierw wpisz odpowiedź.',
    loadError: 'Nie udało się pobrać karty dnia.',
    saveError: 'Nie udało się zapisać odpowiedzi.',
    // Both 409 cases (already answered / not-today card) refresh and let the
    // fresh state speak for itself.
    staleRefreshing: 'Karta była nieaktualna — odświeżamy.',
  },

  celebration: {
    // "7 dni z rzędu!"
    title: (days: number) => `${days} dni z rzędu!`,
    body: 'Wasza seria rośnie. Tak trzymać!',
    dismiss: 'Super',
  },

  notifications: {
    channelName: 'Karta dnia',
    dailyReminderTitle: 'Karta dnia czeka',
    dailyReminderBody: 'Odpowiedzcie razem na dzisiejsze pytanie.',
    streakWarningTitle: 'Nie traćcie serii',
    streakWarningBody: 'Wasza karta dnia wciąż czeka — odpowiedzcie przed północą.',
    milestoneTitle: 'Kamień milowy!',
    // "Seria 7 dni — gratulacje!"
    milestoneBody: (days: number) => `Seria ${days} dni — gratulacje!`,
    ritualReminderTitle: 'Rytuał tygodnia',
    ritualReminderBody:
      'Wyzwanie tygodnia — sprawdźcie wasz rytuał na ten tydzień.',
  },
} as const;
