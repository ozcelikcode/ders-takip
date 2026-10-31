import {
  completeOnboardingSchema,
  onboardingCourseLimit,
  resolveWeekStart,
  type CompleteOnboardingInput,
  type TerminologyPresetId,
  type UserPreferences,
  type WeekStart,
} from '@study-tracker/contracts';
import { currentLocaleTag } from '../../lib/locale';
import { useLanguageStore } from '../../store/languageStore';
import { goalHoursToMinutes, goalMinutesToHours, maxDailyGoalMinutes } from '../../utils/studyGoals';

export const purposeIds = ['education', 'work', 'personal', 'skills', 'other'] as const;
export type PurposeId = (typeof purposeIds)[number];

export const rhythmIds = ['classic', 'extended', 'deep'] as const;
type RhythmId = (typeof rhythmIds)[number];

interface Purpose {
  preset: TerminologyPresetId;
  dailyGoalMinutes: number;
  rhythm: RhythmId;
}

/** What the account is for; each answer suggests vocabulary, a daily goal, a rhythm and first records (named in the catalog). */
export const purposes: Record<PurposeId, Purpose> = {
  education: { preset: 'education', dailyGoalMinutes: 180, rhythm: 'classic' },
  work: { preset: 'general', dailyGoalMinutes: 240, rhythm: 'extended' },
  personal: { preset: 'goals', dailyGoalMinutes: 30, rhythm: 'classic' },
  skills: { preset: 'skills', dailyGoalMinutes: 45, rhythm: 'classic' },
  other: { preset: 'general', dailyGoalMinutes: 60, rhythm: 'classic' },
};

const rhythms: Record<RhythmId, Pick<UserPreferences, 'defaultPomodoroDuration' | 'defaultShortBreak' | 'defaultLongBreak' | 'pomodorosUntilLongBreak'>> = {
  classic: { defaultPomodoroDuration: 25, defaultShortBreak: 5, defaultLongBreak: 15, pomodorosUntilLongBreak: 4 },
  extended: { defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3 },
  deep: { defaultPomodoroDuration: 90, defaultShortBreak: 15, defaultLongBreak: 30, pomodorosUntilLongBreak: 2 },
};

export const steps = ['purpose', 'time', 'rhythm', 'records', 'summary'] as const;

const text = () => useLanguageStore.getState().text.onboarding;

export interface OnboardingDraft {
  purpose: PurposeId | null;
  studyField: string;
  timezone: string;
  weekStartsOn: WeekStart;
  activeStudyDays: number[];
  dailyGoalMinutes: number;
  rhythm: RhythmId;
  categoryName: string;
  /** Trimmed, unique names in the order they were added. */
  courseNames: string[];
  /** Text typed into the add tile but not added yet; kept so leaving the step cannot drop it silently. */
  pendingCourseName: string;
}

export const initialDraft = (preferences: UserPreferences): OnboardingDraft => ({
  purpose: null,
  studyField: preferences.studyField ?? '',
  timezone: preferences.timezone,
  weekStartsOn: resolveWeekStart(preferences),
  activeStudyDays: [...preferences.activeStudyDays],
  dailyGoalMinutes: goalHoursToMinutes(preferences.dailyStudyGoal),
  rhythm: 'classic',
  categoryName: '',
  courseNames: [],
  pendingCourseName: '',
});

/** Choosing a purpose replaces the later suggestions; it is the first step, so nothing typed is lost. */
export const choosePurpose = (draft: OnboardingDraft, purpose: PurposeId): OnboardingDraft => {
  const suggestion = purposes[purpose];
  return { ...draft, purpose, dailyGoalMinutes: suggestion.dailyGoalMinutes, rhythm: suggestion.rhythm, categoryName: text().purposes[purpose].categoryName };
};

const sameName = (first: string, second: string) => first.toLocaleLowerCase(currentLocaleTag()) === second.toLocaleLowerCase(currentLocaleTag());

/** Adds a first record, or explains why it cannot be added. */
export const addCourseName = (draft: OnboardingDraft, raw: string): { draft: OnboardingDraft } | { error: string } => {
  const name = raw.trim();
  if (!name) return { error: text().nameRequired };
  if (name.length > 100) return { error: text().nameTooLong };
  if (draft.courseNames.some((existing) => sameName(existing, name))) return { error: text().duplicate(name) };
  if (draft.courseNames.length >= onboardingCourseLimit) return { error: text().tooMany(onboardingCourseLimit) };
  return { draft: { ...draft, courseNames: [...draft.courseNames, name] } };
};

export const removeCourseName = (draft: OnboardingDraft, name: string): OnboardingDraft => ({
  ...draft,
  courseNames: draft.courseNames.filter((existing) => existing !== name),
});

/** Example names for the chosen purpose that are not on the list yet. */
export const suggestedCourseNames = (draft: OnboardingDraft): string[] =>
  draft.purpose ? text().purposes[draft.purpose].examples.filter((example) => !draft.courseNames.some((name) => sameName(name, example))) : [];

export const toOnboardingInput = (draft: OnboardingDraft): CompleteOnboardingInput | null => {
  if (!draft.purpose) return null;
  const parsed = completeOnboardingSchema.safeParse({
    preferences: {
      terminologyPreset: purposes[draft.purpose].preset,
      studyField: draft.studyField.trim() || null,
      timezone: draft.timezone,
      weekStartsOn: draft.weekStartsOn,
      activeStudyDays: draft.activeStudyDays,
      dailyStudyGoal: goalMinutesToHours(draft.dailyGoalMinutes),
      ...rhythms[draft.rhythm],
    },
    workspace: draft.courseNames.length ? { categoryName: draft.categoryName, courseNames: draft.courseNames } : null,
  });
  return parsed.success ? parsed.data : null;
};

/** The first problem that keeps the user on a step, or null when they may continue. */
export const stepError = (draft: OnboardingDraft, step: number): string | null => {
  if (step === 0 && !draft.purpose) return text().choosePurpose;
  if (step === 0 && draft.studyField.trim().length > 60) return text().studyFieldTooLong;
  if (step === 1) {
    if (!(Number.isInteger(draft.dailyGoalMinutes) && draft.dailyGoalMinutes >= 0 && draft.dailyGoalMinutes <= maxDailyGoalMinutes)) return text().goalRange;
    if (draft.dailyGoalMinutes > 0 && draft.activeStudyDays.length === 0) return text().needActiveDay;
  }
  if (step === 3 && draft.pendingCourseName.trim()) return text().pendingName(draft.pendingCourseName.trim());
  if (step === 3 && draft.courseNames.length) {
    const category = draft.categoryName.trim();
    if (!category) return text().categoryRequired;
    if (category.length > 100) return text().categoryTooLong;
  }
  return null;
};
