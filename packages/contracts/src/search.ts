import { z } from 'zod';
import { sessionStatusSchema } from './studySessions.js';

export const searchQuerySchema = z
  .object({ q: z.string().trim().min(2, 'En az 2 karakter girin').max(100) })
  .strict();
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  courses: z.array(
    z.object({ id: z.number().int(), name: z.string(), categoryName: z.string().nullable(), isActive: z.boolean() }),
  ),
  topics: z.array(
    z.object({ id: z.number().int(), name: z.string(), courseId: z.number().int(), courseName: z.string() }),
  ),
  sessions: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      startTime: z.iso.datetime({ offset: true }),
      status: sessionStatusSchema,
      /** Which field matched, so the result can explain why it appears. */
      matchedIn: z.enum(['title', 'description', 'notes']),
    }),
  ),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

/** Per-group result limit; the page says when a group may have more. */
export const searchLimit = 10;
