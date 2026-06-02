import { z } from 'zod';
import { apiClient } from './client';
import { questionSchema, Question } from '../domain/types';

const nextQuestionResponseSchema = z.object({
  question: questionSchema,
});

export async function fetchNextQuestion(): Promise<Question> {
  const res = await apiClient.get('/questions/next');
  return nextQuestionResponseSchema.parse(res.data).question;
}
