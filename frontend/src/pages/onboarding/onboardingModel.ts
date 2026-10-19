import {
  completeOnboardingSchema,
  onboardingCourseLimit,
  resolveWeekStart,
  type CompleteOnboardingInput,
  type TerminologyPresetId,
  type UserPreferences,
  type WeekStart,
} from '@study-tracker/contracts';
import { appLocale } from '../../lib/locale';

export const purposeIds = ['education', 'work', 'personal', 'skills', 'other'] as const;
export type PurposeId = (typeof purposeIds)[number];

export const rhythmIds = ['classic', 'extended', 'deep'] as const;
export type RhythmId = (typeof rhythmIds)[number];

interface Purpose {
  label: string;
  description: string;
  preset: TerminologyPresetId;
  categoryName: string;
  examples: readonly string[];
  dailyStudyGoal: number;
  weeklyStudyGoal: number;
  rhythm: RhythmId;
}

/** What the account is for; each answer suggests vocabulary, goals, rhythm and first records. */
export const purposes: Record<PurposeId, Purpose> = {
  education: { label: 'Okul ve sınavlar', description: 'Dersler, konular ve sınav hazırlığı', preset: 'education', categoryName: 'Derslerim', examples: ['Matematik', 'Fizik', 'Tarih'], dailyStudyGoal: 3, weeklyStudyGoal: 15, rhythm: 'classic' },
  work: { label: 'İş ve projeler', description: 'Projeler, görevler ve teslimler', preset: 'general', categoryName: 'Projelerim', examples: ['Web sitesi', 'Aylık rapor', 'Sunum'], dailyStudyGoal: 4, weeklyStudyGoal: 20, rhythm: 'extended' },
  personal: { label: 'Kişisel hedefler', description: 'Alışkanlıklar ve uzun vadeli hedefler', preset: 'goals', categoryName: 'Hedeflerim', examples: ['Kitap okuma', 'Spor', 'Birikim'], dailyStudyGoal: 1, weeklyStudyGoal: 5, rhythm: 'classic' },
  skills: { label: 'Beceri ve hobiler', description: 'Dil, müzik, kodlama gibi pratik isteyen işler', preset: 'skills', categoryName: 'Becerilerim', examples: ['İngilizce', 'Gitar', 'Çizim'], dailyStudyGoal: 1, weeklyStudyGoal: 6, rhythm: 'classic' },
  other: { label: 'Başka bir şey', description: 'Kendi düzenimi kendim kuracağım', preset: 'general', categoryName: 'Çalışmalarım', examples: ['İlk çalışma', 'İkinci çalışma', 'Üçüncü çalışma'], dailyStudyGoal: 2, weeklyStudyGoal: 10, rhythm: 'classic' },
};

export const rhythms: Record<RhythmId, { label: string; description: string; values: Pick<UserPreferences, 'defaultPomodoroDuration' | 'defaultShortBreak' | 'defaultLongBreak' | 'pomodorosUntilLongBreak'> }> = {
  classic: { label: 'Klasik', description: '25 dk odak, 5 dk mola; 4 turda bir 15 dk uzun mola', values: { defaultPomodoroDuration: 25, defaultShortBreak: 5, defaultLongBreak: 15, pomodorosUntilLongBreak: 4 } },
  extended: { label: 'Uzun odak', description: '50 dk odak, 10 dk mola; 3 turda bir 20 dk uzun mola', values: { defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3 } },
  deep: { label: 'Derin çalışma', description: '90 dk odak, 15 dk mola; 2 turda bir 30 dk uzun mola', values: { defaultPomodoroDuration: 90, defaultShortBreak: 15, defaultLongBreak: 30, pomodorosUntilLongBreak: 2 } },
};

export const steps = ['Amaç', 'Zaman', 'Ritim', 'İlk kayıtlar', 'Özet'] as const;

export interface OnboardingDraft {
  purpose: PurposeId | null;
  studyField: string;
  timezone: string;
  weekStartsOn: WeekStart;
  activeStudyDays: number[];
  dailyStudyGoal: number;
  weeklyStudyGoal: number;
  rhythm: RhythmId;
  categoryName: string;
  courseNames: string[];
}

export const initialDraft = (preferences: UserPreferences): OnboardingDraft => ({
  purpose: null,
  studyField: preferences.studyField ?? '',
  timezone: preferences.timezone,
  weekStartsOn: resolveWeekStart(preferences),
  activeStudyDays: [...preferences.activeStudyDays],
  dailyStudyGoal: preferences.dailyStudyGoal,
  weeklyStudyGoal: preferences.weeklyStudyGoal,
  rhythm: 'classic',
  categoryName: '',
  courseNames: Array.from({ length: onboardingCourseLimit }, () => ''),
});

/** Choosing a purpose replaces the later suggestions; it is the first step, so nothing typed is lost. */
export const choosePurpose = (draft: OnboardingDraft, purpose: PurposeId): OnboardingDraft => {
  const suggestion = purposes[purpose];
  return {
    ...draft,
    purpose,
    dailyStudyGoal: suggestion.dailyStudyGoal,
    weeklyStudyGoal: suggestion.weeklyStudyGoal,
    rhythm: suggestion.rhythm,
    categoryName: suggestion.categoryName,
  };
};

export const filledCourseNames = (draft: OnboardingDraft) => draft.courseNames.map((name) => name.trim()).filter(Boolean);

export const toOnboardingInput = (draft: OnboardingDraft): CompleteOnboardingInput | null => {
  if (!draft.purpose) return null;
  const courseNames = filledCourseNames(draft);
  const parsed = completeOnboardingSchema.safeParse({
    preferences: {
      terminologyPreset: purposes[draft.purpose].preset,
      studyField: draft.studyField.trim() || null,
      timezone: draft.timezone,
      weekStartsOn: draft.weekStartsOn,
      activeStudyDays: draft.activeStudyDays,
      dailyStudyGoal: draft.dailyStudyGoal,
      weeklyStudyGoal: draft.weeklyStudyGoal,
      ...rhythms[draft.rhythm].values,
    },
    workspace: courseNames.length ? { categoryName: draft.categoryName, courseNames } : null,
  });
  return parsed.success ? parsed.data : null;
};

/** The first problem that keeps the user on a step, or null when they may continue. */
export const stepError = (draft: OnboardingDraft, step: number): string | null => {
  if (step === 0 && !draft.purpose) return 'Devam etmek için bir seçenek seçin.';
  if (step === 0 && draft.studyField.trim().length > 60) return 'Odak alanı en fazla 60 karakter olabilir.';
  if (step === 1) {
    if (!(draft.dailyStudyGoal >= 0 && draft.dailyStudyGoal <= 24)) return 'Günlük hedef 0 ile 24 saat arasında olmalı.';
    if (!(draft.weeklyStudyGoal >= 0 && draft.weeklyStudyGoal <= 168)) return 'Haftalık hedef 0 ile 168 saat arasında olmalı.';
  }
  if (step === 3) {
    const names = filledCourseNames(draft);
    if (names.length && !draft.categoryName.trim()) return 'Kayıtların duracağı kategoriye bir ad verin.';
    if (names.some((name) => name.length > 100) || draft.categoryName.trim().length > 100) return 'Adlar en fazla 100 karakter olabilir.';
    if (new Set(names.map((name) => name.toLocaleLowerCase(appLocale))).size !== names.length) return 'Aynı ad iki kez kullanılamaz.';
  }
  return null;
};
