import {
  CalendarDate,
  calendarViewDate,
  calendarViewInstant,
} from '@study-tracker/contracts';
import { addDays, format, sessionDayBounds } from '../../utils/calendarDates';
import type { StudySession } from '../../types/planner';

export const calendarHours = Array.from({ length: 24 }, (_, hour) => hour);
export const calendarCardMinHeight = 28;
const calendarLaneMinWidth = 160;

interface CardBounds {
  id: number;
  top: number;
  height: number;
}

export function layoutCalendarCards(cards: CardBounds[]) {
  const placements = new Map<
    number,
    { lane: number; laneCount: number; height: number }
  >();
  const ordered = cards
    .map((card) => ({
      ...card,
      height: Math.max(calendarCardMinHeight, card.height),
    }))
    .sort((a, b) => a.top - b.top || a.id - b.id);
  let group: typeof ordered = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const finishGroup = () => {
    for (const card of group)
      placements.get(card.id)!.laneCount = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const card of ordered) {
    if (card.top >= groupEnd) finishGroup();
    const available = laneEnds.findIndex((end) => end <= card.top);
    const lane = available === -1 ? laneEnds.length : available;
    const end = card.top + card.height;
    laneEnds[lane] = end;
    groupEnd = Math.max(groupEnd, end);
    group.push(card);
    placements.set(card.id, { lane, laneCount: 1, height: card.height });
  }
  finishGroup();
  return placements;
}

export type CalendarMode = 'daily' | 'weekly';
export const canRepositionSession = (session: StudySession) =>
  session.status !== 'in_progress' && session.status !== 'completed';
export const sessionMinutes = (session: StudySession) =>
  (Date.parse(session.endTime) - Date.parse(session.startTime)) / 60000;
export const snappedDropMinute = (
  hour: number,
  offsetPixels: number,
  hourHeight: number,
) =>
  Math.max(
    0,
    Math.min(
      1425,
      hour * 60 + Math.round((offsetPixels / hourHeight) * 4) * 15,
    ),
  );
export const resizedDuration = (
  duration: number,
  deltaPixels: number,
  hourHeight: number,
) =>
  Math.max(
    5,
    Math.min(
      1440,
      Math.round((duration + (deltaPixels / hourHeight) * 60) / 5) * 5,
    ),
  );

export function moveSessionTimes(
  session: StudySession,
  date: Date,
  timezone: string,
  minute?: number,
) {
  const original = calendarViewDate(session.startTime, timezone);
  const target = new CalendarDate(date);
  target.setHours(
    0,
    minute ?? original.getHours() * 60 + original.getMinutes(),
    minute === undefined ? original.getSeconds() : 0,
    minute === undefined ? original.getMilliseconds() : 0,
  );
  const start = calendarViewInstant(target, timezone);
  return {
    startTime: start.toISOString(),
    endTime: new Date(
      start.getTime() +
        Date.parse(session.endTime) -
        Date.parse(session.startTime),
    ).toISOString(),
  };
}

export function calendarSegment(
  session: StudySession,
  date: Date,
  timezone: string,
  hourHeight: number,
) {
  const bounds = sessionDayBounds(session, date, timezone);
  return {
    hour: bounds.start.getHours(),
    top:
      ((bounds.start.getMinutes() +
        bounds.start.getSeconds() / 60 +
        bounds.start.getMilliseconds() / 60_000) /
        60) *
      hourHeight,
    height: (bounds.minutes / 60) * hourHeight,
    minutes: bounds.minutes,
    startsHere:
      format(calendarViewDate(session.startTime, timezone), 'yyyy-MM-dd') ===
      format(date, 'yyyy-MM-dd'),
    endsHere:
      calendarViewDate(session.endTime, timezone).getTime() <=
      addDays(
        new CalendarDate(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
        ),
        1,
      ).getTime(),
  };
}

