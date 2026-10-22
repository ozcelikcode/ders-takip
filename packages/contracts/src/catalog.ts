import { z } from 'zod';

export const catalogIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const catalogPathIdSchema = z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)));
const order = catalogIdSchema;
const appearance = {
  description: z.string().optional(),
  color: z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  icon: z.string().max(50).optional(),
  order: order.optional(),
  isActive: z.boolean().optional(),
};
const namedFields = z.object({ name: z.string().trim().min(1).max(100), ...appearance }).strict();
/** Shared categories are managed by admins; personal ones by their owner. Users can only create personal ones. */
export const categoryScopeSchema = z.enum(['shared', 'personal']);
export type CategoryScope = z.infer<typeof categoryScopeSchema>;
// Without a scope an admin creates a shared category and anyone else a personal one.
export const createCategorySchema = namedFields.extend({ scope: categoryScopeSchema.optional() });
export const updateCategorySchema = namedFields.partial().refine(value => Object.keys(value).length > 0);
export const deleteCategorySchema = z.object({ migrateToCategoryId: catalogIdSchema.optional() }).strict();
export const createCourseSchema = namedFields.extend({ categoryId: catalogIdSchema, isGlobal: z.boolean().optional() });
export const updateCourseSchema = createCourseSchema.partial().refine(value => Object.keys(value).length > 0);
export const createTopicSchema = z.object({
  name: z.string().trim().min(1).max(200), courseId: catalogIdSchema,
  description: z.string().optional(), estimatedTime: z.number().int().min(5).max(480),
  difficulty: z.enum(['Kolay', 'Orta', 'Zor']), order: order.optional(),
}).strict();
export const updateTopicSchema = createTopicSchema.omit({ courseId: true }).partial().extend({ isActive: z.boolean().optional() })
  .refine(value => Object.keys(value).length > 0);
export const reorderTopicsSchema = z.object({
  topicOrders: z.array(z.object({ id: catalogIdSchema, order }).strict()),
  expectedTopics: z.array(z.object({ id: catalogIdSchema, updatedAt: z.iso.datetime({ offset: true }) }).strict()),
}).strict().superRefine((value, context) => {
  const ids = value.topicOrders.map(topic => topic.id);
  const orders = value.topicOrders.map(topic => topic.order);
  const expectedIds = value.expectedTopics.map(topic => topic.id);
  const expectedSet = new Set(expectedIds);
  if (new Set(ids).size !== ids.length || expectedSet.size !== expectedIds.length ||
      new Set(orders).size !== orders.length || orders.some(position => position > ids.length) ||
      ids.length !== expectedIds.length || ids.some(id => !expectedSet.has(id))) {
    context.addIssue({ code: 'custom', message: 'reorderList' });
  }
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type ReorderTopicsInput = z.infer<typeof reorderTopicsSchema>;
export const topicProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);
export type TopicProgressStatus = z.infer<typeof topicProgressStatusSchema>;
export const setTopicProgressSchema = z.object({ status: topicProgressStatusSchema }).strict();
export type SetTopicProgressInput = z.infer<typeof setTopicProgressSchema>;
export interface TopicProgressEntry { topicId: number; courseId: number; status: Exclude<TopicProgressStatus, 'not_started'> }
