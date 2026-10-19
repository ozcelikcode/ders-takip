import {
  formatZonedTime,
  isSessionDurationValid,
  wallTimeToInstant,
} from '@study-tracker/contracts';
import { differenceInMinutes } from 'date-fns';
import type { CatalogCourse } from '../../types/catalog';
import type {
  CreateStudySessionRequest,
  StudySession,
  UpdateStudySessionRequest,
} from '../../types/planner';
import type { CreateSessionForm } from './sessionForm';

export type DurationMode = 'minutes' | 'timeRange';

/** Resolves the session instants from the form's wall-clock values. Throws on ambiguous or invalid times. */
export const resolveSessionRange = (
  data: Pick<CreateSessionForm, 'startDate' | 'startTime' | 'endTime' | 'duration'>,
  durationMode: DurationMode,
  timezone: string,
): { startTime: Date; endTime: Date } => {
  const startTime = wallTimeToInstant(data.startDate, data.startTime, timezone);
  const endTime =
    durationMode === 'timeRange' && data.endTime
      ? wallTimeToInstant(data.startDate, data.endTime, timezone)
      : new Date(startTime.getTime() + data.duration * 60000);
  if (!isSessionDurationValid(endTime.getTime() - startTime.getTime()))
    throw new Error('Invalid session duration');
  return { startTime, endTime };
};

/** Picks the stored title when the course is unchanged, otherwise derives it from the course and category. */
export const resolveSessionTitle = (
  data: Pick<CreateSessionForm, 'sessionCategory' | 'courseId' | 'customTitle'>,
  courses: readonly CatalogCourse[] | undefined,
  editSession?: StudySession | null,
): string => {
  if (data.sessionCategory === 'course' && data.courseId) {
    const selectedCourse = courses?.find(
      (course) => course.id.toString() === data.courseId,
    );
    if (editSession?.courseId === selectedCourse?.id && editSession) {
      return editSession.title;
    }
    if (selectedCourse) {
      // Avoid duplicating the category when the course name already carries it.
      const categoryName = selectedCourse.category?.name || '';
      const hasCategory =
        selectedCourse.name.includes(`(${categoryName})`) ||
        selectedCourse.name.includes(`(${categoryName.toLowerCase()})`);
      return hasCategory
        ? selectedCourse.name
        : `${selectedCourse.name}${categoryName ? ` (${categoryName})` : ''}`;
    }
    return 'Ders Çalışması';
  }
  if (data.sessionCategory === 'break') return 'Mola';
  if (data.sessionCategory === 'custom' && data.customTitle) {
    return data.customTitle;
  }
  return 'Çalışma Seansı';
};

export const buildSessionPayload = (
  data: CreateSessionForm,
  title: string,
  range: { startTime: Date; endTime: Date },
  isEditMode: boolean,
): CreateStudySessionRequest | UpdateStudySessionRequest => {
  const sessionType =
    data.sessionCategory === 'break'
      ? 'break'
      : data.sessionType === 'break'
        ? 'study'
        : data.sessionType;
  return {
    title,
    description: data.description ?? '',
    ...(data.sessionCategory === 'course' && data.courseId
      ? { courseId: parseInt(data.courseId, 10) }
      : isEditMode
        ? { courseId: null, topicId: null }
        : {}),
    startTime: range.startTime.toISOString(),
    endTime: range.endTime.toISOString(),
    sessionType,
    color: data.color || '#3B82F6',
    ...(sessionType === 'pomodoro' &&
      data.pomodoroSettings && {
        pomodoroSettings: {
          workDuration: data.pomodoroSettings.workDuration || 25,
          shortBreak: data.pomodoroSettings.shortBreak || 5,
          longBreak: data.pomodoroSettings.longBreak || 15,
          cyclesBeforeLongBreak: data.pomodoroSettings.cyclesBeforeLongBreak || 4,
          currentCycle: 0,
        },
      }),
  };
};

/** Whole minutes between two wall times of the same day, or null when they cannot be resolved. */
export const wallTimeMinutes = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string,
): number | null => {
  try {
    return differenceInMinutes(
      wallTimeToInstant(date, endTime, timezone),
      wallTimeToInstant(date, startTime, timezone),
    );
  } catch {
    return null;
  }
};

export const rangeDurationLabel = (
  date: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  timezone: string,
): string => {
  if (!date || !startTime || !endTime) return '0 dakika';
  const minutes = wallTimeMinutes(date, startTime, endTime, timezone);
  if (minutes === null) return 'Geçersiz saat';
  return minutes > 0 ? `${minutes} dakika` : '0 dakika';
};

export const endTimeLabel = (
  date: string | undefined,
  startTime: string | undefined,
  duration: number,
  timezone: string,
): string => {
  if (!date || !startTime) return '--:--';
  try {
    const start = wallTimeToInstant(date, startTime, timezone);
    return formatZonedTime(new Date(start.getTime() + duration * 60000), timezone);
  } catch {
    return 'Geçersiz saat';
  }
};
