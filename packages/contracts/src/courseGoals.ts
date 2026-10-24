import { z } from 'zod';

/** The most a weekly goal can ask for: every minute of the week. */
export const maxWeeklyGoalMinutes = 7 * 24 * 60;

/** A person's own weekly target for one record, in measured minutes. */
export const setCourseGoalSchema = z.object({ weeklyMinutes: z.number().int().min(1).max(maxWeeklyGoalMinutes) }).strict();
export type SetCourseGoalInput = z.infer<typeof setCourseGoalSchema>;

export const courseGoalSchema = z.object({ courseId: z.number().int().positive(), weeklyMinutes: z.number().int() });
export type CourseGoal = z.infer<typeof courseGoalSchema>;
export const courseGoalListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ goals: z.array(courseGoalSchema) }),
});
export const courseGoalResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ goal: courseGoalSchema }),
});
