import { z } from 'zod';
import { calendarDateSchema } from './time.js';
import { pomodoroSettingsSchema, sessionDurationLimits, sessionTypeSchema } from './studySessions.js';

/** How far ahead a routine's sessions exist as real sessions; a daily job moves the horizon forward. */
export const seriesHorizonDays = 26 * 7;

const relationId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime({ offset: true });

/** Days of the week (0 = Sunday … 6 = Saturday) a routine repeats on, at least one, each once. */
export const seriesWeekdaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, 'invalid');

const seriesFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  courseId: relationId.optional(),
  topicId: relationId.optional(),
  sessionType: sessionTypeSchema.optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  pomodoroSettings: pomodoroSettingsSchema.optional(),
  weekdays: seriesWeekdaysSchema,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalid'),
  durationMinutes: z.number().int().min(sessionDurationLimits.minMinutes).max(sessionDurationLimits.maxMinutes),
  startsOn: calendarDateSchema,
  endsOn: calendarDateSchema.nullable().optional(),
};
const endsAfterStart = ({ startsOn, endsOn }: { startsOn: string; endsOn?: string | null | undefined }) => !endsOn || endsOn >= startsOn;
const endsAfterStartIssue = { message: 'endBeforeStart', path: ['endsOn'] };

/**
 * A weekly routine: the same session on chosen weekdays at a wall-clock time in the owner's time zone,
 * from `startsOn` until `endsOn` (inclusive) or with no end.
 */
export const createSeriesSchema = z.object(seriesFields).strict().refine(endsAfterStart, endsAfterStartIssue);
/** Editing replaces the whole definition; it rebuilds only the routine's future sessions nobody touched. */
export const updateSeriesSchema = z
  .object({ ...seriesFields, expectedUpdatedAt: instant })
  .strict()
  .refine(endsAfterStart, endsAfterStartIssue);
export const seriesVersionSchema = z.object({ expectedUpdatedAt: instant }).strict();
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;

/** A stored routine as the API returns it. */
export const seriesRecordSchema = z.object({
  id: relationId,
  title: z.string(),
  description: z.string().nullable(),
  courseId: relationId.nullable(),
  topicId: relationId.nullable(),
  sessionType: sessionTypeSchema,
  color: z.string().nullable(),
  pomodoroSettings: pomodoroSettingsSchema.nullable(),
  weekdays: seriesWeekdaysSchema,
  startTime: z.string(),
  durationMinutes: z.number().int(),
  startsOn: calendarDateSchema,
  endsOn: calendarDateSchema.nullable(),
  timezone: z.string(),
  updatedAt: instant,
});
export type SeriesRecord = z.infer<typeof seriesRecordSchema>;

/** What a create or edit did: the routine, and the days skipped because another session already used that time. */
export const seriesWriteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ series: seriesRecordSchema, skippedDates: z.array(calendarDateSchema) }),
});
export const seriesListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ series: z.array(seriesRecordSchema) }),
});
