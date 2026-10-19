import { describe, expect, it } from 'vitest';
import type { CatalogCourse } from '../../types/catalog';
import { compareWithGoal, distribution, presetRange, rangeDays, rangeError } from './statsModel';

const course = (id: number, categoryId: number, name: string): CatalogCourse => ({
  id,
  name,
  categoryId,
  category: { id: categoryId, name: `Kategori ${categoryId}`, color: '#000000' },
  color: '#111111',
  order: id,
  isActive: true,
  isGlobal: false,
});

describe('statistics model', () => {
  // 2026-10-21 is a Wednesday.
  it('builds preset ranges from local today and the week start', () => {
    expect(presetRange('week', '2026-10-21', 1)).toEqual({ startDate: '2026-10-19', endDate: '2026-10-25' });
    expect(presetRange('week', '2026-10-21', 0)).toEqual({ startDate: '2026-10-18', endDate: '2026-10-24' });
    expect(presetRange('month', '2026-02-10', 1)).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
    expect(presetRange('last30', '2026-10-21', 1)).toEqual({ startDate: '2026-09-22', endDate: '2026-10-21' });
    expect(rangeDays(presetRange('last90', '2026-10-21', 1))).toBe(90);
  });

  it('validates custom ranges against the server limit', () => {
    expect(rangeError({ startDate: '2026-10-21', endDate: '2026-10-20' })).toMatch(/sonra/);
    expect(rangeError({ startDate: '2025-01-01', endDate: '2026-01-02' })).toMatch(/366/);
    expect(rangeError({ startDate: '2025-01-01', endDate: '2026-01-01' })).toBeNull();
    expect(rangeError({ startDate: '', endDate: '2026-01-01' })).toMatch(/seçin/);
  });

  it('groups study by course and category with unknown courses as unassigned', () => {
    const result = distribution(
      [
        { courseId: 1, studySeconds: 600, sessions: 2 },
        { courseId: 2, studySeconds: 300, sessions: 1 },
        { courseId: 3, studySeconds: 200, sessions: 1 },
        { courseId: null, studySeconds: 100, sessions: 1 },
      ],
      [course(1, 10, 'A'), course(2, 10, 'B'), course(3, 20, 'C')],
      'Atanmamış',
    );
    expect(result.total).toBe(1200);
    expect(result.byCourse.map((row) => [row.label, row.studySeconds])).toEqual([['A', 600], ['B', 300], ['C', 200], ['Atanmamış', 100]]);
    expect(result.byCategory.map((row) => [row.label, row.studySeconds, row.share])).toEqual([
      ['Kategori 10', 900, 0.75],
      ['Kategori 20', 200, 200 / 1200],
      ['Atanmamış', 100, 100 / 1200],
    ]);
  });

  it('sums daily goals over active days and counts the days that met them', () => {
    const days = [
      { date: '2026-10-19', studySeconds: 7200 },
      { date: '2026-10-20', studySeconds: 3600 },
      { date: '2026-10-25', studySeconds: 1800 },
    ];
    const preferences = { dailyStudyGoal: 2, weeklyStudyGoal: 10, activeStudyDays: [1, 2, 3, 4, 5] };
    expect(compareWithGoal(days, preferences)).toEqual({ targetSeconds: 14400, studySeconds: 12600, activeDays: 2, metDays: 1 });
    expect(compareWithGoal(days, { ...preferences, dailyStudyGoal: 0 }).targetSeconds).toBeNull();
  });
});