/** Segments for every visible day, with the optional live resize preview applied and lanes assigned. */
export function buildDaySegments(
  days: readonly Date[],
  sessions: readonly StudySession[],
  resizePreview: { sessionId: number; minutes: number } | null,
  timezone: string,
  hourHeight: number,
) {
  return days.map((day) => {
    const segments = sessions
      .map((session) => {
        const preview =
          resizePreview?.sessionId === session.id
            ? {
                ...session,
                endTime: new Date(
                  Date.parse(session.startTime) + resizePreview.minutes * 60000,
                ).toISOString(),
                duration: resizePreview.minutes,
              }
            : session;
        return {
          session,
          preview,
          segment: calendarSegment(preview, day, timezone, hourHeight),
        };
      })
      .filter(({ segment }) => segment.minutes > 0)
      .sort(
        (a, b) =>
          a.segment.hour - b.segment.hour ||
          a.segment.top - b.segment.top ||
          a.session.id - b.session.id,
      );
    const placements = layoutCalendarCards(
      segments.map(({ session, segment }) => ({
        id: session.id,
        top: segment.hour * hourHeight + segment.top,
        height: segment.height,
      })),
    );
    return segments.map((entry) => ({
      ...entry,
      placement: placements.get(entry.session.id)!,
    }));
  });
}

/** Minimum column width per day: empty weekly days stay narrow, busy days widen with their lane count. */
export const dayMinWidths = (
  daySegments: ReturnType<typeof buildDaySegments>,
  weekly: boolean,
) =>
  daySegments.map((segments) =>
    segments.length === 0 && weekly
      ? 104
      : Math.max(1, ...segments.map(({ placement }) => placement.laneCount)) *
        calendarLaneMinWidth,
  );

/** `${dayIndex}:${hour}` keys of hour slots overlapped by a non-cancelled session. */
export function occupiedSlotKeys(
  daySegments: ReturnType<typeof buildDaySegments>,
  hourHeight: number,
) {
  const occupied = new Set<string>();
  daySegments.forEach((segments, day) =>
    calendarHours.forEach((hour) => {
      if (
        segments.some(
          ({ session, segment }) =>
            session.status !== 'cancelled' &&
            segment.hour * 60 + (segment.top / hourHeight) * 60 <
              (hour + 1) * 60 &&
            segment.hour * 60 +
              (segment.top / hourHeight) * 60 +
              segment.minutes >
              hour * 60,
        )
      )
        occupied.add(`${day}:${hour}`);
    }),
  );
  return occupied;
}

/**
 * Next focus target for keyboard navigation between free slots.
 * Returns undefined when the key is not a navigation key and null when there is nowhere to go.
 */
export function slotNavigationTarget(
  availableSlots: readonly string[],
  key: string,
  ctrlKey: boolean,
  day: number,
  hour: number,
): string | null | undefined {
  const coordinate = (slot: string) =>
    slot.split(':').map(Number) as [number, number];
  let candidates: string[];
  if (key === 'ArrowUp' || key === 'ArrowDown')
    candidates = availableSlots
      .filter((slot) => {
        const [d, h] = coordinate(slot);
        return d === day && (key === 'ArrowUp' ? h < hour : h > hour);
      })
      .sort(
        (a, b) =>
          Math.abs(coordinate(a)[1] - hour) - Math.abs(coordinate(b)[1] - hour),
      );
  else if (key === 'ArrowLeft' || key === 'ArrowRight')
    candidates = availableSlots
      .filter((slot) => {
        const [d, h] = coordinate(slot);
        return h === hour && (key === 'ArrowLeft' ? d < day : d > day);
      })
      .sort(
        (a, b) =>
          Math.abs(coordinate(a)[0] - day) - Math.abs(coordinate(b)[0] - day),
      );
  else if (key === 'Home' || key === 'End') {
    candidates = availableSlots.filter(
      (slot) => ctrlKey || coordinate(slot)[0] === day,
    );
    if (key === 'End') candidates.reverse();
  } else return undefined;
  return candidates[0] ?? null;
}
