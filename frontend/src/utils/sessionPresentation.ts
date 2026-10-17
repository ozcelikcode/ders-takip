import type { SessionStatus } from '@study-tracker/contracts';
import type { StudySession } from '../types/planner';

export const sessionStatusLabels: Record<SessionStatus, string> = {
  planned: 'Planlandı',
  in_progress: 'Devam ediyor',
  paused: 'Duraklatıldı',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};
export const sessionTypeLabels: Record<StudySession['sessionType'], string> = {
  study: 'Çalışma',
  pomodoro: 'Pomodoro',
  review: 'Tekrar',
  break: 'Mola',
};
