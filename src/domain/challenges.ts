// The challenge cards Wiktoria wrote, bundled with the app rather than served
// (canon ◆B = mobile-only): the set is small and stable for the MVP, and the
// rhythm that deals them is client-side anyway (canon §5 — the server owns "what
// may be played", the client "in what order"), so a round trip would buy
// nothing. Migration to Catalog stays demand-driven, for stage II.
//
// Ported from the demo's kod_firebase/src/data/challenges-pl.ts — twenty cards,
// text verbatim. Text only: the yoga card carries an SVG illustration component
// there, which does not travel to React Native. The `type` marker survives so
// P11b can hang artwork off it.
//
// All challenges are free in the MVP: no FREE_CHALLENGE_LIMIT gate, unlike the
// demo. A challenge is not a closed-deck card.

export type Challenge = {
  id: string;
  title: string;
  description: string;
  // Marks the one card that wants artwork rather than plain text (P11b).
  type?: 'yoga';
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'onewordchallenge',
    title: "Wyzwanie 'Jedno Słowo'",
    description:
      "Pomyślcie o waszym związku. W tym samym momencie, na 'trzy', wypowiedzcie na głos jedno słowo, które najlepiej go opisuje. Zobaczcie, czy trafiliście na to samo!",
  },
  {
    id: 'backdrawingchallenge',
    title: "Wyzwanie 'Rysunek na Plecach'",
    description:
      'Jedna osoba zamyka oczy, a druga rysuje palcem na jej plecach prosty symbol (np. serce, słońce). Osoba z zamkniętymi oczami musi zgadnąć, co to było. Zróbcie to na zmianę.',
  },
  {
    id: 'playlistchallenge',
    title: "Wyzwanie 'Wspólna Playlista'",
    description:
      'Stwórzcie wspólną playlistę z 5 piosenkami, które opisują wasz związek. Każde z was dodaje na zmianę po jednym utworze.',
  },
  {
    id: 'mimicmasterchallenge',
    title: "Wyzwanie 'Mistrz Mimiki'",
    description:
      'Jedna osoba pokazuje serię 5 różnych emocji (np. radość, zaskoczenie, obraza) tylko za pomocą mimiki. Druga osoba musi odgadnąć, co dokładnie oznacza każda mina.',
  },
  {
    id: 'rockpaperscissorschallenge',
    title: "Wyzwanie 'Papier, Kamień, Nożyce o Przysługę'",
    description:
      "Zagrajcie w 'Papier, kamień, nożyce' do dwóch wygranych. Zwycięzca może poprosić przegranego o jedną, małą przysługę do zrealizowania w ciągu 24 godzin (np. zrobienie herbaty, masaż karku).",
  },
  {
    id: 'gazechallenge',
    title: 'Wyzwanie Spojrzeń',
    description:
      'Patrzcie sobie w oczy przez minutę. Można mrugać i się śmiać. Po wszystkim opiszcie, co czuliście.',
  },
  {
    id: 'oldphotochallenge',
    title: "Wyzwanie 'Stare Zdjęcie'",
    description:
      'Znajdźcie jedno z waszych pierwszych wspólnych zdjęć. Spróbujcie je odtworzyć, robiąc sobie nowe zdjęcie w tej samej pozie.',
  },
  {
    id: 'portraitchallenge',
    title: "Wyzwanie 'Portret bez patrzenia'",
    description:
      'Weźcie kartkę i długopis. Patrząc sobie w oczy (i nie zerkając na kartkę!), narysujcie nawzajem swoje portrety. Porównajcie swoje dzieła!',
  },
  {
    id: 'yogachallenge',
    title: 'Wyzwanie Jogi',
    description:
      'Czas na odrobinę ruchu i balansu! Wybierzcie jedną z poniższych pozycji jogi i spróbujcie ją wspólnie odtworzyć. Skupcie się na współpracy i dobrej zabawie!',
    type: 'yoga',
  },
  {
    id: 'priceexpertchallenge',
    title: "Wyzwanie 'Cenowy Ekspert'",
    description:
      'Każde z was wybiera jeden przedmiot (z domu lub znaleziony w internecie) i pokazuje go drugiej osobie. Waszym zadaniem jest odgadnąć jego cenę. Ustalcie wspólnie próg błędu (np. +/- 20 zł). Kto będzie bliżej?',
  },
  {
    id: 'treasuremapchallenge',
    title: "Wyzwanie 'Mapa Skarbów'",
    description:
      "Jedna osoba chowa mały przedmiot w pokoju. Następnie, używając tylko słów (bez gestów), musi pokierować drugą osobą (z zamkniętymi oczami) prosto do tego 'skarbu'.",
  },
  {
    id: 'complimentschallenge',
    title: "Wyzwanie 'Głuchy Telefon Komplementów'",
    description:
      'Jedna osoba ma na uszach słuchawki z głośną muzyką. Druga osoba bezgłośnie (tylko ruchem warg) mówi jej szczery komplement. Zobaczmy, czy uda się go odczytać!',
  },
  {
    id: 'flirtylectorchallenge',
    title: "Wyzwanie 'Flirtujący Lektor'",
    description:
      'Wybierzcie książkę i otwórzcie ją na losowej stronie. Jeśli nie macie książki pod ręką, wejdźcie na losowy artykuł na Wikipedii. Waszym zadaniem jest przeczytanie na głos pierwszego akapitu w jak najbardziej flirtujący sposób. Zróbcie to na zmianę.',
  },
  {
    id: 'relationsshipcipherchallenge',
    title: "Wyzwanie 'Szyfr Związku'",
    description:
      "Czas stworzyć wasz własny, tajny język! Waszym zadaniem jest wymyślenie 3 unikalnych haseł (słów lub krótkich fraz) do użycia w sytuacjach, gdy potrzebujecie dyskretnie coś sobie przekazać, np. 'Chcę już iść', 'Potrzebuję wsparcia' lub 'Myślę o czymś niegrzecznym'.",
  },
  {
    id: 'thankyouchallenge',
    title: "Wyzwanie 'Dziękuję Ci Za...'",
    description:
      "Patrząc sobie w oczy, powiedzcie sobie nawzajem trzy konkretne rzeczy, za które jesteście wdzięczni w waszym związku, które wydarzyły się w ostatnim tygodniu (np. 'Dziękuję, że zrobiłeś/aś mi herbatę').",
  },
  {
    id: 'roleswapchallenge',
    title: "Wyzwanie 'Zamiana Ról'",
    description:
      'Przez następne 5 minut spróbujcie naśladować sposób, w jaki druga osoba mówi, siedzi i gestykuluje. To zabawny sposób na zobaczenie, jak postrzegacie siebie nawzajem.',
  },
  {
    id: 'mirrorchallenge',
    title: "Wyzwanie 'Lustro'",
    description:
      'Jedna osoba dzieli się cechą charakteru, którą postrzega jako wadę. Zadaniem drugiej osoby jest spojrzeć na to z innej perspektywy i szczerze przedstawić to jako zaletę lub siłę, podając konkretny przykład. Zróbcie to na zmianę.',
  },
  {
    id: 'syncbreathchallenge',
    title: "Wyzwanie 'Oddech Synchroniczny'",
    description:
      'Usiądźcie twarzą w twarz, trzymając się za ręce. Patrzcie sobie w oczy i przez 60 sekund starajcie się oddychać w tym samym rytmie – robiąc wdech i wydech w tym samym momencie.',
  },
  {
    id: 'auratouchchallenge',
    title: "Wyzwanie 'Dotyk Aury'",
    description:
      'Jedna osoba zamyka oczy. Druga osoba bardzo powoli zbliża opuszek palca do trzech różnych miejsc na ciele partnera (np. policzek, kark), zatrzymując go milimetr od skóry. Osoba z zamkniętymi oczami musi odgadnąć, gdzie znajduje się palec.',
  },
  {
    id: 'artifactchallenge',
    title: "Wyzwanie 'Artefakt Mocy'",
    description:
      "Czas stworzyć wasze osobiste amulety. Wybierzcie i wymieńcie się drobnymi, osobistymi przedmiotami (np. gumka do włosów, breloczek od kluczy). To wasze 'Artefakty Mocy'. Noście je przy sobie, zwłaszcza gdy jesteście osobno. Gdy poczujecie tęsknotę lub będziecie potrzebować wsparcia, dotknijcie swojego artefaktu, aby poczuć bliskość i siłę, którą sobie dajecie.",
  },
];
