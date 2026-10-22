import { createTerms } from '@study-tracker/contracts';
import { tr } from '../i18n/tr';
import { describe, expect, it } from 'vitest';
import { buildRecommendations, type RecommendationInput } from './recommendations';

const hour = 3600;
const base: RecommendationInput = {
  terms: createTerms('education'),
  text: tr.recommendations,
  language: 'tr',
  courses: [
    { id: 1, name: 'Matematik', topicCount: 3, editable: true },
    { id: 2, name: 'Fizik', topicCount: 2, editable: true },
  ],
  weekSecondsByCourse: new Map([[1, hour], [2, hour]]),
  today: { activeDay: true, studySeconds: 0, goalSeconds: 2 * hour, openSessions: 1 },
  week: { studySeconds: 2 * hour, goalSeconds: 10 * hour, elapsedActiveDays: 1, activeDays: 5 },
  dailyGoalSet: true,
  focusMinutes: 25,
};
const kinds = (input: Partial<RecommendationInput>) => buildRecommendations({ ...base, ...input }).map((item) => item.kind);

describe('buildRecommendations', () => {
  it('starts a new account with its first record and never suggests planning without one', () => {
    const items = buildRecommendations({ ...base, courses: [], weekSecondsByCourse: new Map() });
    expect(items[0]).toMatchObject({ kind: 'first-course', title: 'İlk dersi ekle', href: '/courses' });
    expect(items.map((item) => item.kind)).not.toContain('plan-today');
  });

  it('tells the user how much of today is left and whether to plan or to focus', () => {
    expect(buildRecommendations({ ...base, today: { ...base.today, studySeconds: 45 * 60 } })[0]).toMatchObject({
      kind: 'focus-now', title: '25 dakikalık bir odak turu başlat', detail: 'Günlük hedefine 1 sa 15 dk kaldı.',
    });
    expect(kinds({ today: { ...base.today, openSessions: 0 } })[0]).toBe('plan-today');
    expect(kinds({ today: { ...base.today, studySeconds: 2 * hour } })[0]).toBe('goal-done');
  });

  it('flags a week that falls behind pace only once enough of it has passed', () => {
    const week = { studySeconds: hour, goalSeconds: 10 * hour, elapsedActiveDays: 3, activeDays: 5 };
    expect(kinds({ week })).toContain('week-behind');
    expect(kinds({ week: { ...week, elapsedActiveDays: 1 } })).not.toContain('week-behind');
    expect(kinds({ week: { ...week, studySeconds: 5 * hour } })).not.toContain('week-behind');
    // Nothing measured yet reads as "0 dk", never as the goal formatter's "Hedef yok".
    expect(buildRecommendations({ ...base, week: { ...week, studySeconds: 0 } }).find((item) => item.kind === 'week-behind')?.detail)
      .toBe('Şu ana kadar 0 dk çalıştın; geçen aktif günlere göre beklenen 6 sa.');
  });

  it('points at a record without sub-items and at one left untouched this week', () => {
    const courses = [...base.courses, { id: 3, name: 'Kimya', topicCount: 0, editable: true }];
    const items = buildRecommendations({ ...base, courses, today: { ...base.today, goalSeconds: null } });
    expect(items.find((item) => item.kind === 'add-topics')).toMatchObject({ title: 'Kimya için konular ekle', href: '/courses/3' });
    expect(items.find((item) => item.kind === 'neglected-course')?.title).toBe('Kimya bu hafta boş kaldı');
    // Shared records the user cannot edit are not offered for editing.
    const shared = courses.map((course) => ({ ...course, editable: false }));
    expect(kinds({ courses: shared, today: { ...base.today, goalSeconds: null } })).not.toContain('add-topics');
  });

  it('asks for a goal when none is set, respects rest days and never shows more than three', () => {
    expect(kinds({ dailyGoalSet: false, today: { ...base.today, goalSeconds: null } })).toContain('set-goal');
    expect(kinds({ today: { ...base.today, activeDay: false, goalSeconds: null } })).toEqual(['rest-day']);
    const busy = buildRecommendations({
      ...base,
      courses: [...base.courses, { id: 3, name: 'Kimya', topicCount: 0, editable: true }],
      today: { ...base.today, openSessions: 0 },
      week: { studySeconds: 0, goalSeconds: 10 * hour, elapsedActiveDays: 4, activeDays: 5 },
      dailyGoalSet: false,
    });
    expect(busy).toHaveLength(3);
    expect(busy.map((item) => item.kind)).toEqual(['plan-today', 'week-behind', 'add-topics']);
  });

  it('falls back to reviewing the week when nothing needs attention', () => {
    expect(kinds({ today: { ...base.today, goalSeconds: null } })).toEqual(['review-week']);
  });
});
