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
  topicId?: number;
  courseId?: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
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
  completedAt?: string;
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

export interface WeeklySchedule {
  [key: string]: StudySession[];
}

export interface DragItem {
  id: string;
  type: 'session';
  data: StudySession;
}

export interface DropTarget {
  day: string;
  hour: number;
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

export interface CreateStudySessionRequest {
  planId?: number | undefined;
  topicId?: number | undefined;
  courseId?: number | undefined;
  title: string;
  description?: string | undefined;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: 'study' | 'break' | 'pomodoro' | 'review';
  color?: string | undefined;
  pomodoroSettings?: {
    workDuration: number;
    shortBreak: number;
    longBreak: number;
    cyclesBeforeLongBreak: number;
    currentCycle: number;
  } | undefined;
}

export interface UpdateStudySessionRequest {
  planId?: number | undefined;
  topicId?: number | undefined;
  courseId?: number | undefined;
  title?: string | undefined;
  description?: string | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  duration?: number | undefined;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused' | undefined;
  sessionType?: 'study' | 'break' | 'pomodoro' | 'review' | undefined;
  color?: string | undefined;
  pomodoroSettings?: {
    workDuration: number;
    shortBreak: number;
    longBreak: number;
    cyclesBeforeLongBreak: number;
    currentCycle: number;
  } | undefined;
  notes?: string | undefined;
  productivity?: number | undefined;
}

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

export interface CreateTopicRequest {
  name: string;
  courseId: number;
  description?: string;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
}

export interface UpdateTopicRequest {
  name?: string;
  description?: string;
  estimatedTime?: number;
  difficulty?: 'Kolay' | 'Orta' | 'Zor';
  order?: number;
  isActive?: boolean;
}