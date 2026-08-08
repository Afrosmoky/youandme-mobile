import { Question } from './types';
import { Challenge, CHALLENGES } from './challenges';
import { CHALLENGE_INTERVAL, REPORT_BATCH_MAX } from '../config/game';

// The rules of the local two-player game (P10), as pure functions.
//
// The client is authoritative here (canon ◆A): the server deals a pre-filtered
// deck — "what this couple may play" — and everything below decides the order,
// the challenge rhythm, whose turn it is and when the session is over. That
// split is the security line, not a convenience: no sequencing here can reach a
// card the deck endpoint did not hand out.
//
// No React, no storage, no network. The screens and
// src/storage/localGameState.ts are thin shells over these functions, which is
// what lets the rules be tested on their own — and the demo (GameClient.tsx) is
// the cautionary tale, with the same rules spread across a dozen useEffects.
//
// Every function returns a new state rather than mutating: the caller keeps it
// in React state and writes it to disk, and both want a value that changed.

export type ActivePlayer = 'p1' | 'p2';

// One position in the queue.
//
// A question carries the WHOLE card, not just its ulid, because the queue is
// persisted and resumed. Storing ulids and refetching on resume would not do:
// GET /questions/deck re-filters on every call, so a resumed session could come
// back with a different set of cards than it started with. Forty cards of text
// is a few kilobytes — a cheap price for a resume that shows what it promised.
export type QueueItem =
  | { kind: 'question'; question: Question }
  | { kind: 'challenge'; challenge: Challenge };

export type LocalGameState = {
  // Who is playing, and out of which category. A stored session resumes only
  // while all three still match the setup screen — see matchesSetup.
  player1: string;
  player2: string;
  categorySlug: string | null;

  queue: QueueItem[];
  cursor: number;
  activePlayer: ActivePlayer;
  // Answers to the CURRENT card only, cleared on every advance. Text the couple
  // wrote and chose not to save is not a memory, and carrying it onto the next
  // card would be worse than dropping it.
  answers: { p1: string; p2: string };

  // Question cards the couple has left behind — what POST /game/local/report
  // sends after the session. Written on advance rather than on display: dealing
  // is not playing (the same line GET /questions/deck draws by recording
  // nothing), so a couple that puts the phone down mid-card has not played it.
  playedUlids: string[];
  // Question ulids already saved as a memory. Counted on the summary screen, and
  // it stops one card being saved twice.
  savedMemoryUlids: string[];

  startedAt: string;
};

/**
 * Builds the playable queue: the dealt questions in the order the server gave
 * them, with a challenge slipped in after every `interval`-th question.
 *
 * Two rules the demo does not have, both from the canon:
 *
 *   - a challenge never lands last. A session has to end on a question, or the
 *     couple finishes on an instruction with nothing following it — so a
 *     challenge goes in only while at least one question is still to come.
 *   - a challenge is never repeated. They are dealt in order and simply run out.
 *     With twenty cards and a deck capped at 100 that cannot happen today (19
 *     slots at most), but a shorter bundle must degrade to "no challenge" rather
 *     than show the same one twice.
 *
 * Order is the bundle's own, deliberately not shuffled — 1:1 with the demo. It
 * does mean the first challenge is the same every session; `challenges` is a
 * parameter, so shuffling stays a caller's decision if that ever grates.
 */
export function buildQueue(
  questions: Question[],
  challenges: Challenge[] = CHALLENGES,
  interval: number = CHALLENGE_INTERVAL,
): QueueItem[] {
  const queue: QueueItem[] = [];
  let nextChallenge = 0;

  questions.forEach((question, index) => {
    queue.push({ kind: 'question', question });

    const dealt = index + 1;
    const questionsLeft = questions.length - dealt;
    const due = interval > 0 && dealt % interval === 0;

    if (due && questionsLeft > 0 && nextChallenge < challenges.length) {
      queue.push({ kind: 'challenge', challenge: challenges[nextChallenge] });
      nextChallenge += 1;
    }
  });

  return queue;
}

