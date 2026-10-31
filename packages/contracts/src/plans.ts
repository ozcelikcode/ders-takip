import { z } from 'zod';
import { topicDifficultySchema } from './catalog.js';
import {
  sessionStatusSchema,
  sessionTypeSchema,
  pomodoroSettingsSchema,
} from './studySessions.js';
// Plans are optional goal containers. A calendar entry is a StudySession.
const planDateSchema = z.iso
  .datetime({ offset: true })
  .or(z.iso.date())
  .transform((value) => new Date(value).toISOString());
export const planGoalsSchema = z
  .object({
    dailyHours: z.number().min(0).max(24),
    weeklyHours: z.number().min(0).max(168),
    targetTopics: z.number().min(0),
    priority: z.enum(['low', 'medium', 'high']),
  })
  .strict();
export const defaultPlanGoals: z.infer<typeof planGoalsSchema> = {
  dailyHours: 4,
  weeklyHours: 28,
  targetTopics: 10,
  priority: 'medium',
};
const planFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().optional(),
    startDate: planDateSchema,
    endDate: planDateSchema,
    goals: planGoalsSchema.optional(),
  })
  .strict();
export const createPlanSchema = planFieldsSchema.refine(
  (value) => value.startDate < value.endDate,
  { path: ['endDate'], message: 'endBeforeStart' },
);
export const updatePlanSchema = planFieldsSchema
  .partial()
  .extend({
    goals: planGoalsSchema.partial().strict().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'nothingToUpdate',
  )
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate < value.endDate,
    { path: ['endDate'], message: 'endBeforeStart' },
  );
export const planQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false']).optional(),
    includeSessions: z.enum(['true', 'false']).optional(),
  })
  .strict();
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type PlanGoals = z.infer<typeof planGoalsSchema>;

const responseInstant = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.iso.datetime(),
);
const relationId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const namedRelation = z.object({ id: relationId, name: z.string() });
// Embedded sessions expose persisted schedule metadata; measured time is in stats.
const linkedSessionSchema = z.object({
  id: relationId,
  userId: relationId,
  planId: relationId.nullable(),
  courseId: relationId.nullable(),
  topicId: relationId.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: responseInstant,
  endTime: responseInstant,
  duration: z.number(),
  status: sessionStatusSchema,
  sessionType: sessionTypeSchema,
  color: z.string().nullable(),
  pomodoroSettings: pomodoroSettingsSchema.nullable(),
  notes: z.string().nullable(),
  productivity: z.number().nullable(),
  completedAt: responseInstant.nullable(),
  trackingCoverage: z.enum(['complete', 'partial', 'untracked']),
  createdAt: responseInstant,
  updatedAt: responseInstant,
  course: namedRelation
    .extend({
      color: z.string(),
      icon: z.string(),
      category: namedRelation.extend({ color: z.string() }),
    })
    .nullable()
    .optional(),
  topic: namedRelation
    .extend({ difficulty: topicDifficultySchema })
    .nullable()
    .optional(),
});
export const planRecordSchema = z.object({
  id: relationId,
  userId: relationId,
  title: z.string(),
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  startDate: responseInstant,
  endDate: responseInstant,
  isActive: z.boolean(),
  goals: planGoalsSchema,
  createdAt: responseInstant,
  updatedAt: responseInstant,
  studySessions: z.array(linkedSessionSchema).optional(),
});
export type PlanRecord = z.infer<typeof planRecordSchema>;
