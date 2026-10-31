import { z } from 'zod';
import type { SessionStatus } from './studySessions.js';
import { calendarDateSchema, timezoneSchema } from './time.js';

export const activityKindSchema = z.enum(['study', 'break']);
export type ActivityKind = z.infer<typeof activityKindSchema>;
export type IntervalKind = ActivityKind | 'pause';
/**
 * How a session's study time was recorded: by the timer (`complete`), not at all (`untracked`, before measurement
 * existed), partly (`partial`), or typed in afterwards for work done without the timer (`manual`).
 */
export const trackingCoverageSchema = z.enum(['complete', 'partial', 'untracked', 'manual']);
export type TrackingCoverage = z.infer<typeof trackingCoverageSchema>;
export interface ActivityInterval {
  id: number;
  kind: IntervalKind;
  startedAt: string;
  endedAt: string | null;
}
export interface StudyTotals {
  studySeconds: number;
  breakSeconds: number;
  pauseSeconds: number;
}
export interface SessionStats extends StudyTotals {
  asOf: string;
  timezone: string;
  totalSessions: number;
  lastActivity: string | null;
  completedSessions: number;
  untrackedSessions: number;
  partialSessions: number;
  days: (StudyTotals & { date: string })[];
  /** Measured study per course in range, largest first; null groups sessions without a course. */
  courses: { courseId: number | null; studySeconds: number; sessions: number }[];
  /** The person's own tags, directly on a session or through its record; a session with several tags counts in each. */
  tags: { tagId: number; studySeconds: number; sessions: number }[];
}
export const userStudySummarySchema = z.object({
  totalSessions: z.number().int().nonnegative(),
  completedSessions: z.number().int().nonnegative(),
  studySeconds: z.number().nonnegative(),
  lastActivity: z.iso.datetime().nullable(),
});
export type UserStudySummary = z.infer<typeof userStudySummarySchema>;
export interface AdminOverview {
  users: { total: number; active: number };
  courses: { total: number; active: number };
  sessions: UserStudySummary;
  recentSessions: {
    id: number;
    title: string;
    status: SessionStatus;
    sessionType: string;
    duration: number;
    userName: string;
  }[];
}
export const sessionQuerySchema = z
  .object({
    planId: z.coerce.number().int().positive().optional(),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
    timezone: timezoneSchema.optional(),
    status: z
      .enum(['planned', 'in_progress', 'paused', 'completed', 'cancelled'])
      .optional(),
    sessionType: z.enum(['study', 'break', 'pomodoro', 'review']).optional(),
    // Only sessions that can still run (planned, running or paused), on any date.
    unfinished: z.literal('true').optional(),
    // Sessions with this tag, directly or through their record.
    tagId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { message: 'dateRange' },
  );
export type SessionQuery = z.infer<typeof sessionQuerySchema>;
