import { z } from "zod";

export const recommendRequestSchema = z.object({
  prompt: z.string().min(3).max(500),
  excludeTitles: z.array(z.string()).max(10).optional(),
});

export const bookRecommendationSchema = z.object({
  title: z.string(),
  author: z.string(),
  reason: z.string().max(160),
});

export const llmOutputSchema = z.object({
  recommendations: z.array(bookRecommendationSchema),
});

export const readingListSchema = z.object({
  title: z.string(),
  author: z.string(),
  coverUrl: z.string().nullable().optional(),
  openLibraryKey: z.string(),
});
