import type { Terms } from '@study-tracker/contracts';
import { formatGoalMinutes } from './studyGoals';

export type RecommendationKind =
  | 'first-course'
  | 'add-topics'
  | 'plan-today'
  | 'focus-now'
  | 'goal-done'
  | 'week-behind'
  | 'neglected-course'
  | 'set-goal'
  | 'rest-day'
  | 'review-week';

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  detail: string;
  href: string;
  action: string;
}

export interface RecommendationInput {
  terms: Terms;
  /** Active records the user can study, in display order. */
  courses: readonly { id: number; name: string; topicCount: number; editable: boolean }[];
  /** Measured study this week per course id. */
  weekSecondsByCourse: ReadonlyMap<number, number>;
  today: { activeDay: boolean; studySeconds: number; goalSeconds: number | null; openSessions: number };
  /** `elapsedActiveDays` counts finished active days of this week since the account existed; today is not over yet. */
  week: { studySeconds: number; goalSeconds: number | null; elapsedActiveDays: number; activeDays: number };
  dailyGoalSet: boolean;
  focusMinutes: number;
}

export const recommendationLimit = 3;
// Measured or remaining time: "0 dk" rather than the goal formatter's "Hedef yok".
const minutes = (seconds: number) => (seconds < 60 ? '0 dk' : formatGoalMinutes(Math.floor(seconds / 60)));
const remainingMinutes = (seconds: number) => formatGoalMinutes(Math.max(1, Math.ceil(seconds / 60)));

/**
 * Personal next steps from the user's own records, plans, goals and measured time.
 * Rules run in priority order: missing setup first, then today, then the week, then upkeep.
 */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const { terms: t, courses, today, week } = input;
  const result: Recommendation[] = [];
  const add = (recommendation: Recommendation) => { if (result.length < recommendationLimit) result.push(recommendation); };

  if (!courses.length) {
    add({
      kind: 'first-course',
      title: `İlk ${t.course({ case: 'acc' })} ekle`,
      detail: `Planlama ve istatistikler ${t.course({ plural: true })} üzerinden çalışır.`,
      href: '/courses',
      action: `${t.course({ capitalize: true })} ekle`,
    });
  }

  if (today.activeDay && today.goalSeconds !== null) {
    const remaining = today.goalSeconds - today.studySeconds;
    if (remaining <= 0) {
      add({
        kind: 'goal-done',
        title: 'Bugünkü hedefini tamamladın',
        detail: `Bugün ${minutes(today.studySeconds)} çalıştın. Sıradaki günü planlayabilirsin.`,
        href: '/stats',
        action: 'İstatistikler',
      });
    } else if (courses.length && today.openSessions === 0) {
      add({
        kind: 'plan-today',
        title: `Bugün için bir ${t.session()} planla`,
        detail: `Günlük hedefine ${remainingMinutes(remaining)} kaldı ve bugün için planın yok.`,
        href: '/planner',
        action: 'Planla',
      });
    } else if (courses.length) {
      add({
        kind: 'focus-now',
        title: `${input.focusMinutes} dakikalık bir odak turu başlat`,
        detail: `Günlük hedefine ${remainingMinutes(remaining)} kaldı.`,
        href: '/pomodoro',
        action: 'Başlat',
      });
    }
  }

  if (week.goalSeconds && week.activeDays && week.elapsedActiveDays >= 2) {
    const expected = (week.goalSeconds * week.elapsedActiveDays) / week.activeDays;
    if (week.studySeconds < expected * 0.8) {
      add({
        kind: 'week-behind',
        title: 'Bu hafta hedefin gerisindesin',
        detail: `Şu ana kadar ${minutes(week.studySeconds)} çalıştın; geçen aktif günlere göre beklenen ${minutes(expected)}.`,
        href: '/planner',
        action: 'Haftayı planla',
      });
    }
  }

  const withoutTopics = courses.find((course) => course.editable && course.topicCount === 0);
  if (withoutTopics) {
    add({
      kind: 'add-topics',
      title: `${withoutTopics.name} için ${t.topic({ plural: true })} ekle`,
      detail: `Küçük ${t.topic({ plural: true })} ilerlemeni görünür kılar.`,
      href: `/courses/${withoutTopics.id}`,
      action: `${t.topic({ capitalize: true })} ekle`,
    });
  }

  const studiedThisWeek = courses.some((course) => (input.weekSecondsByCourse.get(course.id) ?? 0) > 0);
  const neglected = courses.find((course) => (input.weekSecondsByCourse.get(course.id) ?? 0) === 0);
  if (studiedThisWeek && neglected && courses.length > 1) {
    add({
      kind: 'neglected-course',
      title: `${neglected.name} bu hafta boş kaldı`,
      detail: `Bu hafta ${neglected.name} için ölçülen çalışma yok; kısa bir ${t.session()} dengeyi korur.`,
      href: '/planner',
      action: 'Planla',
    });
  }

  if (!input.dailyGoalSet) {
    add({
      kind: 'set-goal',
      title: 'Günlük hedef belirle',
      detail: 'Hedef olunca panoda ve istatistiklerde ilerlemeni görürsün.',
      href: '/settings',
      action: 'Hedef belirle',
    });
  } else if (!today.activeDay) {
    add({
      kind: 'rest-day',
      title: 'Bugün dinlenme günün',
      detail: "Günlük hedef bugün uygulanmıyor. Aktif günlerini Ayarlar'dan değiştirebilirsin.",
      href: '/settings',
      action: 'Ayarlar',
    });
  }

  if (!result.length) {
    add({
      kind: 'review-week',
      title: 'Haftana göz at',
      detail: `Hangi ${t.course({ case: 'dat', plural: true })} ne kadar zaman ayırdığını gör.`,
      href: '/stats',
      action: 'İstatistikler',
    });
  }
  return result;
}
