import { parseISO, format } from 'date-fns';
import { StudySession } from '../types/planner';

/**
 * Oturumun vakti geçmiş mi kontrol eder
 */
export const isSessionOverdue = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);
  return sessionEnd < now;
};

/**
 * Oturum kaçırılmış mı (tamamlanmamış ve vakti geçmiş)
 */
export const isSessionMissed = (session: StudySession): boolean => {
  return (
    isSessionOverdue(session) &&
    session.status !== 'completed' &&
    session.status !== 'cancelled'
  );
};

/**
 * Oturum başlatılabilir mi kontrol eder
 */
export const canStartSession = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);

  // Vakti geçmişse başlatılamaz
  if (sessionEnd < now) {
    return false;
  }

  // Zaten başlatılmışsa tekrar başlatılamaz
  if (session.status === 'in_progress') {
    return false;
  }

  // Tamamlanmışsa başlatılamaz
  if (session.status === 'completed') {
    return false;
  }

  return true;
};

/**
 * Oturum için text dekorasyon stil class'ını döndürür
 */
export const getSessionTextStyle = (session: StudySession): string => {
  // Tamamlanan görevler - yeşil line-through
  if (session.status === 'completed') {
    return 'line-through decoration-2 decoration-green-500/50';
  }

  // Kaçırılan görevler - kırmızı line-through
  if (isSessionMissed(session)) {
    return 'line-through decoration-2 decoration-red-500/50';
  }

  return '';
};

/**
 * Tarihi HH:mm formatında gösterir, 24:00'ı 00:00'a çevirir
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();

  // 24:00 yerine 00:00 göster (gece yarısı)
  const displayHours = hours === 24 ? 0 : hours;

  return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
