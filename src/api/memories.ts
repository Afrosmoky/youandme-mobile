import { z } from 'zod';
import { apiClient } from './client';
import { memorySchema, Memory } from '../domain/types';

const createMemoryResponseSchema = z.object({
  memory: memorySchema,
});

const listMemoriesResponseSchema = z.object({
  memories: z.array(memorySchema),
});

export type CreateMemoryInput = {
  questionUlid: string;
  answer: string;
  answeredAt: string;
};

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const res = await apiClient.post('/memories', {
    question_ulid: input.questionUlid,
    answer: input.answer,
    answered_at: input.answeredAt,
  });
  return createMemoryResponseSchema.parse(res.data).memory;
}

export async function listMemories(): Promise<Memory[]> {
  const res = await apiClient.get('/memories');
  return listMemoriesResponseSchema.parse(res.data).memories;
}