/**
 * A fresh session, ready for the first card.
 *
 * `startedAt` is passed in rather than read from the clock here: this module
 * stays pure so its tests never depend on when they run, and the screen is the
 * one place that knows the real time anyway.
 */
export function startLocalGame(params: {
  player1: string;
  player2: string;
  categorySlug: string | null;
  questions: Question[];
  challenges?: Challenge[];
  interval?: number;
  startedAt: string;
}): LocalGameState {
  return {
    player1: params.player1,
    player2: params.player2,
    categorySlug: params.categorySlug,
    queue: buildQueue(params.questions, params.challenges, params.interval),
    cursor: 0,
    activePlayer: 'p1',
    answers: { p1: '', p2: '' },
    playedUlids: [],
    savedMemoryUlids: [],
    startedAt: params.startedAt,
  };
}

// The card on screen, or null once the queue is spent.
export function currentItem(state: LocalGameState): QueueItem | null {
  return state.queue[state.cursor] ?? null;
}

// The session is over when the cursor has walked off the end of the queue. An
// empty deck is therefore finished from the start, which is correct: a couple
// who has played every card in a category has nothing left to be dealt.
export function isFinished(state: LocalGameState): boolean {
  return state.cursor >= state.queue.length;
}

// Records what one player has typed for the current card.
export function setAnswer(
  state: LocalGameState,
  player: ActivePlayer,
  text: string,
): LocalGameState {
  return { ...state, answers: { ...state.answers, [player]: text } };
}

// Player 1 hands the phone over. Only ever p1 -> p2: the way back to p1 is
// advancing to the next card, never a second handover on the same one.
export function passTurn(state: LocalGameState): LocalGameState {
  if (state.activePlayer !== 'p1') {
    return state;
  }
  return { ...state, activePlayer: 'p2' };
}

/**
 * Leaves the current card behind and moves to the next.
 *
 * This is the ONE transition behind both "następne pytanie" and a skip. The
 * canon defines a played card as one the couple moved past, however they moved
 * past it, so there is nothing a separate skip would do differently — and one
 * function means the two can never drift apart.
 *
 * The duplicate guard on playedUlids looks redundant, because the cursor only
 * moves forward and a card is passed once. It stays because of what a duplicate
 * would cost: POST /game/local/report rejects a batch containing the same ulid
 * twice with a 422, so one repeat would fail the report for the WHOLE session,
 * not for one card.
 */
export function advance(state: LocalGameState): LocalGameState {
  if (isFinished(state)) {
    return state;
  }

  const item = state.queue[state.cursor];
  const played =
    item.kind === 'question' && !state.playedUlids.includes(item.question.ulid)
      ? [...state.playedUlids, item.question.ulid]
      : state.playedUlids;

  return {
    ...state,
    cursor: state.cursor + 1,
    activePlayer: 'p1',
    answers: { p1: '', p2: '' },
    playedUlids: played,
  };
}

// Notes that this card has been written into the couple's memories.
export function markMemorySaved(
  state: LocalGameState,
  questionUlid: string,
): LocalGameState {
  if (state.savedMemoryUlids.includes(questionUlid)) {
    return state;
  }
  return {
    ...state,
    savedMemoryUlids: [...state.savedMemoryUlids, questionUlid],
  };
}

/**
 * Whether "Zapisz wspomnienie" is live right now.
 *
 * On only once BOTH have written something: a memory from the local game is the
 * pair of answers, and writing is optional here — which is exactly why progress
 * counts played cards rather than saved ones. Off on a challenge (no question to
 * hang a memory on) and off on a card already saved.
 *
 * Deliberately stricter than the backend, which requires only answer_a on POST
 * /memories/local. The looser server rule is there for other callers; the game
 * card offers the save when the card is actually complete.
 */
