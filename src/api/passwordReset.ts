import { z } from 'zod';
import { apiClient } from './client';

// Backend returns { status: "..." } (Laravel password broker convention), not
// { message: ... }. We surface it to callers as `message`.
const forgotResponseSchema = z.object({ status: z.string() });

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  const res = await apiClient.post('/auth/password/forgot', { email });
  return { message: forgotResponseSchema.parse(res.data).status };
}
