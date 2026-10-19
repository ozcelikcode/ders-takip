import { describe, expect, it } from 'vitest';
import type { CatalogCourse } from '../../types/catalog';
import type { StudySession } from '../../types/planner';
import type { CreateSessionForm } from './sessionForm';
import {
  buildSessionPayload,
  endTimeLabel,
  rangeDurationLabel,
  resolveSessionRange,
  resolveSessionTitle,
  wallTimeMinutes,
} from './sessionRequest';

const course = (overrides: Partial<CatalogCourse> = {}): CatalogCourse => ({
  id: 7,
  name: 'Matematik',
  categoryId: 1,
  category: { id: 1, name: 'TYT', color: '#000000' },
  color: '#123456',
  order: 1,
  isActive: true,
  isGlobal: false,
  ...overrides,
});

const form = (overrides: Partial<CreateSessionForm> = {}): CreateSessionForm => ({
  sessionCategory: 'course',
  courseId: '7',
  startDate: '2026-10-19',
  startTime: '09:00',
  durationMode: 'minutes',
  duration: 60,
  sessionType: 'study',
  ...overrides,
});

describe('resolveSessionTitle', () => {
  it('appends the category once and keeps names that already carry it', () => {
    expect(resolveSessionTitle(form(), [course()])).toBe('Matematik (TYT)');
    expect(resolveSessionTitle(form(), [course({ name: 'Matematik (tyt)' })])).toBe('Matematik (tyt)');
  });

  it('keeps the stored title while the course is unchanged', () => {
    const stored = { courseId: 7, title: 'Eski başlık' } as StudySession;
    expect(resolveSessionTitle(form(), [course()], stored)).toBe('Eski başlık');
  });

  it('falls back by category', () => {
    expect(resolveSessionTitle(form({ courseId: '99' }), [course()])).toBe('Çalışma');
    expect(resolveSessionTitle(form({ sessionCategory: 'break' }), [])).toBe('Mola');
    expect(resolveSessionTitle(form({ sessionCategory: 'custom', customTitle: 'Okuma' }), [])).toBe('Okuma');
    expect(resolveSessionTitle(form({ sessionCategory: 'custom' }), [])).toBe('Çalışma');
  });
});

describe('resolveSessionRange', () => {
  it('derives the end from minutes or from the end wall time', () => {
    const minutes = resolveSessionRange(form({ duration: 90 }), 'minutes', 'Europe/Istanbul');
    expect(minutes.endTime.getTime() - minutes.startTime.getTime()).toBe(90 * 60000);
    const range = resolveSessionRange(form({ endTime: '10:15' }), 'timeRange', 'Europe/Istanbul');
    expect(range.endTime.getTime() - range.startTime.getTime()).toBe(75 * 60000);
  });

  it('rejects invalid durations and nonexistent wall times', () => {
    expect(() => resolveSessionRange(form({ endTime: '08:00' }), 'timeRange', 'Europe/Istanbul')).toThrow();
    expect(() => resolveSessionRange(form({ startDate: '2026-03-29', startTime: '02:30' }), 'minutes', 'Europe/Berlin')).toThrow();
  });
});

describe('buildSessionPayload', () => {
  const range = { startTime: new Date('2026-10-19T06:00:00Z'), endTime: new Date('2026-10-19T07:00:00Z') };

  it('forces break sessions and downgrades a stale break type', () => {
    expect(buildSessionPayload(form({ sessionCategory: 'break', sessionType: 'pomodoro' }), 'Mola', range, false).sessionType).toBe('break');
    expect(buildSessionPayload(form({ sessionType: 'break' }), 'T', range, false).sessionType).toBe('study');
  });

  it('detaches the course on edit only when none is selected', () => {
    const custom = form({ sessionCategory: 'custom', courseId: undefined });
    expect(buildSessionPayload(custom, 'T', range, true)).toMatchObject({ courseId: null, topicId: null });
    expect(buildSessionPayload(custom, 'T', range, false)).not.toHaveProperty('courseId');
    expect(buildSessionPayload(form(), 'T', range, true)).toMatchObject({ courseId: 7 });
  });

  it('includes pomodoro settings with a reset cycle only for pomodoro sessions', () => {
    const pomodoro = form({ sessionType: 'pomodoro', pomodoroSettings: { workDuration: 30, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4 } });
    expect(buildSessionPayload(pomodoro, 'T', range, false)).toMatchObject({ pomodoroSettings: { workDuration: 30, currentCycle: 0 } });
    expect(buildSessionPayload(form({ pomodoroSettings: pomodoro.pomodoroSettings }), 'T', range, false)).not.toHaveProperty('pomodoroSettings');
  });
});

describe('duration labels', () => {
  it('summarizes wall-time ranges and end times', () => {
    expect(wallTimeMinutes('2026-10-19', '09:00', '10:30', 'Europe/Istanbul')).toBe(90);
    expect(rangeDurationLabel('2026-10-19', '09:00', '10:30', 'Europe/Istanbul')).toBe('90 dakika');
    expect(rangeDurationLabel('2026-10-19', '10:00', '09:00', 'Europe/Istanbul')).toBe('0 dakika');
    expect(rangeDurationLabel(undefined, '09:00', '10:00', 'Europe/Istanbul')).toBe('0 dakika');
    expect(endTimeLabel('2026-10-19', '09:00', 60, 'Europe/Istanbul')).toBe('10:00');
    expect(endTimeLabel('2026-10-19', undefined, 60, 'Europe/Istanbul')).toBe('--:--');
  });
});
