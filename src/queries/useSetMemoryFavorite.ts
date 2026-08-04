import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { MemoriesPage, setMemoryFavorite } from '../api/memories';
import { Memory } from '../domain/types';
import { queryKeys } from './queryKeys';

// Hearts / unhearts a memory (P9).
//
// `favorite` is the state we want, not the state we are in — the API is two
// idempotent verbs, so the caller names the destination and a retry cannot
// undo itself (the P5 likes pattern).
type FavoriteVariables = {
  ulid: string;
  favorite: boolean;
};

type FavoriteContext = {
  lists: [readonly unknown[], InfiniteData<MemoriesPage> | undefined][];
  detail: Memory | undefined;
};

export function useSetMemoryFavorite() {
  const queryClient = useQueryClient();

  // Writes one memory's favourite state into every cached list page and into the
  // card screen's own query, so the heart is the same wherever it is on screen.
  const writeFavorite = (ulid: string, isFavorite: boolean) => {
    queryClient.setQueriesData<InfiniteData<MemoriesPage>>(
      { queryKey: queryKeys.memoriesLists },
      current =>
        current && {
          ...current,
          pages: current.pages.map(page => ({
            ...page,
            memories: page.memories.map(memory =>
              memory.ulid === ulid ? { ...memory, isFavorite } : memory,
            ),
          })),
        },
    );
    queryClient.setQueryData<Memory>(
      queryKeys.memory(ulid),
      current => current && { ...current, isFavorite },
    );
  };

  return useMutation({
    mutationFn: ({ ulid, favorite }: FavoriteVariables) =>
      setMemoryFavorite(ulid, favorite),
    // Optimistic, like the daily card's heart: the tap is the whole interaction,
    // and a heart that waits for the network reads as a broken tap.
    onMutate: async ({ ulid, favorite }): Promise<FavoriteContext> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.memories });
      const context: FavoriteContext = {
        lists: queryClient.getQueriesData<InfiniteData<MemoriesPage>>({
          queryKey: queryKeys.memoriesLists,
        }),
        detail: queryClient.getQueryData<Memory>(queryKeys.memory(ulid)),
      };
      writeFavorite(ulid, favorite);
      return context;
    },
    onError: (_err, { ulid }, context) => {
      context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(queryKeys.memory(ulid), context?.detail);
    },
    onSuccess: memory => {
      // Reconcile with server truth (identical in the happy path, so nothing
      // flickers), then refresh ONLY the favourites list: its membership just
      // changed, while the unfiltered list shows the same memories as before.
      writeFavorite(memory.ulid, memory.isFavorite);
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesList(true) });
    },
  });
}
