import { z } from 'zod';

export const aiVocabulary = z.object({
  categories: z.array(z.string().min(1).max(100)).max(500).optional().default([]),
  brands: z.array(z.string().min(1).max(100)).max(1000).optional().default([]),
  colors: z.array(z.string().min(1).max(50)).max(100).optional().default([]),
  useCases: z.array(z.string().min(1).max(100)).max(200).optional().default([]),
  genders: z.array(z.string().min(1).max(50)).max(50).optional().default([]),
});

export const aiAnalyzeQueryBody = z.object({
  query: z.string().trim().min(1).max(500),
  vocabulary: aiVocabulary.optional().default({}),
});
