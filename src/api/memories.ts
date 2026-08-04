import { z } from 'zod';
import { apiClient } from './client';
import {
  rawMemorySchema,
  mapRawMemory,
  rawGameSessionSchema,
  mapRawGameSession,
  Memory,
  GameSession,
} from '../domain/types';

// P3: POST /memories returns the created memory plus the advanced session.
const createResponseSchema = z.object({
  memory: rawMemorySchema,
  session: rawGameSessionSchema,
});

// P9: the detail read, the heart and the edit all answer with the same envelope.
const memoryResponseSchema = z.object({ memory: rawMemorySchema });

// P2 backend: GET /memories is cursor-paginated. The list lives under `data`,
// paging under `meta`. We map the snake_case cursors to camelCase here.
const listMemoriesResponseSchema = z.object({
  data: z.array(rawMemorySchema),
  meta: z.object({
    next_cursor: z.string().nullable(),
    prev_cursor: z.string().nullable(),
    per_page: z.number(),
  }),
});

// Default page size. Backend caps at 50.
const DEFAULT_PER_PAGE = 20;

export type CreateMemoryInput = {
  questionUlid: string;
  answerA: string;
  // P3 mobile always sends null; the second player's answer lands in P10.
  answerB?: string | null;
  answeredAt: string;
};

export type CreateMemoryResult = {
  memory: Memory;
  session: GameSession;
};

export type MemoriesPage = {
  memories: Memory[];
  nextCursor: string | null;
  prevCursor: string | null;
};

// P9: editing replaces BOTH answers. The backend reads a missing (or empty)
// answer_b as "the partner said nothing" and clears it, so the caller always
// holds the whole card — see updateMemory.
export type UpdateMemoryInput = {
  answerA: string;
  answerB: string | null;
};

export type ListMemoriesParams = {
  cursor?: string;
  // ?favorites=1 narrows the same list: same shape, same order, same cursor.
  favoritesOnly?: boolean;
};

export async function createMemory(
  input: CreateMemoryInput,
): Promise<CreateMemoryResult> {
  const res = await apiClient.post('/memories', {
    question_ulid: input.questionUlid,
    answer_a: input.answerA,
    answer_b: input.answerB ?? null,
    answered_at: input.answeredAt,
  });
  const parsed = createResponseSchema.parse(res.data);
  return {
    memory: mapRawMemory(parsed.memory),
    session: mapRawGameSession(parsed.session),
  };
}

// Fetches one page of memories. Omit `cursor` for the first page; pass
// `nextCursor` from a previous page to load the next. `favoritesOnly` narrows
// the same list — the flag is sent only when set, so the unfiltered request
// stays byte-identical to what it was before P9.
export async function listMemories({
  cursor,
  favoritesOnly,
}: ListMemoriesParams = {}): Promise<MemoriesPage> {
  const res = await apiClient.get('/memories', {
    params: {
      cursor,
      per_page: DEFAULT_PER_PAGE,
      ...(favoritesOnly ? { favorites: 1 } : {}),
    },
  });
  const parsed = listMemoriesResponseSchema.parse(res.data);
  return {
    memories: parsed.data.map(mapRawMemory),
    nextCursor: parsed.meta.next_cursor,
    prevCursor: parsed.meta.prev_cursor,
  };
}

// One memory by ulid (P9). Exists for the card screen: reached from the list,
// but also from an anniversary push, where the memory is a year old and sits far
// past the first cursor page — so the list cache cannot be the source.
export async function getMemory(ulid: string): Promise<Memory> {
  const res = await apiClient.get(`/memories/${ulid}`);
  return mapRawMemory(memoryResponseSchema.parse(res.data).memory);
}

// Hearts or unhearts a memory. Two idempotent verbs rather than one toggle: a
// retried request cannot undo what the first one did (the P5 likes pattern).
export async function setMemoryFavorite(
  ulid: string,
  favorite: boolean,
): Promise<Memory> {
  const path = `/memories/${ulid}/favorite`;
  const res = favorite
    ? await apiClient.put(path)
    : await apiClient.delete(path);
  return mapRawMemory(memoryResponseSchema.parse(res.data).memory);
}

// Replaces both answers. Despite the PATCH verb this is a full replacement:
// omitting answer_b clears the partner's answer server-side, so a cleared field
// travels as an explicit null and the caller must always hold the whole card.
export async function updateMemory(
  ulid: string,
  input: UpdateMemoryInput,
): Promise<Memory> {
  const res = await apiClient.patch(`/memories/${ulid}`, {
    answer_a: input.answerA,
    answer_b: input.answerB,
  });
  return mapRawMemory(memoryResponseSchema.parse(res.data).memory);
}

// Soft delete: 204, no body. The memory leaves every list, but the progress map
// keeps counting it (the backend counts withTrashed), which is why nothing here
// touches queryKeys.progress.
export async function deleteMemory(ulid: string): Promise<void> {
  await apiClient.delete(`/memories/${ulid}`);
}
