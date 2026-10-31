import { expect, it } from 'vitest';
import { sessionsCsv } from './sessionCsv';

const labels = {
  headers: ['Date', 'Start', 'End', 'Title', 'Category', 'Record', 'Sub-item', 'Status', 'Planned', 'Measured', 'Measurement', 'Notes'],
  statuses: { planned: 'Planned', in_progress: 'Running', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled' },
  coverage: { complete: 'Timer', partial: 'Partial', untracked: 'Not measured', manual: 'Logged' },
} as const;
const session = {
  id: 1, userId: 1, title: 'Read; chapter "3"', startTime: '2026-10-20T21:30:00Z', endTime: '2026-10-20T22:15:00Z', duration: 45,
  studySeconds: 2670, trackingCoverage: 'manual' as const, status: 'completed' as const, sessionType: 'study' as const,
  notes: 'line one\nline two', createdAt: '', updatedAt: '',
  course: { id: 4, name: 'Kitaplar', category: { id: 9, name: 'Kişisel' } }, topic: null,
};

it('writes one row per session in the user zone, quoting only where the separator, quotes or line breaks need it', () => {
  const csv = sessionsCsv([session], 'Europe/Istanbul', ';', labels);
  expect(csv.startsWith('\uFEFFDate;Start;End;')).toBe(true);
  expect(csv.split('\r\n')[1]).toBe('2026-10-21;00:30;01:15;"Read; chapter ""3""";Kişisel;Kitaplar;;Completed;45;45;Logged;"line one\nline two"');
});

it('uses commas for English and leaves the separator of the other language unquoted', () => {
  const csv = sessionsCsv([{ ...session, title: 'Read; done', notes: '' }], 'UTC', ',', labels);
  expect(csv.split('\r\n')[1]).toBe('2026-10-20,21:30,22:15,Read; done,Kişisel,Kitaplar,,Completed,45,45,Logged,');
});
