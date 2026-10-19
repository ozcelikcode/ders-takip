import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionStatus,
  ActivityInterval,
  TrackingCoverage,
  CreateTopicInput,
  UpdateTopicInput,
  PomodoroClockState,
} from '@study-tracker/contracts';

export interface StudySession {
  id: number;
  userId: number;
  planId?: number | null;
  topicId?: number | null;
  courseId?: number | null;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  studySeconds?: number;
  breakSeconds?: number;
  pauseSeconds?: number;
  trackingCoverage?: TrackingCoverage;
  activityIntervals?: ActivityInterval[];
  asOf?: string;
  serverNow?: string;
  pomodoroClock?: PomodoroClockState | null;
  status: SessionStatus;
  sessionType: 'study' | 'break' | 'pomodoro' | 'review';
  color?: string;
  pomodoroSettings?: {
    workDuration: number;
    shortBreak: number;
    longBreak: number;
    cyclesBeforeLongBreak: number;
    currentCycle: number;
  };
  notes?: string;
  productivity?: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: number;
    title: string;
  };
  course?: {
    id: number;
    title: string;
  };
  topic?: {
    id: number;
    title: string;
  };
}

export type CreateStudySessionRequest = CreateSessionInput;
export type UpdateStudySessionRequest = Omit<
  UpdateSessionInput,
  'expectedUpdatedAt'
>;

export type CreateTopicRequest = CreateTopicInput;
export type UpdateTopicRequest = UpdateTopicInput;
