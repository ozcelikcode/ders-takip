import { z } from 'zod';
import { activityKindSchema } from './studyTracking.js';

export const sessionDurationLimits = {
  minMinutes: 1,
  maxMinutes: 1440,
} as const;
export function isSessionDurationValid(milliseconds: number): boolean {
  return (
    Number.isFinite(milliseconds) &&
    milliseconds >= sessionDurationLimits.minMinutes * 60_000 &&
    milliseconds <= sessionDurationLimits.maxMinutes * 60_000
  );
}

export const sessionStatusSchema = z.enum([
  'planned',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
const transitions: Record<SessionStatus, readonly SessionStatus[]> = {
  planned: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['paused', 'completed', 'cancelled', 'planned'],
  paused: ['in_progress', 'completed', 'cancelled', 'planned'],
  completed: ['planned'],
  cancelled: ['planned'],
};
export const canTransitionSession = (
  from: SessionStatus,
  to: SessionStatus,
): boolean => from === to || transitions[from].includes(to);
export const reservesSessionTime = (status: SessionStatus): boolean =>
  status !== 'cancelled';

export const sessionTypeSchema = z.enum([
  'study',
  'break',
  'pomodoro',
  'review',
]);
const instant = z.iso.datetime({ offset: true });
const relationId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const pomodoroSettingsSchema = z
  .object({
    workDuration: z.number().int().min(1).max(120),
    shortBreak: z.number().int().min(1).max(30),
    longBreak: z.number().int().min(1).max(60),
    cyclesBeforeLongBreak: z.number().int().min(1).max(10),
    currentCycle: z.number().int().min(0),
  })
  .strict();
export const createSessionSchema = z
  .object({
    planId: relationId.optional(),
    topicId: relationId.optional(),
    courseId: relationId.optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().optional(),
    startTime: instant,
    endTime: instant,
    sessionType: sessionTypeSchema.optional(),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    pomodoroSettings: pomodoroSettingsSchema.optional(),
  })
  .strict();
/**
 * Study done without the timer, typed in afterwards. It is stored as a completed session whose whole range counts as
 * measured study, marked `manual`; it must have ended already.
 */
export const logStudySchema = createSessionSchema
  .pick({ planId: true, topicId: true, courseId: true, title: true, description: true, startTime: true, endTime: true, color: true })
  .extend({ sessionType: z.enum(['study', 'review']).optional(), notes: z.string().max(5000).optional() })
  .strict();
export type LogStudyInput = z.infer<typeof logStudySchema>;
export const sessionVersionSchema = z
  .object({ expectedUpdatedAt: instant })
  .strict();
export const startSessionSchema = sessionVersionSchema.extend({
  activityKind: activityKindSchema.optional(),
});
export const updateSessionSchema = createSessionSchema
  .partial()
  .extend({
    expectedUpdatedAt: instant,
    planId: relationId.nullable().optional(),
    topicId: relationId.nullable().optional(),
    courseId: relationId.nullable().optional(),
    status: sessionStatusSchema.optional(),
    notes: z.string().optional(),
    activityKind: activityKindSchema.optional(),
    productivity: z.number().int().min(1).max(5).optional(),
    pomodoroSettings: pomodoroSettingsSchema.partial().optional(),
  })
  .strict();
export const completeSessionSchema = sessionVersionSchema
  .extend({
    notes: z.string().optional(),
    productivity: z.number().int().min(1).max(5).optional(),
  })
  .strict();
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
