import { z } from 'zod';
import {
  sessionDurationLimits,
  sessionTypeSchema,
  pomodoroSettingsSchema,
} from '@study-tracker/contracts';
import { useLanguageStore } from '../../store/languageStore';

export const sessionFormSchema = z
  .object({
    sessionCategory: z.enum(['course', 'break', 'custom']),
    courseId: z.string().optional(),
    customTitle: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string(),
    startTime: z.string(),
    durationMode: z.enum(['minutes', 'timeRange']),
    duration: z
      .number()
      .min(sessionDurationLimits.minMinutes, { error: () => useLanguageStore.getState().text.planner.durationMin })
      .max(sessionDurationLimits.maxMinutes, { error: () => useLanguageStore.getState().text.planner.durationMax }),
    endTime: z.string().optional(),
    sessionType: sessionTypeSchema,
    color: z.string().optional(),
    pomodoroSettings: pomodoroSettingsSchema
      .omit({ currentCycle: true })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sessionCategory === 'course' && !data.courseId) {
      ctx.addIssue({
        code: 'custom',
        message: useLanguageStore.getState().text.planner.selectionRequired,
        path: ['courseId'],
      });
    }
    if (data.sessionCategory === 'custom' && !data.customTitle) {
      ctx.addIssue({
        code: 'custom',
        message: useLanguageStore.getState().text.planner.titleRequired,
        path: ['customTitle'],
      });
    }
  });

export type CreateSessionForm = z.infer<typeof sessionFormSchema>;
