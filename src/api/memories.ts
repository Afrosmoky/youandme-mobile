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
// `nextCursor` from a previous page to load the next.
export async function listMemories(cursor?: string): Promise<MemoriesPage> {
  const res = await apiClient.get('/memories', {
    params: { cursor, per_page: DEFAULT_PER_PAGE },
  });
  const parsed = listMemoriesResponseSchema.parse(res.data);
  return {
    memories: parsed.data.map(mapRawMemory),
    nextCursor: parsed.meta.next_cursor,
    prevCursor: parsed.meta.prev_cursor,
  };
}
