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
    homeButton: 'Wróć',
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
    // P7: marks a card the couple unlocked with a credit. Working look — an
    // open padlock and one word. Both the glyph and the word live here, so
    // swapping them after Wiktoria's sign-off (#36) is a one-line change.
    unlockedBadge: '🔓 Odblokowane',
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
    // Osobny pusty stan dla filtra — „nie masz wspomnień" byłoby nieprawdą.
    emptyFavorites: 'Nie macie jeszcze ulubionych wspomnień.',
    loadError: 'Nie udało się pobrać wspomnień.',
    favoritesFilter: 'Pokaż ulubione',
    allFilter: 'Pokaż wszystkie',
    favoriteError: 'Nie udało się zmienić ulubionych.',
    // "Odpowiedź Ola"
    player: (name: string) => `Odpowiedź ${name}`,
    origin: {
      session: 'Sesja',
      daily: 'Karta dnia',
      challenge: 'Wyzwanie',
      localGame: 'Gra lokalna',
    },
  },

  // Ekran szczegółu wspomnienia (P9): re-open z listy, edycja, usuwanie, serce,
  // a docelowo cel deep-linku z pusha rocznicy.
  memoryCard: {
    headerTitle: 'Wspomnienie',
    loadError: 'Nie udało się otworzyć wspomnienia.',
    edit: 'Edytuj',
    cancel: 'Anuluj',
    save: 'Zapisz zmiany',
    saveError: 'Nie udało się zapisać zmian.',
    emptyAnswer: 'Odpowiedź nie może być pusta.',
    // Etykiety pól w trybie edycji: nick gracza, gdy jest znany.
    answerLabel: (name: string) => `Odpowiedź ${name}`,
    partnerAnswerLabel: 'Odpowiedź partnera',
    // Pole partnera można wyczyścić — backend przyjmuje pustą odpowiedź jako brak.
    partnerHint: 'Puste pole = brak odpowiedzi partnera.',
    delete: 'Usuń wspomnienie',
    deleteTitle: 'Usunąć wspomnienie?',
    deleteMessage: 'Zniknie z listy wspomnień. Tej operacji nie cofniesz.',
    deleteConfirm: 'Usuń',
    deleteError: 'Nie udało się usunąć wspomnienia.',
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
    progressTitle: 'Wasza mapa',
    progressHint: 'Zobaczcie, jak daleko zaszliście',
    localGameTitle: 'Gra na jednym telefonie',
    localGameHint: 'Grajcie obok siebie, na zmianę',
  },

  // P10 local two-player game. Working copy — the final wording and the button
  // layout come in P11b, against Wiktoria's walkthrough video.
  localGame: {
    setupTitle: 'Gra na jednym telefonie',
    setupHeaderTitle: 'Nowa gra',
    player1Label: 'Gracz 1',
    // Stands in for the nickname when /me has not answered yet.
    player1Fallback: 'Ty',
    player2Label: 'Gracz 2',
    player2Placeholder: 'Imię drugiego gracza',
    player2Hint: 'Bez konta — imię zostaje na tym telefonie.',
    player2Required: 'Wpisz imię drugiego gracza.',
    player2TooLong: 'Imię może mieć najwyżej 60 znaków.',
    categoryPrompt: 'Wybierzcie kategorię, żeby zacząć',
    // Resume prompt, e.g. "Piotr i Wiktoria — karta 4 z 20".
    resumeTitle: 'Macie niedokończoną grę',
    resumeSummary: (player2: string, current: number, total: number) =>
      `Z ${player2} — karta ${current} z ${total}`,
    resumeButton: 'Wznów grę',
    restartButton: 'Zacznij od nowa',
    deckEmpty:
      'Zagraliście już wszystkie pytania z tej kategorii. Wybierzcie inną.',
    deckError: 'Nie udało się pobrać pytań.',

    headerTitle: 'Gra',
    // Card header, e.g. "Karta 3 z 20 · Tura: Wiktoria".
    cardHeader: (current: number, total: number, player: string) =>
      `Karta ${current} z ${total} · Tura: ${player}`,
    challengeHeader: 'Wyzwanie',
    // The written answer is optional — the field stays hidden behind this.
    writeToggleShow: 'Odpowiedz',
    writeToggleHide: 'Ukryj pole',
    answerPlaceholder: (player: string) => `Odpowiedź: ${player}`,
    passButton: 'Przekaż kolejkę',
    nextButton: 'Następne pytanie',
    challengeDoneButton: 'Dalej',
    skipButton: 'Pomiń',
    pauseButton: 'Przerwij',
    saveButton: 'Zapisz wspomnienie',
    savedBadge: 'Wspomnienie zapisane',
    saveError: 'Nie udało się zapisać wspomnienia.',

    summaryHeaderTitle: 'Koniec gry',
    summaryTitle: 'To były wszystkie karty',
    // "Zagraliście 18 kart" / "1 kartę" / "3 karty" — Polish counts in three.
    summaryQuestions: (count: number) => `Zagrane karty: ${count}`,
    summaryChallenges: (count: number) => `Wyzwania: ${count}`,
    summaryMemories: (count: number) => `Zapisane wspomnienia: ${count}`,
    playAgainButton: 'Zagrajcie znów',
    backHome: 'Wróć do początku',
    // The report is retried on the next visit to the setup screen, so this is a
    // note rather than an error the couple has to act on.
    reportPending:
      'Nie udało się teraz zapisać postępu. Spróbujemy ponownie później.',
  },

  // P8 progress map. Milestone names come from the backend; only the framing
  // is here. Copy is a working placeholder pending Wiktoria (#36).
  progress: {
    headerTitle: 'Mapa postępów',
    // "50 KART" — the badge under a milestone name.
    cards: (count: number) => `${count} kart`,
    // "120 / 150 · jeszcze 30" under the milestone being worked towards.
    remaining: (played: number, threshold: number, left: number) =>
      `${played} / ${threshold} · jeszcze ${left}`,
    nowBadge: 'TERAZ',
    // Shown instead of the map when the backend has no milestones seeded.
    empty: 'Mapa pojawi się, gdy zagracie pierwsze karty.',
    loadError: 'Nie udało się pobrać mapy postępów.',
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
    sectionTitle: 'Kredyt za reklamę',
    watchButton: 'Obejrzyj reklamę po kredyt',
    // From P7 the credit is granted server-side after the ad network confirms
    // the view, so the copy promises it is coming — not that it arrived.
    pending: 'Kredyt jest w drodze. Chwilę to zajmuje.',
    refreshButton: 'Odśwież saldo',
    capReached: 'Na dziś to już wszystko. Wróćcie jutro.',
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

  // Two things get celebrated in the same modal frame: a streak of days (P4)
  // and a milestone on the progress map (P8). The keys say which is which — the
  // component itself no longer knows.
  celebration: {
    // "7 dni z rzędu!"
    streakTitle: (days: number) => `${days} dni z rzędu!`,
    streakBody: 'Wasza seria rośnie. Tak trzymać!',
    milestoneTitle: 'Nowy kamień milowy!',
    // Nazwa kamienia przychodzi z API — front jej nie wymyśla.
    milestoneBody: (name: string) =>
      `Odblokowaliście: ${name}. Wasza mapa właśnie urosła.`,
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
    // Osobny kanał Androida dla kamieni z mapy postępów — patrz notifee.ts.
    progressChannelName: 'Kamienie milowe',
    // Kanały dla pushy serwerowych (P9). Same treści przychodzą z backendu —
    // tutaj są tylko nazwy kanałów, które user widzi w ustawieniach Androida.
    memoriesChannelName: 'Wspomnienia',
    rewardsChannelName: 'Nagrody',
    progressMilestoneTitle: 'Nowy kamień milowy!',
    progressMilestoneBody: (name: string) =>
      `Odblokowaliście: ${name}. Zajrzyjcie na mapę.`,
  },
} as const;
