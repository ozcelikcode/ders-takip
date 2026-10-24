import { z } from 'zod';

/** A calendar app reads the feed without signing in, so its address carries a long random key; it is shown once. */
export const calendarFeedTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** How far back and ahead the feed lists sessions; ahead matches how far routines create sessions. */
export const calendarFeedWindowDays = { past: 30, ahead: 182 } as const;

export const calendarFeedStatusResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ active: z.boolean(), createdAt: z.iso.datetime({ offset: true }).nullable() }),
});
export const calendarFeedCreatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ url: z.url(), createdAt: z.iso.datetime({ offset: true }) }),
});
