import { z } from 'zod';
import {
  sessionDurationLimits,
  sessionTypeSchema,
  pomodoroSettingsSchema,
} from '@study-tracker/contracts';

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
      .min(sessionDurationLimits.minMinutes, 'Minimum 1 dakika')
      .max(sessionDurationLimits.maxMinutes, 'Maximum 24 saat'),
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
        message: 'Ders seçimi gereklidir',
        path: ['courseId'],
      });
    }
    if (data.sessionCategory === 'custom' && !data.customTitle) {
      ctx.addIssue({
        code: 'custom',
        message: 'Özel görev başlığı gereklidir',
        path: ['customTitle'],
      });
    }
  });

export type CreateSessionForm = z.infer<typeof sessionFormSchema>;
