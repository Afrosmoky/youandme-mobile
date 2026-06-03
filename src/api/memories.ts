import { z } from 'zod';
import { apiClient } from './client';
import { memorySchema, Memory } from '../domain/types';

const createMemoryResponseSchema = z.object({
  memory: memorySchema,
});

// P2 backend: GET /memories is cursor-paginated. The list lives under `data`,
// paging under `meta`. We map the snake_case cursors to camelCase here.
const listMemoriesResponseSchema = z.object({
  data: z.array(memorySchema),
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
  answer: string;
  answeredAt: string;
};

export type MemoriesPage = {
  memories: Memory[];
  nextCursor: string | null;
  prevCursor: string | null;
};

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const res = await apiClient.post('/memories', {
    question_ulid: input.questionUlid,
    answer: input.answer,
    answered_at: input.answeredAt,
  });
  return createMemoryResponseSchema.parse(res.data).memory;
}

// Fetches one page of memories. Omit `cursor` for the first page; pass
// `nextCursor` from a previous page to load the next.
export async function listMemories(cursor?: string): Promise<MemoriesPage> {
  const res = await apiClient.get('/memories', {
    params: { cursor, per_page: DEFAULT_PER_PAGE },
  });
  const parsed = listMemoriesResponseSchema.parse(res.data);
  return {
    memories: parsed.data,
    nextCursor: parsed.meta.next_cursor,
    prevCursor: parsed.meta.prev_cursor,
  };
}
