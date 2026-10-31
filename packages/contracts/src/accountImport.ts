import { z } from 'zod';
import { maxWeeklyGoalMinutes } from './courseGoals.js';
import { planGoalsSchema } from './plans.js';
import { seriesWeekdaysSchema } from './sessionSeries.js';
import { pomodoroSettingsSchema, sessionDurationLimits, sessionStatusSchema, sessionTypeSchema } from './studySessions.js';
import { tagNameSchema } from './tags.js';
import { calendarDateSchema, timezoneSchema } from './time.js';

export const accountExportFormat = 'study-tracker-account-export';
/** 2 added `references`; files without it cannot place data that pointed at shared records. */
export const accountExportVersion = 2;

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime({ offset: true });
const optionalText = z.string().nullish();
const catalogColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
const sessionColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const order = z.number().int().min(1);
const difficulty = z.enum(['Kolay', 'Orta', 'Zor']);
const estimatedTime = z.number().int().min(5).max(480);
/**
 * Upper bound for every list in an import. Years of daily use stay well inside it, while one request can no longer
 * hold the database write lock long enough to stall other users.
 */
export const maxImportRows = 20_000;
const list = <T extends z.ZodType>(item: T, max = maxImportRows) => z.array(item).max(max);

/**
 * Shared categories, records and sub-records the export points at by id. Ids differ between sites,
 * so an import matches these by name.
 */
export const accountReferencesSchema = z.object({
  categories: list(z.object({ id, name: z.string().trim().min(1).max(100), color: catalogColor })),
  courses: list(z.object({ id, name: z.string().trim().min(1).max(100), color: catalogColor, categoryId: id })),
  topics: list(z.object({ id, courseId: id, name: z.string().trim().min(1).max(200), estimatedTime, difficulty })),
});
export type AccountReferences = z.infer<typeof accountReferencesSchema>;

// Rows follow the stored shapes of the export; fields the import does not use are dropped.
const topicRow = z.object({
  id, name: z.string().trim().min(1).max(200), description: optionalText, estimatedTime, difficulty, order, isActive: z.boolean(),
});
const categoryRow = z.object({
  id, name: z.string().trim().min(1).max(100), description: optionalText, color: catalogColor, icon: z.string().max(50).nullish(), order, isActive: z.boolean(),
});
const courseRow = categoryRow.extend({ categoryId: id, isGlobal: z.boolean(), topics: list(topicRow).default([]) });
const planRow = z.object({
  id, title: z.string().trim().min(1).max(100), description: optionalText, startDate: instant, endDate: instant, isActive: z.boolean(), goals: planGoalsSchema,
});
const routineRow = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  courseId: id.nullish(),
  topicId: id.nullish(),
  sessionType: sessionTypeSchema,
  color: sessionColor.nullish(),
  pomodoroSettings: pomodoroSettingsSchema.nullish(),
  weekdays: seriesWeekdaysSchema,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(sessionDurationLimits.minMinutes).max(sessionDurationLimits.maxMinutes),
  startsOn: calendarDateSchema,
  endsOn: calendarDateSchema.nullish(),
  timezone: timezoneSchema,
  generatedThrough: calendarDateSchema.nullish(),
  exceptionDates: list(calendarDateSchema),
});
const intervalRow = z
  .object({ kind: z.enum(['study', 'break', 'pause']), startedAt: instant, endedAt: instant.nullish() })
  .refine((interval) => !interval.endedAt || interval.endedAt >= interval.startedAt);
const sessionRow = z
  .object({
    id,
    planId: id.nullish(),
    courseId: id.nullish(),
    topicId: id.nullish(),
    seriesId: id.nullish(),
    seriesDate: calendarDateSchema.nullish(),
    title: z.string().trim().min(1).max(200),
    description: optionalText,
    startTime: instant,
    endTime: instant,
    duration: z.number().int().min(sessionDurationLimits.minMinutes).max(sessionDurationLimits.maxMinutes),
    trackingCoverage: z.enum(['complete', 'partial', 'untracked']),
    status: sessionStatusSchema,
    sessionType: sessionTypeSchema,
    color: sessionColor.nullish(),
    pomodoroSettings: pomodoroSettingsSchema.nullish(),
    notes: optionalText,
    productivity: z.number().int().min(1).max(5).nullish(),
    completedAt: instant.nullish(),
    activityIntervals: list(intervalRow, 1000).default([]),
  })
  .refine((session) => new Date(session.endTime) > new Date(session.startTime));

/** An account export as the import reads it. */
export const accountImportSchema = z.object({
  format: z.literal(accountExportFormat),
  version: z.literal(accountExportVersion),
  exportedAt: instant,
  account: z.object({ preferences: z.unknown() }),
  references: accountReferencesSchema,
  categories: list(categoryRow),
  courses: list(courseRow),
  topicProgress: list(z.object({ topicId: id, status: z.enum(['in_progress', 'completed']) })),
  sessions: list(sessionRow),
  plans: list(planRow),
  routines: list(routineRow),
  courseGoals: list(z.object({ courseId: id, weeklyMinutes: z.number().int().min(1).max(maxWeeklyGoalMinutes) })),
  tags: z.object({
    tags: list(z.object({ id, name: tagNameSchema })),
    courseTags: list(z.object({ courseId: id, tagId: id })),
    sessionTags: list(z.object({ sessionId: id, tagId: id })),
  }),
});
export type AccountImport = z.infer<typeof accountImportSchema>;

const count = z.number().int().min(0);
/** What an import created; `matchedShared` shared records were found by name, `unlinked` links had nowhere to go. */
export const accountImportResultSchema = z.object({
  created: z.object({
    categories: count, courses: count, topics: count, plans: count, routines: count, sessions: count,
    tags: count, courseGoals: count, topicProgress: count,
  }),
  matchedShared: count,
  unlinked: count,
  preferences: z.enum(['imported', 'skipped']),
});
export type AccountImportResult = z.infer<typeof accountImportResultSchema>;
