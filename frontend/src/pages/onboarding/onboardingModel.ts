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
import { goalHoursToMinutes, goalMinutesToHours, maxDailyGoalMinutes } from '../../utils/studyGoals';

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
  dailyGoalMinutes: number;
  rhythm: RhythmId;
}

/** What the account is for; each answer suggests vocabulary, a daily goal, a rhythm and first records. */
export const purposes: Record<PurposeId, Purpose> = {
  education: { label: 'Okul ve sınavlar', description: 'Dersler, konular ve sınav hazırlığı', preset: 'education', categoryName: 'Derslerim', examples: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Edebiyat'], dailyGoalMinutes: 180, rhythm: 'classic' },
  work: { label: 'İş ve projeler', description: 'Projeler, görevler ve teslimler', preset: 'general', categoryName: 'Projelerim', examples: ['Web sitesi', 'Aylık rapor', 'Sunum', 'Müşteri işleri', 'Araştırma'], dailyGoalMinutes: 240, rhythm: 'extended' },
  personal: { label: 'Kişisel hedefler', description: 'Alışkanlıklar ve uzun vadeli hedefler', preset: 'goals', categoryName: 'Hedeflerim', examples: ['Kitap okuma', 'Spor', 'Birikim', 'Meditasyon', 'Yazı yazma'], dailyGoalMinutes: 30, rhythm: 'classic' },
  skills: { label: 'Beceri ve hobiler', description: 'Dil, müzik, kodlama gibi pratik isteyen işler', preset: 'skills', categoryName: 'Becerilerim', examples: ['İngilizce', 'Gitar', 'Çizim', 'Kodlama', 'Fotoğraf'], dailyGoalMinutes: 45, rhythm: 'classic' },
  other: { label: 'Başka bir şey', description: 'Kendi düzenimi kendim kuracağım', preset: 'general', categoryName: 'Çalışmalarım', examples: [], dailyGoalMinutes: 60, rhythm: 'classic' },
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
  return { ...draft, purpose, dailyGoalMinutes: suggestion.dailyGoalMinutes, rhythm: suggestion.rhythm, categoryName: suggestion.categoryName };
};

const sameName = (first: string, second: string) => first.toLocaleLowerCase(currentLocaleTag()) === second.toLocaleLowerCase(currentLocaleTag());

/** Adds a first record, or explains why it cannot be added. */
export const addCourseName = (draft: OnboardingDraft, raw: string): { draft: OnboardingDraft } | { error: string } => {
  const name = raw.trim();
  if (!name) return { error: 'Önce bir ad yazın.' };
  if (name.length > 100) return { error: 'Ad en fazla 100 karakter olabilir.' };
  if (draft.courseNames.some((existing) => sameName(existing, name))) return { error: `“${name}” zaten listede.` };
  if (draft.courseNames.length >= onboardingCourseLimit) return { error: `Kurulumda en fazla ${onboardingCourseLimit} kayıt eklenebilir; gerisini sonra ekleyebilirsin.` };
  return { draft: { ...draft, courseNames: [...draft.courseNames, name] } };
};

export const removeCourseName = (draft: OnboardingDraft, name: string): OnboardingDraft => ({
  ...draft,
  courseNames: draft.courseNames.filter((existing) => existing !== name),
});

/** Example names for the chosen purpose that are not on the list yet. */
export const suggestedCourseNames = (draft: OnboardingDraft): string[] =>
  draft.purpose ? purposes[draft.purpose].examples.filter((example) => !draft.courseNames.some((name) => sameName(name, example))) : [];

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
      ...rhythms[draft.rhythm].values,
    },
    workspace: draft.courseNames.length ? { categoryName: draft.categoryName, courseNames: draft.courseNames } : null,
  });
  return parsed.success ? parsed.data : null;
};

/** The first problem that keeps the user on a step, or null when they may continue. */
export const stepError = (draft: OnboardingDraft, step: number): string | null => {
  if (step === 0 && !draft.purpose) return 'Devam etmek için bir seçenek seçin.';
  if (step === 0 && draft.studyField.trim().length > 60) return 'Odak alanı en fazla 60 karakter olabilir.';
  if (step === 1) {
    if (!(Number.isInteger(draft.dailyGoalMinutes) && draft.dailyGoalMinutes >= 0 && draft.dailyGoalMinutes <= maxDailyGoalMinutes)) return 'Günlük hedef 0 ile 24 saat arasında olmalı.';
    if (draft.dailyGoalMinutes > 0 && draft.activeStudyDays.length === 0) return 'Hedefin işlemesi için en az bir aktif gün seçin.';
  }
  if (step === 3 && draft.pendingCourseName.trim()) return `“${draft.pendingCourseName.trim()}” henüz eklenmedi. Ekle'ye bas ya da alanı temizle.`;
  if (step === 3 && draft.courseNames.length) {
    const category = draft.categoryName.trim();
    if (!category) return 'Kayıtların duracağı kategoriye bir ad verin.';
    if (category.length > 100) return 'Kategori adı en fazla 100 karakter olabilir.';
  }
  return null;
};
