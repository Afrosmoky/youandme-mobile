import { useCallback } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { OwedReportError, useResetDeck } from './useResetDeck';
import { parseApiError } from '../api/errors';
import { useToast } from '../components/Toast';
import { pl } from '../i18n/pl';

type Options = {
  // After a reset that went through. Every call site sends the couple to a
  // fresh setup screen, where the next deal is the full deck.
  onDone: () => void;
  // A sentence for the couple; where it goes is the screen's call.
  onError: (message: string) => void;
};

// Three failures, three different things to tell the couple. None of them has
// cleared anything, so all three end in "try again".
function resetErrorMessage(err: unknown): string {
  if (err instanceof OwedReportError) {
    return pl.localGame.reset.owedReportError;
  }
  // Checked before the parser, which would answer a 429 with the sign-in copy.
  if (axios.isAxiosError(err) && err.response?.status === 429) {
    return pl.localGame.reset.tooManyAttempts;
  }
  return parseApiError(err, pl.localGame.reset.error).topLevel;
}

/**
 * "Od nowa", wherever it appears: one confirmation, one reset, one outcome.
 *
 * "Od nowa" means the full deck, and it means it on every button that says it —
 * the summary, the resume card, the finished-deck panel. That is also why it
 * always asks first: on the resume card a couple may only have meant to drop the
 * paused game, and the confirmation is where they learn it does more.
 */
export function useDeckResetAction({ onDone, onError }: Options) {
  const reset = useResetDeck();
  const toast = useToast();

  const request = useCallback(() => {
    Alert.alert(
      pl.localGame.reset.confirmTitle,
      pl.localGame.reset.confirmMessage,
      [
        // No action: dismissing is doing nothing.
        { text: pl.localGame.reset.cancel, style: 'cancel' },
        {
          text: pl.localGame.reset.confirm,
          style: 'destructive',
          onPress: () => {
            reset.mutate(undefined, {
              onSuccess: () => {
                toast.show(pl.localGame.reset.done);
                onDone();
              },
              onError: err => onError(resetErrorMessage(err)),
            });
          },
        },
      ],
    );
  }, [onDone, onError, reset, toast]);

  return { request, resetting: reset.isPending };
}
