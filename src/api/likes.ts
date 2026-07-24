import { z } from 'zod';
import { apiClient } from './client';

// P5 Slice 1b: a couple likes/unlikes a served question. Both endpoints are
// idempotent server-side (double like / unlike of a non-like are no-ops) and
// return the resulting state. The like state itself is not fetched separately —
// it rides along with the question payload (see rawQuestionSchema.liked).
const likeResponseSchema = z.object({
  liked: z.boolean(),
});

export type LikeResult = {
  liked: boolean;
};

export async function likeQuestion(ulid: string): Promise<LikeResult> {
  const res = await apiClient.post(`/questions/${ulid}/like`);
  return likeResponseSchema.parse(res.data);
}

export async function unlikeQuestion(ulid: string): Promise<LikeResult> {
  const res = await apiClient.delete(`/questions/${ulid}/like`);
  return likeResponseSchema.parse(res.data);
}
