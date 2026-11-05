import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { studySessionsAPI, tagsAPI } from '../../services/api';
import { HttpError } from '../../services/httpError';
import { useAuthStore } from '../../store/authStore';
import type { StudySession } from '../../types/planner';
import { ChangedMeanwhile, recordChange, sessionCopy, step, usePlannerHistory } from './plannerHistory';

vi.mock('../../services/api', () => ({
  studySessionsAPI: { getSession: vi.fn(), updateSession: vi.fn(), createSession: vi.fn(), deleteSession: vi.fn() },
  tagsAPI: { list: vi.fn(), setSessionTags: vi.fn() },
}));

const session: StudySession = {
  id: 7,
  userId: 1,
  courseId: 3,
  title: 'Algebra',
  startTime: '2026-11-05T09:00:00.000Z',
  endTime: '2026-11-05T10:00:00.000Z',
  duration: 60,
  status: 'planned',
  sessionType: 'pomodoro',
  color: '#123456',
  pomodoroSettings: { workDuration: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4, currentCycle: 3 },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
const before = { startTime: session.startTime, endTime: session.endTime };
const after = { startTime: '2026-11-05T11:00:00.000Z', endTime: '2026-11-05T12:00:00.000Z' };
const reply = (value: StudySession) => ({ data: { success: true, data: { session: value } }, status: 200, config: { url: '' } });
const stored = (value: StudySession) => vi.mocked(studySessionsAPI.getSession).mockResolvedValue(reply(value));

beforeEach(() => usePlannerHistory.setState({ epoch: useAuthStore.getState().epoch, past: [], future: [] }));
afterEach(() => vi.resetAllMocks());

describe('planner history', () => {
  it('undoes and redoes a move against the version the server has now', async () => {
    recordChange({ kind: 'times', id: 7, before, after });
    stored({ ...session, ...after, updatedAt: '2026-11-05T08:00:00Z' });
    await step('undo');
    expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(expect.objectContaining({ updatedAt: '2026-11-05T08:00:00Z' }), before);
    expect(usePlannerHistory.getState()).toMatchObject({ past: [], future: [{ kind: 'times' }] });
    stored({ ...session, updatedAt: '2026-11-05T08:01:00Z' });
    await step('redo');
    expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(expect.objectContaining({ id: 7 }), after);
    expect(usePlannerHistory.getState().past).toHaveLength(1);
  });

  it('drops a step whose session changed elsewhere and never overwrites it', async () => {
    recordChange({ kind: 'times', id: 7, before, after });
    stored({ ...session, startTime: '2026-11-05T15:00:00.000Z', endTime: '2026-11-05T16:00:00.000Z' });
    await expect(step('undo')).rejects.toBeInstanceOf(ChangedMeanwhile);
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
    expect(usePlannerHistory.getState()).toMatchObject({ past: [], future: [] });
  });

  it('keeps the step when only the request failed', async () => {
    recordChange({ kind: 'times', id: 7, before, after });
    vi.mocked(studySessionsAPI.getSession).mockRejectedValue(new HttpError('offline', undefined, undefined, 'ERR_NETWORK'));
    await expect(step('undo')).rejects.toBeInstanceOf(HttpError);
    expect(usePlannerHistory.getState().past).toHaveLength(1);
  });

  it('brings a deleted session back with its tags and deletes it again on redo', async () => {
    const copy = sessionCopy(session);
    expect(copy).toEqual({
      courseId: 3,
      title: 'Algebra',
      startTime: session.startTime,
      endTime: session.endTime,
      sessionType: 'pomodoro',
      color: '#123456',
      pomodoroSettings: { workDuration: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4, currentCycle: 0 },
    });
    recordChange({ kind: 'deleted', id: 7, copy, tagIds: [4] });
    vi.mocked(studySessionsAPI.createSession).mockResolvedValue(reply({ ...session, id: 9 }));
    await step('undo');
    expect(studySessionsAPI.createSession).toHaveBeenCalledWith(copy);
    expect(tagsAPI.setSessionTags).toHaveBeenCalledWith(9, [4]);
    stored({ ...session, id: 9 });
    await step('redo');
    expect(studySessionsAPI.deleteSession).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }));
  });

  it('starts empty for another sign-in and caps a new change by clearing redo', async () => {
    recordChange({ kind: 'times', id: 7, before, after });
    usePlannerHistory.setState({ future: [{ kind: 'times', id: 7, before, after }] });
    recordChange({ kind: 'times', id: 8, before, after });
    expect(usePlannerHistory.getState().future).toEqual([]);
    usePlannerHistory.setState({ epoch: -5 });
    expect(await step('undo')).toBe(false);
  });
});
