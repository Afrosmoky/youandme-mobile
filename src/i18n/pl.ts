// User-facing strings (Polish). Code stays English; only what the user sees
// lives here. Flat keys are enough for P1.

// "1 dzień" / "2 dni" / "365 dni". The one piece of Polish grammar the copy in
// this file cannot dodge, kept in a helper because two screens now say it: the
// hub tile and the daily card's label.
//
// Two forms, not the three Polish usually needs for counting. The noun here is
// only ever the subject of a count phrase, and for "dzień" the nominative
// plural and the genitive plural are the same word — so "1 dzień" against
// "dni" for everything else covers it, including 22, 105 and 0.
const streakDays = (days: number): string =>
  `${days} ${days === 1 ? 'dzień' : 'dni'}`;

export const pl = {
  appTitle: 'Ja i Ty',

  common: {
    passwordShow: 'Pokaż',
    passwordHide: 'Ukryj',
    retry: 'Spróbuj ponownie',
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
    // Symetryczna nagroda za polecenie. Liczba jest z backendu (REFERRAL_BONUS
    // = 5 w AuthController i AwardPendingReferrerAction) — nie zmieniać tu bez
    // zmiany tam. Kredyt odblokowuje jedno zamknięte pytanie, więc „kart" mówi
    // to samo co „kredytów", tylko językiem gry.
    referrerReward: 'Wpiszcie nick — oboje dostaniecie +5 kart',
    forgotPassword: 'Zapomniałem hasła',
    googleSignIn: 'Zaloguj przez Google',
    // Fallback, gdy błąd nie pochodzi z biblioteki Google (np. padła wymiana
    // tokenu z naszym backendem albo sieć) — nie ma wtedy kodu do pokazania.
    googleSignInError: 'Logowanie przez Google się nie powiodło.',
    googleCancelled: 'Logowanie przez Google zostało anulowane.',
    googlePlayServices:
      'Logowanie przez Google wymaga aktualnych Usług Google Play. Zaktualizujcie je i spróbujcie ponownie.',
    // DEVELOPER_ERROR (10): ta wersja aplikacji nie jest zarejestrowana w
    // projekcie Google — wina po naszej stronie, nie użytkownika, więc copy
    // kieruje na działającą drogę zamiast kazać próbować dalej.
    googleConfigError: (code: string) =>
      `Logowanie przez Google jest niedostępne w tej wersji aplikacji (kod ${code}). Zalogujcie się e-mailem — naprawimy to w kolejnej aktualizacji.`,
    // Reszta: kod idzie do komunikatu, żeby kolejne zgłoszenie od testera było
    // faktem, a nie zagadką.
    googleSignInErrorCode: (code: string) =>
      `Logowanie przez Google się nie powiodło (kod ${code}).`,
    // Zastępuje przycisk Google, gdy SOCIAL_LOGIN_ENABLED === false. Mówi
    // „wkrótce", a nie nic, żeby puste miejsce czytało się jako plan.
    socialSoon: 'Logowanie przez Google i Apple — wkrótce dostępne',
    appleSignIn: 'Zaloguj przez Apple',
    appleCancelled: 'Logowanie przez Apple zostało anulowane.',
    appleSignInError: 'Logowanie przez Apple się nie powiodło.',
    // Próba w ogóle nie doszła do skutku (żądanie nieobsłużone albo odpowiedź
    // nie do użycia) — to nie jest odmowa, więc zapraszamy do ponowienia
    // zamiast mówić cokolwiek o koncie.
    appleSignInRetry: 'Nie udało się zacząć logowania przez Apple. Spróbujcie jeszcze raz.',
    // Pod OBOMA przyciskami. Adres jest tu jedyną rzeczą, która łączy logowanie
    // społecznościowe z istniejącym kontem — backend dopina dostawcę po
    // adresie, więc inny adres to nowe, puste konto. Dotyczy tak samo „Ukryj
    // mój adres" w Apple, jak wybrania innego konta Google.
    socialSameAddress:
      'Użyjcie tego samego adresu, na który zakładaliście konto — inny adres założy nowe, puste konto.',
    // Pokazywane TYLKO gdy backend odpowiedział 201, czyli konto powstało
    // właśnie teraz. Dla nowej pary to zwykła informacja; dla osieroconej —
    // jedyny moment, w którym da się ją zawrócić, zanim uzna, że straciła dane.
    socialNewAccount: (email: string) =>
      `Założyliśmy nowe konto na adres ${email}. Jeśli macie już konto na inny adres, wylogujcie się i wejdźcie tamtym.`,
    // Wariant dla „Ukryj mój adres" Apple. Adresu przekierowania NIE pokazujemy
    // dosłownie — to ciąg losowych znaków, który czyta się jak błąd, a trafia
    // dokładnie na parę, którą ten komunikat ma zawrócić. Nazywamy więc
    // przyczynę zamiast adresu.
    socialNewAccountHidden:
      'Zalogowaliście się z ukrytym adresem Apple, więc powstało nowe, puste konto. Jeśli macie już konto, wróćcie i zalogujcie się swoim adresem.',
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
    // Account deletion. Working copy, pending Wiktoria's confirmation.
    deleteAccount: 'Usuń konto',
    deleteAccountTitle: 'Usunąć konto?',
    deleteAccountMessage:
      'Razem z kontem znikną Wasza para i imię partnera, wszystkie wspomnienia, postęp na mapie, polubione pytania i zebrane kredyty. Tego nie da się cofnąć.',
    deleteAccountCancel: 'Anuluj',
    deleteAccountConfirm: 'Usuń konto',
    accountDeleted: 'Konto zostało usunięte. Dziękujemy, że byliście z nami.',
    deleteAccountAppleCancelled:
      'Usuwanie przerwane, nic się nie zmieniło. Możecie spróbować ponownie, kiedy zechcecie.',
    deleteAccountError:
      'Nie udało się usunąć konta. Nic się nie zmieniło. Sprawdźcie połączenie i spróbujcie ponownie.',
    deleteAccountSessionExpired:
      'Sesja wygasła. Zalogujcie się ponownie, żeby usunąć konto.',
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
    // „Historia", nie „Wspomnienia": od 3B ekran ma dwie zakładki, a „Zapisane
    // wspomnienia" pod nagłówkiem „Wspomnienia" byłoby tautologią. Nazwa trasy
    // w nawigatorze zostaje — deep linki i pushRouter z P9 są tego niewarte.
    headerTitle: 'Historia',
    // Podział Wiktorii, ten sam co w jej wersji webowej. Dwa różne byty pod
    // jednym sercem: polubione PYTANIE (P5, couple_question_likes) i ulubione
    // WSPOMNIENIE (P9, memories.is_favorite).
    //
    // Stąd „polubione" tu, a „ulubione" w filtrze wspomnień niżej. Do 3D
    // zakładka nazywała się „Ulubione pytania" i to słowo znaczyło na jednym
    // ekranie dwie różne rzeczy — raz zakładkę, raz filtr wewnątrz sąsiedniej
    // zakładki. Dwa rzeczowniki zamiast jednego, zgodnie z tym, jak te byty
    // nazywają się po stronie danych.
    tabQuestions: 'Polubione pytania',
    tabMemories: 'Zapisane wspomnienia',
    logout: 'Wyloguj',
    empty: 'Nie masz jeszcze żadnych wspomnień.',
    // Osobny pusty stan dla filtra — „nie masz wspomnień" byłoby nieprawdą.
    emptyFavorites: 'Nie macie jeszcze ulubionych wspomnień.',
    loadError: 'Nie udało się pobrać wspomnień.',
    favoritesFilter: 'Pokaż ulubione',
    allFilter: 'Pokaż wszystkie',
    favoriteError: 'Nie udało się zmienić ulubionych.',
    // Zakładka polubionych pytań (3B). Robocze, do potwierdzenia przez Wiktorię.
    likedEmpty:
      'Nie macie jeszcze ulubionych pytań. Stuknijcie serce przy pytaniu, żeby je tu zachować.',
    likedLoadError: 'Nie udało się pobrać ulubionych pytań.',
    // Toast po polubieniu — pokazywany tylko przy polubieniu, nigdy przy
    // cofnięciu. Treść Piotra, bez zmian.
    likedToast: 'Dodano do ulubionych — znajdziesz je w Historii',
    // Nieudana zmiana serca — w OBIE strony. Bez tego offline serce mruga i
    // gaśnie w ciszy, a od 3B jeszcze z pustą zakładką obok. Robocze, do
    // potwierdzenia przez Wiktorię.
    likeError: 'Nie udało się zapisać — spróbujcie ponownie z internetem',
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
    // Etykiety pól w trybie edycji: nick gracza, gdy jest znany. Etykieta
    // partnera służy też podglądowi i liście, gdy imienia partnera brak.
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
    // "3 dni serii", "1 dzień serii". Polski ma tu dwie formy, nie trzy:
    // mianownik liczby pojedynczej ("dzień") i to samo słowo dla reszty
    // ("dni"), bo mianownik mnogi i dopełniacz mnogi są identyczne. Więc jeden
    // warunek wystarcza — helper obsługuje oba miejsca, gdzie seria ma swoją
    // liczbę dni (hub i etykieta karty dnia).
    streak: (days: number) => `${streakDays(days)} serii`,
    streakNone: 'Zacznijcie serię dziś',
    ritualLabel: 'Rytuał tygodnia',
    memoriesTitle: 'Historia',
    memoriesHint: 'Ulubione pytania i zapisane wspomnienia',
    deckTitle: 'Talia i nagrody',
    deckHint: 'Odblokujcie kolejne pytania',
    progressTitle: 'Wasza mapa',
    progressHint: 'Zobaczcie, jak daleko zaszliście',
    localGameTitle: 'Gra na jednym telefonie',
    localGameHint: 'Grajcie obok siebie, na zmianę',
    // Dwa tryby obok siebie: jeden gra się dziś, drugi jest zapowiedziany.
    // Kafel zostaje widoczny, żeby ścieżka gry na odległość nie zniknęła z mapy
    // aplikacji między teraz a etapem II.
    remoteGameTitle: 'Gra na odległość',
    remoteGameHint: 'Bądźcie blisko mimo dzielących was kilometrów',
  },

  // Ekran po kliknięciu linku weryfikacyjnego z maila. Weryfikacja dzieje się na
  // backendzie (podpisany URL) — tutaj tylko potwierdzenie i unieważnienie
  // zapamiętanego statusu. Robocze, Wiktoria dopracuje.
  emailVerified: {
    headerTitle: 'Weryfikacja',
    badge: 'Gotowe',
    title: 'Konto zweryfikowane',
    body: 'E-mail potwierdzony. Możecie wrócić do gry.',
  },

  // Ekran „wkrótce" — jeden, parametryzowany, dla każdej funkcji zapowiedzianej
  // przed etapem II. Treść przychodzi z route'a; tutaj tylko to, co wspólne, i
  // teksty dla poszczególnych wejść. Robocze, do dopracowania przez Wiktorię.
  comingSoon: {
    badge: 'Wkrótce',
    remoteGameTitle: 'Gra na odległość',
    remoteGameBody:
      'Grajcie razem, każde na swoim telefonie — pytania, odpowiedzi i wspomnienia na odległość. Pracujemy nad tym.',
  },

  // P10 local two-player game. Working copy — the final wording and the button
  // layout come in P11b, against Wiktoria's walkthrough video.
  localGame: {
    setupTitle: 'Gra na jednym telefonie',
    // 3D: wybór kategorii schowany, więc jeden przycisk rozdaje całą talię.
    // Robocze, do potwierdzenia przez Wiktorię.
    startButton: 'Zacznijcie grę',
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
    // Resume prompt, e.g. "Z Wiktorią · Randka — karta 4 z 20". Kategoria jest
    // tu, bo jeden slot na grę znaczy, że to jedyne miejsce, gdzie widać CO się
    // wznawia — samo imię i numer karty pasują do każdej odłożonej gry.
    resumeTitle: 'Macie niedokończoną grę',
    resumeSummary: (
      player2: string,
      category: string,
      current: number,
      total: number,
    ) => `Z ${player2} · ${category} — karta ${current} z ${total}`,
    // Nazwa kategorii na karcie „wznów" dla gry na wymieszanej talii.
    resumeMix: 'mix',
    resumeButton: 'Wznów grę',
    // „Od nowa" znaczy wszędzie to samo: pełna talia, po potwierdzeniu (reset).
    restartButton: 'Zacznij od nowa',
    // Jeden slot na grę lokalną: nowa gra o innej konfiguracji nadpisuje tę
    // odłożoną, więc pytamy, zanim to zrobimy.
    overwriteTitle: 'Masz niedokończoną grę',
    overwriteMessage: 'Zaczynając nową, stracisz ją. Kontynuować?',
    overwriteCancel: 'Anuluj',
    overwriteConfirm: 'Zacznij nową',
    // Nowa gra nie nadpisze odłożonej, dopóki nie wyślemy jej zagranych kart —
    // inaczej zniknęłyby z mapy postępów bez słowa.
    owedReportError:
      'Nie udało się zapisać ostatnich zagranych kart. Sprawdźcie internet i spróbujcie ponownie.',
    // Fallback na pustą pulę BEZ powodu — starszy backend albo powód, którego ta
    // wersja nie zna (patrz .catch(null) w src/api/localGame.ts). Neutralny,
    // dlatego nie mówi „z tej kategorii": przy mixie żadnej kategorii nie było.
    deckEmpty: 'Nie ma teraz kart do zagrania. Spróbujcie innej kategorii.',
    deckError: 'Nie udało się pobrać pytań.',

    // Pusta pula z powodem (S4b). Trzy różne sytuacje, które do tej pory
    // wyglądały identycznie — i jak reszta tej sekcji, treść robocza: Wiktoria
    // dopracuje (§10 / #36). To samo dotyczy złota na wariancie „complete",
    // które dostanie swój token w S_polish.
    exhaustion: {
      otherCategoriesTitle: 'Koniec kart w tej kategorii',
      otherCategoriesBody: 'Skończyły się karty w tej kategorii. Spróbujcie innej.',
      lockedTitle: 'Koniec darmowych kart',
      lockedBody: 'Skończyły się darmowe karty.',
      // „Zostało 12 zamkniętych kart" — pomijane, gdy backend nie podał liczby.
      lockedRemaining: (count: number) => `Zostało ${count} zamkniętych kart`,
      lockedCta: 'Odblokujcie więcej →',
      // 3D: dwie drogi, które realnie dają kredyty, pokazane w chwili, w której
      // para ich potrzebuje. Neutralnie, bez obietnicy liczby kart — ile daje
      // polecenie i ocena, rozstrzyga serwer, nie ten ekran.
      earnTitle: 'Albo zdobądźcie kredyty',
      earnBody: 'Polecenie aplikacji i ocena dokładają kredyty na odblokowanie kart.',
      completeTitle: 'Ukończyliście całą talię!',
      completeBody: 'Zagraliście każdą kartę, jaką mamy. Gratulacje.',
    },

    headerTitle: 'Gra',
    // Card header, e.g. "Karta 3 z 20 · Tura: Wiktoria".
    cardHeader: (current: number, total: number, player: string) =>
      `Karta ${current} z ${total} · Tura: ${player}`,
    challengeHeader: 'Wyzwanie',
    // Nad listą opcji na karcie „do wyboru" (S2) — jedna odpowiedź albo kilka,
    // zależnie od tego, co mówi sama karta. Z imieniem, bo na karcie do wpisania
    // czyja jest tura widać w placeholderze pola, a picker takiego miejsca nie
    // ma: bez imienia dwie osoby nad jednym telefonem nie wiedzą, kto wybiera.
    pickOne: (player: string) => `${player} — wybierz odpowiedź`,
    pickMany: (player: string) => `${player} — możesz wybrać kilka`,
    // The written answer is optional — the field stays hidden behind this. Od
    // S_polish to subtelny inline w karcie, nie przycisk: pisanie jest dodatkiem,
    // a obrysowany przycisk konkurował z dwoma realnymi akcjami pod kartą.
    writeToggleShow: '+ Napisz list',
    writeToggleHide: 'Ukryj pole',
    // Powód, dla którego ktoś miałby chcieć pisać: zapis wspomnienia jest żywy
    // dopiero, gdy OBOJE mają wpisaną odpowiedź (canSaveMemory), a bez tej
    // linijki nigdzie tego nie widać. Drobne i obok przełącznika — pisanie
    // zostaje dodatkiem, tak jak w S_polish.
    writeMemoryHint: 'Odpowiadając pisemnie, możecie zapisać wspomnienie',
    answerPlaceholder: (player: string) => `Odpowiedź: ${player}`,
    passButton: 'Przekaż kolejkę',
    nextButton: 'Następne pytanie',
    challengeDoneButton: 'Zrobione',
    skipButton: 'Pomiń',
    pauseButton: 'Wróć do menu',
    saveButton: 'Zapisz wspomnienie',
    shareButton: 'Udostępnij',
    savedBadge: 'Wspomnienie zapisane',
    saveError: 'Nie udało się zapisać wspomnienia.',

    summaryHeaderTitle: 'Koniec gry',
    summaryTitle: 'To były wszystkie karty',
    // "Zagraliście 18 kart" / "1 kartę" / "3 karty" — Polish counts in three.
    summaryQuestions: (count: number) => `Zagrane karty: ${count}`,
    summaryChallenges: (count: number) => `Wyzwania: ${count}`,
    summaryMemories: (count: number) => `Zapisane wspomnienia: ${count}`,
    // Reset talii, jak restartButton — to samo „od nowa".
    playAgainButton: 'Zagrajcie od nowa',

    // Reset talii: jedna czynność pod trzema przyciskami „od nowa" (podsumowanie,
    // karta wznowienia, lejek przy ukończonej talii). W treści „odnowić talię",
    // żeby nazwa czynności różniła się od nazw przycisków. Robocze, do
    // potwierdzenia przez Wiktorię.
    reset: {
      confirmTitle: 'Odnowić talię?',
      confirmMessage:
        'Wszystkie karty wrócą do gry od początku. Mapa postępów, polubienia i wspomnienia zostają — ale karty zagrane po raz drugi nie zwiększą już postępu.',
      cancel: 'Anuluj',
      confirm: 'Odnówcie',
      done: 'Talia odnowiona — wszystkie karty czekają od początku.',
      tooManyAttempts:
        'Chwilę za szybko. Odczekajcie moment i spróbujcie ponownie.',
      owedReportError:
        'Nie udało się zapisać ostatnich zagranych kart, więc talii nie odnowiliśmy. Sprawdźcie internet i spróbujcie ponownie.',
      error: 'Nie udało się odnowić talii.',
    },
    backHome: 'Wróć do początku',
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
    // Przycisk odznaczenia (3B). Liczba mnoga, bo reszta apki mówi do pary
    // („Odpowiedzcie dziś"). Robocze, do potwierdzenia przez Wiktorię.
    completeButton: 'Zrobiliśmy to',
    completedButton: 'Zrobione ✓',
    // Błąd INNY niż 404. Czterysta cztery to przekroczenie granicy tygodnia
    // przy otwartej apce — wtedy cicho przeładowujemy rytuał i nic nie mówimy.
    completeError: 'Nie udało się zapisać. Spróbujcie jeszcze raz.',
  },

  // 3D: udostępnienie POJEDYNCZEJ karty, wzorowane na modalu z weba. Osobne od
  // `share` niżej, które dotyczy polecania całej aplikacji.
  shareQuestion: {
    title: 'Udostępnij pytanie',
    subtitle: 'Podzielcie się tą kartą ze znajomymi lub w sieci.',
    close: 'Zamknij',
    shareAction: 'Udostępnij',
    copyAction: 'Skopiuj tekst',
    copied: 'Skopiowano do schowka',
    // Stopka podglądu karty — to samo, co niesie web.
    previewInvite: 'Odpowiedzcie na to pytanie razem w aplikacji',
    previewFooter: 'jaity.app',
  },

  // Dwie drogi do kredytu, w jednym miejscu — bo od 3E są jednym komponentem
  // używanym w profilu, w lejku wyczerpania talii i w nagrodach. Etykiety
  // mieszkały wcześniej w `profile`, co przestało być prawdą, gdy przestały być
  // wyłącznie profilowe.
  earn: {
    shareApp: 'Udostępnij aplikację',
    rateApp: 'Oceń aplikację',
    // Nagłówek stałej sekcji w nagrodach (3E). Bez liczby — ile daje polecenie
    // i ocena, rozstrzyga serwer i nie wystawia tego w odpowiedzi, więc ekran
    // nazywający cyfrę zacząłby kłamać w dniu zmiany reguły. Wyjątkiem jest
    // zachęta przy rejestracji, gdzie „+5" jest przypięte do REFERRAL_BONUS
    // komentarzem w obu repozytoriach.
    sectionTitle: 'Zdobądźcie więcej kart',
    sectionBody:
      'Polecenie aplikacji i ocena dokładają kredyty na odblokowanie pytań.',
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
    // Etykieta nad ramką karty (S_polish), złote wersaliki jak licznik w grze —
    // i, od kiedy karta zajmuje cały ekran, jedyne miejsce, gdzie seria ma się
    // zmieścić. Ta sama konstrukcja co localGame.cardHeader: jeden string z
    // kropką rozdzielającą, żeby nie dokładać ekranowi trzeciego elementu.
    //
    // Przy zerowej serii zostaje sama etykieta. Hub już zaprasza do zaczęcia
    // (home.streakNone), a powtarzanie tego nad kartą, którą para właśnie
    // otworzyła, brzmiałoby jak marudzenie.
    //
    // Robocze, do potwierdzenia przez Wiktorię.
    cardLabel: (streakCurrent: number) =>
      streakCurrent > 0
        ? `Pytanie dnia · ${streakDays(streakCurrent)} serii`
        : 'Pytanie dnia',
    placeholder: 'Wpisz odpowiedź...',
    // Etykieta pierwszego pola, zanim /me poda nick. Etykiety z imionami to
    // memoryCard.answerLabel / partnerAnswerLabel — te same co we wspomnieniu,
    // w które ta odpowiedź się zamienia.
    ownAnswerFallback: 'Twoja odpowiedź',
    // Placeholder pola partnera. W nim, a nie w etykiecie: etykieta to złote
    // wersaliki z imieniem do 60 znaków i „(OPCJONALNIE)" złamałoby ją na dwie
    // linie; a nie pod polem, bo przy otwartej klawiaturze liczy się każda
    // linijka. Znika, gdy pole jest wypełnione — wtedy nie jest już potrzebny.
    partnerPlaceholder: 'Opcjonalnie',
    submitButton: 'Zapisz odpowiedź',
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
