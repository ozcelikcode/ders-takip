import { z } from 'zod';

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** A tag name as stored: trimmed, inner spaces collapsed, 1–40 characters. Names are unique per person, ignoring case and Turkish letters. */
export const tagNameSchema = z
  .string()
  .transform((name) => name.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1, 'tagName').max(40, 'tagName'));
export const tagInputSchema = z.object({ name: tagNameSchema }).strict();
/** Replaces the person's tags on one record or session; at most 20, each once. */
export const setTagsSchema = z
  .object({ tagIds: z.array(id).max(20).refine((ids) => new Set(ids).size === ids.length, 'invalid') })
  .strict();
export type TagInput = z.infer<typeof tagInputSchema>;

export const tagSchema = z.object({ id, name: z.string() });
export type Tag = z.infer<typeof tagSchema>;
/** The person's tags and where they are attached; a session matches a tag directly or through its record. */
export const tagListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    tags: z.array(tagSchema),
    courseTags: z.array(z.object({ courseId: id, tagId: id })),
    sessionTags: z.array(z.object({ sessionId: id, tagId: id })),
  }),
});
export type TagAssignments = z.infer<typeof tagListResponseSchema>['data'];
export const tagResponseSchema = z.object({ success: z.literal(true), data: z.object({ tag: tagSchema }) });
