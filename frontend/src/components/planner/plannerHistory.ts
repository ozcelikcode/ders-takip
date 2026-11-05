import type { CreateSessionInput } from '@study-tracker/contracts';
import { create } from 'zustand';
import { studySessionsAPI, tagsAPI } from '../../services/api';
import { isHttpError } from '../../services/httpError';
import { useAuthStore } from '../../store/authStore';
import type { StudySession } from '../../types/planner';

type Times = { startTime: string; endTime: string };
/** What a new session needs to stand in for one that was copied or deleted. */
type SessionCopy = CreateSessionInput;

/**
 * One calendar change that can be taken back and done again.
 * Entries keep session ids and times, never versions: each step reads the session first and refuses
 * when it changed in the meantime, so an undo never overwrites someone else's newer edit.
 */
export type HistoryEntry =
  | { kind: 'times'; id: number; before: Times; after: Times }
  | { kind: 'created'; id: number; copy: SessionCopy; tagIds: number[] }
  | { kind: 'deleted'; id: number; copy: SessionCopy; tagIds: number[] };

const limit = 50;
type HistoryState = {
  epoch: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
};
/** Undo and redo stacks for the calendar, kept across the daily, weekly and monthly views of one sign-in. */
export const usePlannerHistory = create<HistoryState>(() => ({ epoch: -1, past: [], future: [] }));

/** The stacks of the current sign-in; a different account or a new sign-in starts empty. */
const current = () => {
  const epoch = useAuthStore.getState().epoch;
  const state = usePlannerHistory.getState();
  if (state.epoch !== epoch) usePlannerHistory.setState({ epoch, past: [], future: [] });
  return usePlannerHistory.getState();
};
export const recordChange = (entry: HistoryEntry) => {
  const { past } = current();
  usePlannerHistory.setState({ past: [...past, entry].slice(-limit), future: [] });
};
/** How many steps can be undone and redone for the signed-in account. */
export const useHistoryDepth = () => {
  const epoch = useAuthStore((state) => state.epoch);
  // Two number selectors: a fresh object per read would never compare equal and loop the render.
  const undo = usePlannerHistory((state) => (state.epoch === epoch ? state.past.length : 0));
  const redo = usePlannerHistory((state) => (state.epoch === epoch ? state.future.length : 0));
  return { undo, redo };
};

/** A session the planner may undo; anything already measured would lose its record when recreated. */
export const canRecreate = (session: StudySession) => session.status === 'planned';

export const sessionCopy = (session: StudySession, times: Times = session): SessionCopy => ({
  ...(session.planId ? { planId: session.planId } : {}),
  ...(session.topicId ? { topicId: session.topicId } : {}),
  ...(session.courseId ? { courseId: session.courseId } : {}),
  title: session.title,
  ...(session.description ? { description: session.description } : {}),
  startTime: times.startTime,
  endTime: times.endTime,
  sessionType: session.sessionType,
  ...(session.color ? { color: session.color } : {}),
  ...(session.pomodoroSettings ? { pomodoroSettings: { ...session.pomodoroSettings, currentCycle: 0 } } : {}),
});
export const sessionTagIds = async (sessionId: number) =>
  (await tagsAPI.list()).sessionTags.filter((row) => row.sessionId === sessionId).map((row) => row.tagId);

/** Raised when the session no longer looks the way this step left it. */
export class ChangedMeanwhile extends Error {}

const sameTimes = (session: Times, times: Times) =>
  Date.parse(session.startTime) === Date.parse(times.startTime) &&
  Date.parse(session.endTime) === Date.parse(times.endTime);
const read = async (id: number) => {
  try {
    const session = (await studySessionsAPI.getSession(String(id))).data.data?.session;
    if (session) return session;
  } catch (error) {
    // A session deleted elsewhere is a change; a failed request is only a failure and keeps the step.
    if (!isHttpError(error) || error.response?.status !== 404) throw error;
  }
  throw new ChangedMeanwhile();
};
const createCopy = async (copy: SessionCopy, tagIds: number[]) => {
  const session = (await studySessionsAPI.createSession(copy)).data.data?.session;
  if (!session) throw new Error('Missing created session');
  if (tagIds.length) await tagsAPI.setSessionTags(session.id, tagIds);
  return session.id;
};
const removeUnchanged = async (id: number, copy: SessionCopy) => {
  const session = await read(id);
  if (!canRecreate(session) || !sameTimes(session, copy)) throw new ChangedMeanwhile();
  await studySessionsAPI.deleteSession(session);
};
const setTimes = async (id: number, from: Times, to: Times) => {
  const session = await read(id);
  if (!sameTimes(session, from)) throw new ChangedMeanwhile();
  await studySessionsAPI.updateSession(session, to);
};

/** Applies one step back (`undo`) or forward; returns the entry as it now stands (a recreated session has a new id). */
async function apply(entry: HistoryEntry, direction: 'undo' | 'redo'): Promise<HistoryEntry> {
  const back = direction === 'undo';
  switch (entry.kind) {
    case 'times':
      await setTimes(entry.id, back ? entry.after : entry.before, back ? entry.before : entry.after);
      return entry;
    case 'created':
      if (back) {
        await removeUnchanged(entry.id, entry.copy);
        return entry;
      }
      return { ...entry, id: await createCopy(entry.copy, entry.tagIds) };
    case 'deleted':
      if (back) return { ...entry, id: await createCopy(entry.copy, entry.tagIds) };
      await removeUnchanged(entry.id, entry.copy);
      return entry;
  }
}

/**
 * Takes the newest step off one stack, applies it and moves it to the other.
 * A step whose session changed meanwhile is dropped, since it can never apply again.
 */
export async function step(direction: 'undo' | 'redo') {
  const state = current();
  const from = direction === 'undo' ? state.past : state.future;
  const entry = from[from.length - 1];
  if (!entry) return false;
  const rest = from.slice(0, -1);
  try {
    const applied = await apply(entry, direction);
    const latest = current();
    usePlannerHistory.setState(
      direction === 'undo'
        ? { past: rest, future: [...latest.future, applied] }
        : { future: rest, past: [...latest.past, applied] },
    );
    return true;
  } catch (error) {
    if (error instanceof ChangedMeanwhile)
      usePlannerHistory.setState(direction === 'undo' ? { past: rest } : { future: rest });
    throw error;
  }
}
