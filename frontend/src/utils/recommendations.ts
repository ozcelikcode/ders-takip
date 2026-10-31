import type { Language, Terms } from '@study-tracker/contracts';
import type { Text } from '../i18n';
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
  text: Text['recommendations'];
  language: Language;
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

const recommendationLimit = 3;

/**
 * Personal next steps from the user's own records, plans, goals and measured time.
 * Rules run in priority order: missing setup first, then today, then the week, then upkeep.
 */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const { terms: t, text, language, courses, today, week } = input;
  // Measured time: zero minutes rather than the goal formatter's "no goal".
  const minutes = (seconds: number) => (seconds < 60 ? text.zeroMinutes : formatGoalMinutes(Math.floor(seconds / 60), language));
  const remainingMinutes = (seconds: number) => formatGoalMinutes(Math.max(1, Math.ceil(seconds / 60)), language);
  const result: Recommendation[] = [];
  const add = (recommendation: Recommendation) => { if (result.length < recommendationLimit) result.push(recommendation); };

  if (!courses.length) {
    add({
      kind: 'first-course',
      title: text.firstRecord(t),
      detail: text.firstRecordHint(t),
      href: '/courses',
      action: text.addRecord(t),
    });
  }

  if (today.activeDay && today.goalSeconds !== null) {
    const remaining = today.goalSeconds - today.studySeconds;
    if (remaining <= 0) {
      add({
        kind: 'goal-done',
        title: text.goalDone,
        detail: text.goalDoneHint(minutes(today.studySeconds)),
        href: '/stats',
        action: text.stats,
      });
    } else if (courses.length && today.openSessions === 0) {
      add({
        kind: 'plan-today',
        title: text.planToday(t),
        detail: text.planTodayHint(remainingMinutes(remaining)),
        href: '/planner',
        action: text.plan,
      });
    } else if (courses.length) {
      add({
        kind: 'focus-now',
        title: text.focusNow(input.focusMinutes),
        detail: text.remaining(remainingMinutes(remaining)),
        href: '/pomodoro',
        action: text.start,
      });
    }
  }

  if (week.goalSeconds && week.activeDays && week.elapsedActiveDays >= 2) {
    const expected = (week.goalSeconds * week.elapsedActiveDays) / week.activeDays;
    if (week.studySeconds < expected * 0.8) {
      add({
        kind: 'week-behind',
        title: text.weekBehind,
        detail: text.weekBehindHint(minutes(week.studySeconds), minutes(expected)),
        href: '/planner',
        action: text.planWeek,
      });
    }
  }

  const withoutTopics = courses.find((course) => course.editable && course.topicCount === 0);
  if (withoutTopics) {
    add({
      kind: 'add-topics',
      title: text.addSubRecords(t, withoutTopics.name),
      detail: text.addSubRecordsHint(t),
      href: `/courses/${withoutTopics.id}`,
      action: text.addSubRecord(t),
    });
  }

  const studiedThisWeek = courses.some((course) => (input.weekSecondsByCourse.get(course.id) ?? 0) > 0);
  const neglected = courses.find((course) => (input.weekSecondsByCourse.get(course.id) ?? 0) === 0);
  if (studiedThisWeek && neglected && courses.length > 1) {
    add({
      kind: 'neglected-course',
      title: text.neglected(neglected.name),
      detail: text.neglectedHint(t, neglected.name),
      href: '/planner',
      action: text.plan,
    });
  }

  if (!input.dailyGoalSet) {
    add({
      kind: 'set-goal',
      title: text.setGoal,
      detail: text.setGoalHint,
      href: '/settings',
      action: text.setGoalAction,
    });
  } else if (!today.activeDay) {
    add({
      kind: 'rest-day',
      title: text.restDay,
      detail: text.restDayHint,
      href: '/settings',
      action: text.settings,
    });
  }

  if (!result.length) {
    add({
      kind: 'review-week',
      title: text.reviewWeek,
      detail: text.reviewWeekHint(t),
      href: '/stats',
      action: text.stats,
    });
  }
  return result;
}
