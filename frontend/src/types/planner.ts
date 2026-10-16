import type { CreateSessionInput, UpdateSessionInput, SessionStatus, ActivityInterval, TrackingCoverage, CreateTopicInput, UpdateTopicInput, PomodoroClockState } from '@study-tracker/contracts';

export interface Plan {
  id: number;
  userId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  goals: {
    dailyHours: number;
    weeklyHours: number;
    targetTopics: number;
    priority: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: number;
  userId: number;
  planId?: number;
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

export interface CreatePlanRequest {
  title: string;
  description?: string | undefined;
  startDate: string;
  endDate: string;
  goals?: {
    dailyHours: number;
    weeklyHours: number;
    targetTopics: number;
    priority: 'low' | 'medium' | 'high';
  } | undefined;
}

export type CreateStudySessionRequest = CreateSessionInput;
export type UpdateStudySessionRequest = Omit<UpdateSessionInput, 'expectedUpdatedAt'>;

export interface Topic {
  id: number;
  name: string;
  courseId: number;
  description?: string;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: number;
    name: string;
    category: 'TYT' | 'AYT';
    color: string;
    icon: string;
  };
}

export type CreateTopicRequest = CreateTopicInput;
export type UpdateTopicRequest = UpdateTopicInput;