export function canSaveMemory(state: LocalGameState): boolean {
  const item = currentItem(state);
  if (item === null || item.kind !== 'question') {
    return false;
  }
  if (state.savedMemoryUlids.includes(item.question.ulid)) {
    return false;
  }
  return (
    state.answers.p1.trim().length > 0 && state.answers.p2.trim().length > 0
  );
}

/**
 * What the single primary button at the bottom of the card does right now —
 * "Przekaż kolejkę" while player 1 holds the phone, "Następne pytanie"
 * otherwise. A challenge has no turns, so it is always "next".
 *
 * Here rather than in the screen so the rule is testable and the screen is left
 * choosing copy, which is all P11b will want to move.
 */
export function primaryAction(state: LocalGameState): 'pass' | 'next' {
  const item = currentItem(state);
  if (item === null || item.kind !== 'question') {
    return 'next';
  }
  return state.activePlayer === 'p1' ? 'pass' : 'next';
}

/**
 * Whether a stored session still belongs to the setup in front of the user.
 *
 * The same guard as the demo (player1 / player2 / deck): change the partner or
 * the category and the queue on disk answers a different question, so it is
 * started over rather than resumed.
 */
export function matchesSetup(
  state: LocalGameState,
  setup: { player1: string; player2: string; categorySlug: string | null },
): boolean {
  return (
    state.player1 === setup.player1 &&
    state.player2 === setup.player2 &&
    state.categorySlug === setup.categorySlug
  );
}

/**
 * Header counter: "Karta X z Y". Questions only — a challenge is not a card out
 * of the deck, and numbering it would make the total disagree with what the
 * couple was dealt.
 *
 * One expression covers all three cases, because counting the questions up to
 * and including the cursor means: on a question, its own 1-based number; on a
 * challenge, the number of the question it follows (reads as "between X and
 * X+1"); past the end, the total.
 */
export function questionCounter(state: LocalGameState): {
  current: number;
  total: number;
} {
  return {
    current: state.queue
      .slice(0, state.cursor + 1)
      .filter(item => item.kind === 'question').length,
    total: state.queue.filter(item => item.kind === 'question').length,
  };
}

/**
 * Splits the played buffer into batches POST /game/local/report will accept.
 *
 * The endpoint is forgiving about being called twice with the same cards (it
 * keeps a set) and unforgiving about two things inside one call: a repeated ulid
 * is a 422, and so is a batch over the cap. Both are handled here, once, rather
 * than trusted to every call site.
 *
 * The duplicate guard in `advance` should already make the dedupe redundant.
 * That is the point — this is the layer that has to be right even if the state
 * on disk was written by an older build, or by a bug we have not found yet,
 * because the failure it prevents costs the couple the whole session's progress.
 *
 * An empty buffer yields no batches at all, so "nothing to report" needs no
 * special case at the call site — it simply sends nothing.
 */
export function reportBatches(
  playedUlids: string[],
  size: number = REPORT_BATCH_MAX,
): string[][] {
  const unique = [...new Set(playedUlids)];
  const batches: string[][] = [];

  for (let i = 0; i < unique.length; i += size) {
    batches.push(unique.slice(i, i + size));
  }

  return batches;
}

export type LocalGameSummary = {
  questionsPlayed: number;
  challengesShown: number;
  memoriesSaved: number;
};

// Counters for the summary screen, every one of them derived rather than
// tracked. The demo kept answeredCount and challengesCompleted in state and had
// to keep them in step with the cursor by hand; the queue and the cursor already
// say all three.
export function summarise(state: LocalGameState): LocalGameSummary {
  const challengesShown = state.queue
    .slice(0, state.cursor)
    .filter(item => item.kind === 'challenge').length;

  return {
    questionsPlayed: state.playedUlids.length,
    challengesShown,
    memoriesSaved: state.savedMemoryUlids.length,
  };
}
