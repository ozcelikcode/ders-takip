import { dateKeyInZone, formatZonedTime } from '@study-tracker/contracts';
import type { StudySession } from '../../types/planner';

export interface CsvLabels {
  headers: readonly string[];
  statuses: Record<StudySession['status'], string>;
  coverage: Record<NonNullable<StudySession['trackingCoverage']>, string>;
}

/**
 * One row per session in the user's time zone. Turkish spreadsheets expect `;` between fields and English ones `,`;
 * a byte order mark lets them read the file as UTF-8.
 */
export function sessionsCsv(sessions: readonly StudySession[], timezone: string, separator: ';' | ',', labels: CsvLabels): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = sessions.map((session) => [
    dateKeyInZone(new Date(session.startTime), timezone),
    formatZonedTime(session.startTime, timezone),
    formatZonedTime(session.endTime, timezone),
    session.title,
    session.course?.category?.name ?? '',
    session.course?.name ?? '',
    session.topic?.name ?? '',
    labels.statuses[session.status],
    session.duration,
    Math.round((session.studySeconds ?? 0) / 60),
    session.trackingCoverage ? labels.coverage[session.trackingCoverage] : '',
    session.notes ?? '',
  ]);
  return `\uFEFF${[labels.headers, ...rows].map((row) => row.map(cell).join(separator)).join('\r\n')}\r\n`;
}
