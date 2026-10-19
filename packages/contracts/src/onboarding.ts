import { z } from 'zod';
import { preferencesSchema } from './preferences.js';
import { terminologyPresetSchema } from './terminology.js';
import { weekStartSchema } from './time.js';

export const onboardingCourseLimit = 3;

const catalogName = z.string().trim().min(1).max(100);

/** The personal category and first records created when onboarding finishes. */
export const onboardingWorkspaceSchema = z.object({
  categoryName: catalogName,
  courseNames: z.array(catalogName).min(1).max(onboardingCourseLimit)
    .refine(names => new Set(names.map(name => name.toLocaleLowerCase('tr'))).size === names.length, 'Aynı ad iki kez kullanılamaz'),
}).strict();

export const completeOnboardingSchema = z.object({
  preferences: preferencesSchema.pick({
    studyField: true,
    timezone: true,
    activeStudyDays: true,
    dailyStudyGoal: true,
    weeklyStudyGoal: true,
    defaultPomodoroDuration: true,
    defaultShortBreak: true,
    defaultLongBreak: true,
    pomodorosUntilLongBreak: true,
  }).extend({
    terminologyPreset: terminologyPresetSchema,
    weekStartsOn: weekStartSchema,
  }).strict(),
  workspace: onboardingWorkspaceSchema.nullable(),
}).strict();

export type OnboardingWorkspace = z.infer<typeof onboardingWorkspaceSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
