import { z } from 'zod';
import { apiClient } from './client';
import { rawCategorySchema, mapRawCategory, type Category } from '../domain/types';

// GET /categories returns the list under `data`, sorted by ordering.
const listResponseSchema = z.object({
  data: z.array(rawCategorySchema),
});

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get('/categories');
  const parsed = listResponseSchema.parse(data);
  return parsed.data.map(mapRawCategory);
}
