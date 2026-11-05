import { useTerms } from '../../hooks/useTerms';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { CalendarDate, calendarViewDate } from '@study-tracker/contracts';
import { Clock, Plus } from 'lucide-react';
import { addDays, format, startOfMonth } from '../../utils/calendarDates';
import type { StudySession } from '../../types/planner';
import { initializeCalendarViewport } from './calendarViewport';
import {
  calendarHours,
  calendarCardMinHeight,
  buildDaySegments,
  dayMinWidths,
  occupiedSlotKeys,
  slotNavigationTarget,
  canRepositionSession,
  resizedDuration,
  sessionMinutes,
  clockText,
  draftRange,
  snappedDropMinute,
  type CalendarMode,
} from './calendarGeometry';
import { usePlannerCalendar } from './usePlannerCalendar';
import CalendarSessionCard from './CalendarSessionCard';
import CalendarToolbar from './CalendarToolbar';
import SessionActionsMenu, { type SessionActionsAnchor } from './SessionActionsMenu';
import CreateSessionModal from './CreateSessionModal';
import MonthGrid from './MonthGrid';
import ShortcutsDialog from './ShortcutsDialog';
import { useHistoryDepth } from './plannerHistory';
import MoveSessionModal from './MoveSessionModal';
import PomodoroModal from './PomodoroModal';
import ConfirmDialog from '../common/ConfirmDialog';
import { canRecreate } from './plannerHistory';
import { useText } from '../../store/languageStore';

export interface PlannerCalendarProps {
  /** Opens the editor for a new session; `minute` counts from midnight, `duration` is set when a span was dragged. */
  onCreateSession?: ((date: Date, minute: number, duration?: number) => void) | undefined;
  /** Calendar day (YYYY-MM-DD) to open instead of today, e.g. from a search result. */
  initialDate?: string | undefined;
  /** Shows only sessions with this tag, directly or through their record. */
  tagId?: number | null;
  /** Switches between the daily, weekly and monthly view; the shown date stays. */
  onViewChange?: ((mode: CalendarMode) => void) | undefined;
}
interface Props extends PlannerCalendarProps {
  mode: CalendarMode;
}
/** A card being moved: by native mouse drag, or by a held touch (`touch`), which has no drop zones off the grid. */
type Drag = { session: StudySession; offset: number; touch?: boolean };
/** A touch press on a card, lifted for a move once held still. */
type Lift = { session: StudySession; offset: number; pointerId: number; x: number; y: number; active: boolean };
type Drop = { day: number; hour: number; minute: number };
/** A press on empty hours that becomes a new session's time span once held or dragged. */
type Draft = {
  day: number;
  pressed: number;
  pointer: number;
  x: number;
  y: number;
  scroll: number;
  pointerId: number;
  touch: boolean;
  active: boolean;
};
// A touch must stay still this long before it selects time instead of scrolling; a held mouse button shows the span too.
const holdDelay = 300;
type Resize = {
  session: StudySession;
  edge: 'start' | 'end';
  y: number;
  minutes: number;
  preview: number;
};

// Coarse pointers (phones, tablets) move cards with a held touch, never with native drag.
const finePointer = () => typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: coarse)').matches;
/** Minutes from midnight the hours open at: now on today, else the first session, else the morning. */
const openingMinute = (minutes: { now: number | null; first: number | null }) =>
  minutes.now !== null ? Math.max(0, minutes.now - 60) : minutes.first !== null ? Math.max(0, minutes.first - 30) : 8 * 60;

export default function PlannerCalendar({ mode, onCreateSession, initialDate, tagId, onViewChange }: Props) {
  const t = useTerms();
  const text = useText().planner;
  const planner = usePlannerCalendar(mode, initialDate, tagId);
  const { days, timezone, query, pending } = planner;
  const weekly = mode === 'weekly';
  const monthly = mode === 'monthly';
  const hourHeight = weekly ? 48 : 64;
  const [canNativeDrag] = useState(finePointer);
  const history = useHistoryDepth();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [lift, setLift] = useState<Lift | null>(null);
  const liftRef = useRef<Lift | null>(null);
  const updateLift = (next: Lift | null) => {
    liftRef.current = next;
    setLift(next);
  };
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [resize, setResize] = useState<Resize | null>(null);
  const [actions, setActions] = useState<SessionActionsAnchor | null>(null);
  const [hoverDirection, setHoverDirection] = useState<number | null>(null);
  const suppressClickUntil = useRef(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  // The ref is the source of truth for native listeners; the state only re-renders.
  const draftRef = useRef<Draft | null>(null);
  const updateDraft = (next: Draft | null) => {
    draftRef.current = next;
    setDraft(next);
  };
  const regionRef = useRef<HTMLDivElement | null>(null);
  const attachRegion = useCallback((element: HTMLDivElement | null) => {
    regionRef.current = element;
    if (!element) return;
    initializeCalendarViewport(element);
    // Once a touch selects time or lifts a card, its moves must not scroll; only a non-passive listener can stop that.
    const hold = (event: TouchEvent) => {
      if (draftRef.current?.active || liftRef.current?.active) event.preventDefault();
    };
    element.addEventListener('touchmove', hold, { passive: false });
    return () => {
      element.removeEventListener('touchmove', hold);
      regionRef.current = null;
    };
  }, []);
  const [expanded, setExpanded] = useState(false);
  const enteredFullscreen = useRef(false);
  // Whether browser full screen is still wanted when its asynchronous request settles.
  const wantFullscreen = useRef(false);
  const dateKey = format(days[0], 'yyyy-MM-dd');
  const sessionActionRefs = useRef(new Map<string, HTMLButtonElement>());
  const todayButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusId = useRef<number | null>(null);
  const movingOpen = !!planner.moving;
  useEffect(() => {
    if (movingOpen || pending || restoreFocusId.current === null) return;
    const id = restoreFocusId.current;
    // Wait for the closed dialog's passive cleanup before restoring focus.
    const frame = window.requestAnimationFrame(() => {
      const target =
        [...sessionActionRefs.current.entries()].find(([key]) =>
          key.startsWith(`${id}:`),
        )?.[1] ?? todayButtonRef.current;
      target?.focus();
      restoreFocusId.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [movingOpen, pending]);
  const slotHelpId = useId();
  const slotRefs = useRef(new Map<string, HTMLButtonElement>());
  const [focusedSlot, setFocusedSlot] = useState('0:8');
  const sessions = query.data ?? [];
  const daySegments = buildDaySegments(
    days,
    sessions,
    resize ? { sessionId: resize.session.id, minutes: resize.preview, edge: resize.edge } : null,
    timezone,
    hourHeight,
  );
  const minWidths = dayMinWidths(daySegments, weekly);
  const gridTemplateColumns = `64px ${minWidths.map((width) => `minmax(${width}px, 1fr)`).join(' ')}`;
  const occupiedSlots = occupiedSlotKeys(daySegments, hourHeight);
  const availableSlots = calendarHours.flatMap((hour) =>
    days.flatMap((_, day) =>
      occupiedSlots.has(`${day}:${hour}`) ? [] : [`${day}:${hour}`],
    ),
  );
  const activeSlot = availableSlots.includes(focusedSlot)
    ? focusedSlot
    : availableSlots[0];
  const navigateSlot = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    day: number,
    hour: number,
  ) => {
    const target = slotNavigationTarget(
      availableSlots,
      event.key,
      event.ctrlKey,
      day,
      hour,
    );
    if (target === undefined) return;
    event.preventDefault();
    const node = slotRefs.current.get(target ?? '');
    node?.focus();
    node?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const clearDrag = () => {
    setDrag(null);
    setDrop(null);
    setHoverDirection(null);
    suppressClickUntil.current = Date.now() + 150;
  };
  useEffect(() => {
    setDrag(null);
    setDrop(null);
    setResize(null);
    setActions(null);
  }, [timezone]);
  useEffect(() => {
    setResize(null);
    updateDraft(null);
    updateLift(null);
    setFocusedSlot('0:8');
  }, [dateKey, mode]);
  const draftId = draft?.pointerId;
  const draftOpen = !!draft;
  useEffect(() => {
    if (!draftOpen) return;
    const minuteAt = (current: Draft, clientY: number) =>
      current.pressed +
      ((clientY - current.y + (regionRef.current?.scrollTop ?? current.scroll) - current.scroll) / hourHeight) * 60;
    let lastY = draftRef.current?.y ?? 0;
    const follow = () => {
      const current = draftRef.current;
      if (current?.active) updateDraft({ ...current, pointer: minuteAt(current, lastY) });
    };
    const timer = window.setTimeout(() => {
      const current = draftRef.current;
      if (current && !current.active) updateDraft({ ...current, active: true });
    }, holdDelay);
    const move = (event: globalThis.PointerEvent) => {
      const current = draftRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      lastY = event.clientY;
      if (!current.active) {
        const distance = Math.hypot(event.clientX - current.x, event.clientY - current.y);
        // A touch that moves before the hold ends is a scroll; a mouse that moves is a selection.
        if (current.touch) {
          if (distance > 8) updateDraft(null);
          return;
        }
        if (distance < 4) return;
      }
      updateDraft({ ...current, active: true, pointer: minuteAt(current, event.clientY) });
    };
    const up = (event: globalThis.PointerEvent) => {
      const current = draftRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      updateDraft(null);
      if (!current.active) return;
      suppressClickUntil.current = Date.now() + 300;
      const { start, end } = draftRange(current.pressed, minuteAt(current, event.clientY));
      onCreateSession?.(new CalendarDate(days[current.day]), start, end - start);
    };
    const cancel = () => updateDraft(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    // A long touch may open the context menu; a selection keeps it closed.
    const menu = (event: Event) => {
      if (draftRef.current?.active) event.preventDefault();
    };
    // Near the top or bottom edge the hours scroll on their own, so a long span fits in one drag.
    let frame = 0;
    const edgeScroll = () => {
      const region = regionRef.current;
      const current = draftRef.current;
      if (region && current?.active) {
        const box = region.getBoundingClientRect();
        const step = !box.height ? 0 : lastY < box.top + 40 ? -8 : lastY > box.bottom - 24 ? 8 : 0;
        if (step) {
          region.scrollTop += step;
          follow();
        }
      }
      frame = window.requestAnimationFrame(edgeScroll);
    };
    frame = window.requestAnimationFrame(edgeScroll);
    const region = regionRef.current;
    region?.addEventListener('scroll', follow);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    window.addEventListener('contextmenu', menu);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      region?.removeEventListener('scroll', follow);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('contextmenu', menu);
    };
  }, [draftOpen, draftId, hourHeight, dateKey]);
  /** The hour cell under a point and the quarter hour a lifted card would start at there. */
  const dropAt = (x: number, y: number, offset: number): Drop | null => {
    const cell = document
      .elementsFromPoint(x, y)
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.hasAttribute('data-calendar-cell'));
    if (!cell) return null;
    const [day, hour] = (cell.dataset.calendarCell ?? '').split(':').map(Number);
    return { day, hour, minute: snappedDropMinute(hour, y - cell.getBoundingClientRect().top - offset, hourHeight) };
  };
  const liftId = lift?.pointerId;
  const liftOpen = !!lift;
  useEffect(() => {
    if (!liftOpen) return;
    let lastX = liftRef.current?.x ?? 0;
    let lastY = liftRef.current?.y ?? 0;
    const follow = () => {
      const current = liftRef.current;
      if (current?.active) setDrop(dropAt(lastX, lastY, current.offset));
    };
    const end = () => {
      updateLift(null);
      setDrag((previous) => (previous?.touch ? null : previous));
      setDrop(null);
    };
    const timer = window.setTimeout(() => {
      const current = liftRef.current;
      if (!current || current.active) return;
      updateLift({ ...current, active: true });
      setDrag({ session: current.session, offset: current.offset, touch: true });
    }, holdDelay);
    const move = (event: globalThis.PointerEvent) => {
      const current = liftRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      lastX = event.clientX;
      lastY = event.clientY;
      // Moving before the hold ends is a scroll of the hours, not a move of the card.
      if (!current.active) {
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) updateLift(null);
        return;
      }
      follow();
    };
    const up = (event: globalThis.PointerEvent) => {
      const current = liftRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const target = current.active ? dropAt(event.clientX, event.clientY, current.offset) : null;
      if (current.active) suppressClickUntil.current = Date.now() + 300;
      end();
      if (target && !pending) void planner.move(current.session, days[target.day], target.minute);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') end();
    };
    const menu = (event: Event) => {
      if (liftRef.current) event.preventDefault();
    };
    let frame = 0;
    const edgeScroll = () => {
      const region = regionRef.current;
      if (region && liftRef.current?.active) {
        const box = region.getBoundingClientRect();
        const step = !box.height ? 0 : lastY < box.top + 40 ? -8 : lastY > box.bottom - 24 ? 8 : 0;
        if (step) {
          region.scrollTop += step;
          follow();
        }
      }
      frame = window.requestAnimationFrame(edgeScroll);
    };
    frame = window.requestAnimationFrame(edgeScroll);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', end);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', end);
    window.addEventListener('contextmenu', menu);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', end);
      window.removeEventListener('contextmenu', menu);
    };
  }, [liftOpen, liftId, hourHeight, dateKey]);
  /** A new session on today at the next full hour when today is shown, else at 09:00 on the first shown day. */
  const newSession = () => {
    if (!onCreateSession || pending) return;
    const todayKey = format(planner.now, 'yyyy-MM-dd');
    const showsToday = days.some((day) => format(day, 'yyyy-MM-dd') === todayKey);
    const day = showsToday ? planner.now : monthly ? startOfMonth(planner.date) : days[0];
    onCreateSession(new CalendarDate(day), showsToday ? Math.min(23, planner.now.getHours() + 1) * 60 : 9 * 60);
  };
  const openDay = (day: Date) => {
    planner.setDate(new CalendarDate(day));
    onViewChange?.('daily');
  };
  // Fixed keys, the same in every language; re-subscribed each render so they always act on the current view.
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if (document.querySelector('[role="dialog"]') || draftRef.current || liftRef.current || drag || resize) return;
      const run = (action: () => unknown) => {
        event.preventDefault();
        void action();
      };
      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) {
        if (event.altKey || pending) return;
        if (key === 'z' && !event.shiftKey) run(planner.undo);
        else if (key === 'y' || (key === 'z' && event.shiftKey)) run(planner.redo);
        return;
      }
      if (event.altKey) return;
      if (event.key === '?') return run(() => setShortcutsOpen(true));
      if (event.shiftKey) return;
      if (key === 't') run(() => planner.setDate(planner.today()));
      // Arrows inside the hour grid move between free hours instead.
      else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !target?.closest('[data-calendar-grid]'))
        run(() => planner.navigate(event.key === 'ArrowLeft' ? -1 : 1));
      else if (onViewChange && (key === '1' || key === '2' || key === '3'))
        run(() => onViewChange((['daily', 'weekly', 'monthly'] as const)[Number(key) - 1]));
      else if (key === 'n' && onCreateSession) run(newSession);
      else if (key === 'f') run(toggleExpanded);
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  });
  const exitFullscreen = () => {
    wantFullscreen.current = false;
    if (enteredFullscreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    enteredFullscreen.current = false;
  };
  const toggleExpanded = () => {
    if (expanded) {
      exitFullscreen();
      setExpanded(false);
      return;
    }
    setExpanded(true);
    // The whole document goes full screen, so dialogs opened from the calendar stay visible; the page layer works without it.
    const request = document.documentElement.requestFullscreen as (() => Promise<void>) | undefined;
    if (request && !document.fullscreenElement) {
      wantFullscreen.current = true;
      void request.call(document.documentElement).then(
        () => {
          // Leaving before the browser answered: undo the full screen it has just granted.
          if (wantFullscreen.current) enteredFullscreen.current = true;
          else void document.exitFullscreen().catch(() => undefined);
        },
        () => undefined,
      );
    }
  };
  useEffect(() => {
    if (!expanded) return;
    const left = () => {
      // Leaving browser full screen (Esc, the browser's own control) also leaves the expanded calendar.
      if (enteredFullscreen.current && !document.fullscreenElement) {
        enteredFullscreen.current = false;
        setExpanded(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || draftRef.current) return;
      if (document.querySelector('[role="dialog"]')) return;
      exitFullscreen();
      setExpanded(false);
    };
    document.addEventListener('fullscreenchange', left);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('fullscreenchange', left);
      window.removeEventListener('keydown', key);
    };
  }, [expanded]);
  // Leaving the planner never leaves the browser in full screen.
  useEffect(() => exitFullscreen, []);
  useEffect(() => {
    if (!drag) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearDrag();
    };
    // Switching the week mid-drag can unmount the dragged card, and then its dragend never reaches React.
    // The browser sends no mouse events while a drag runs, so the first move with no button held means it ended.
    const settle = (event: globalThis.MouseEvent) => {
      if (event.buttons === 0) clearDrag();
    };
    window.addEventListener('keydown', cancel);
    window.addEventListener('mousemove', settle);
    return () => {
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('mousemove', settle);
    };
  }, [drag]);
  useEffect(() => {
    if (hoverDirection === null || !drag) return;
    const timer = window.setTimeout(() => {
      planner.navigate(hoverDirection);
      setDrop(null);
      setHoverDirection(null);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [hoverDirection, drag, dateKey]);
  useEffect(() => {
    if (!resize) return;
    const initial = resize;
    // Pulling the top edge down shortens the session, so its movement counts the other way.
    const length = (clientY: number) =>
      resizedDuration(
        initial.minutes,
        (initial.edge === 'start' ? -1 : 1) * (clientY - initial.y),
        hourHeight,
      );
    const move = (event: globalThis.PointerEvent) =>
      setResize((previous) =>
        previous ? { ...previous, preview: length(event.clientY) } : null,
      );
    const up = (event: globalThis.PointerEvent) => {
      setResize(null);
      suppressClickUntil.current = Date.now() + 150;
      const minutes = length(event.clientY);
      if (minutes !== initial.minutes) void planner.resize(initial.session, minutes, initial.edge);
    };
    const cancel = () => setResize(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
    };
  }, [resize?.session.id, hourHeight, timezone, dateKey]);

  const beginDrag = (
    event: DragEvent<HTMLDivElement>,
    session: StudySession,
  ) => {
    if (pending || !canRepositionSession(session)) {
      event.preventDefault();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    // A press on either edge belongs to a resize, never to a move.
    if (
      (event.currentTarget.querySelector('[data-resize-handle="end"]') && offset >= rect.height - 6) ||
      (event.currentTarget.querySelector('[data-resize-handle="start"]') && offset <= 6)
    ) {
      event.preventDefault();
      return;
    }
    setDrag({ session, offset: event.clientY - rect.top });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(session.id));
  };
  const dragOver = (
    event: DragEvent<HTMLDivElement>,
    day: number,
    hour: number,
  ) => {
    if (!drag || pending) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const minute = snappedDropMinute(
      hour,
      event.clientY -
        event.currentTarget.getBoundingClientRect().top -
        drag.offset,
      hourHeight,
    );
    setDrop({ day, hour, minute });
  };
  const dropSession = (
    event: DragEvent<HTMLDivElement>,
    day: number,
    hour: number,
  ) => {
    event.preventDefault();
    if (!drag || pending) return;
    const minute = snappedDropMinute(
      hour,
      event.clientY -
        event.currentTarget.getBoundingClientRect().top -
        drag.offset,
      hourHeight,
    );
    void planner.move(drag.session, days[day], minute);
    clearDrag();
  };
  const beginResize = (
    event: PointerEvent<HTMLDivElement>,
    session: StudySession,
    edge: 'start' | 'end',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending || !canRepositionSession(session)) return;
    const minutes = sessionMinutes(session);
    setResize({ session, edge, y: event.clientY, minutes, preview: minutes });
  };
  const pressCard = (event: PointerEvent<HTMLDivElement>, session: StudySession) => {
    if (pending || drag || resize || liftRef.current || !canRepositionSession(session)) return;
    updateLift({
      session,
      offset: event.clientY - event.currentTarget.getBoundingClientRect().top,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: false,
    });
  };
  const openActions = (
    event: MouseEvent<HTMLElement>,
    session: StudySession,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    // A long touch that lifted the card is a move, not a request for the menu.
    if (liftRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setActions({
      session,
      x: Math.max(
        8,
        Math.min(event.clientX || rect.left, window.innerWidth - 232),
      ),
      y: Math.max(
        8,
        Math.min(event.clientY || rect.bottom, window.innerHeight - 260),
      ),
    });
  };
  const create = (day: number, hour: number) => {
    if (pending || resize || drag || Date.now() < suppressClickUntil.current)
      return;
    onCreateSession?.(new CalendarDate(days[day]), hour * 60);
  };
  const beginDraft = (
    event: PointerEvent<HTMLDivElement>,
    day: number,
    hour: number,
  ) => {
    if (!onCreateSession || pending || drag || resize || draftRef.current) return;
    if (event.button !== 0 || (event.target as Element).closest('[data-calendar-card]')) return;
    const touch = event.pointerType === 'touch';
    // A mouse press would otherwise start selecting the hour labels as text.
    if (!touch) event.preventDefault();
    const minute =
      hour * 60 +
      ((event.clientY - event.currentTarget.getBoundingClientRect().top) / hourHeight) * 60;
    updateDraft({
      day,
      pressed: minute,
      pointer: minute,
      x: event.clientX,
      y: event.clientY,
      scroll: regionRef.current?.scrollTop ?? 0,
      pointerId: event.pointerId,
      touch,
      active: false,
    });
  };
  const draftSpan = draft?.active ? draftRange(draft.pressed, draft.pointer) : null;
  const todayIndex = days.findIndex((day) => format(day, 'yyyy-MM-dd') === format(planner.now, 'yyyy-MM-dd'));
  const firstMinutes = daySegments.flatMap((segments) =>
    segments.filter(({ session }) => session.status !== 'cancelled').map(({ segment }) => segment.hour * 60 + (segment.top / hourHeight) * 60),
  );
  const opening = openingMinute({
    now: todayIndex >= 0 ? planner.now.getHours() * 60 + planner.now.getMinutes() : null,
    first: firstMinutes.length ? Math.min(...firstMinutes) : null,
  });
  const shiftDragged = (direction: number) => {
    if (!drag) return;
    void planner.move(
      drag.session,
      addDays(
        calendarViewDate(drag.session.startTime, timezone),
        direction * days.length,
      ),
    );
    clearDrag();
  };

  return (
    <div
      className={
        expanded
          ? 'fixed inset-0 z-45 flex flex-col gap-3 overscroll-contain bg-(--canvas) p-3 sm:p-5'
          : 'flex flex-col gap-4'
      }
      aria-busy={pending}
      data-calendar-expanded={expanded || undefined}
    >
      <CalendarToolbar
        mode={mode}
        date={planner.date}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        canUndo={history.undo > 0}
        canRedo={history.redo > 0}
        onUndo={() => void planner.undo()}
        onRedo={() => void planner.redo()}
        onShortcuts={() => setShortcutsOpen(true)}
        onViewChange={onViewChange}
        days={days}
        pending={pending}
        dragging={!!drag}
        todayButtonRef={todayButtonRef}
        onNavigate={planner.navigate}
        onToday={() => planner.setDate(planner.today())}
        onHoverDirection={setHoverDirection}
        onDropOnNavigation={clearDrag}
      />
      {onCreateSession && (
        <p id={slotHelpId} className="sr-only">
          {text.slotHelp(t)}
        </p>
      )}
      {query.isError ? (
        <div role="alert" className="panel p-6 text-center">
          <p>{text.loadFailed}</p>
          <button
            className="btn btn-secondary mt-3"
            onClick={() => void query.refetch()}
          >
            {text.retry}
          </button>
        </div>
      ) : query.isPending ? (
        <p role="status" className="panel p-6">
          {text.calendarLoading}
        </p>
      ) : monthly ? (
        <MonthGrid
          days={days}
          month={planner.date}
          now={planner.now}
          sessions={sessions}
          timezone={timezone}
          pending={pending}
          canDrag={canNativeDrag}
          onOpenDay={openDay}
          onCreate={onCreateSession ? (day) => onCreateSession(new CalendarDate(day), 9 * 60) : undefined}
          onEdit={(session) => {
            if (!pending) planner.setEditing(session);
          }}
          onActions={openActions}
          onMove={(session, day) => void planner.move(session, day)}
        />
      ) : (
        <div className={`panel overflow-hidden ${expanded ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
          <div
            role="region"
            className={`relative overflow-auto select-none [-webkit-touch-callout:none] ${expanded ? 'min-h-0 flex-1' : 'h-[calc(100dvh-13rem)] min-h-[420px]'}`}
            tabIndex={0}
            aria-label={text.scrollRegion(weekly)}
            data-calendar-grid
            data-opening-minute={opening}
            ref={attachRegion}
          >
            <div
              style={{
                minWidth:
                  64 + minWidths.reduce((total, width) => total + width, 0),
                paddingBottom: calendarCardMinHeight + 8,
              }}
            >
              <div
                data-calendar-header
                className="sticky top-0 z-40 grid border-b border-(--line) bg-(--surface)"
                style={{
                  gridTemplateColumns,
                }}
              >
                <div className="flex items-center justify-center border-r border-(--line)">
                  <Clock className="h-4 w-4 text-(--muted)" />
                </div>
                {days.map((day) => (
                  <div
                    key={day.getTime()}
                    className={`p-3 text-center text-xs ${format(day, 'yyyy-MM-dd') === format(planner.now, 'yyyy-MM-dd') ? 'bg-(--subtle)' : ''}`}
                  >
                    <p className="font-medium">{format(day, 'EEEE')}</p>
                    <p className="mt-1 text-(--muted)">
                      {format(day, 'd MMM')}
                    </p>
                  </div>
                ))}
              </div>
              {calendarHours.map((hour) => (
                <div
                  key={hour}
                  data-calendar-hour={hour}
                  className="grid border-b border-(--line)"
                  style={{
                    gridTemplateColumns,
                    height: hourHeight,
                  }}
                >
                  <div className="flex items-start justify-center border-r border-(--line) bg-(--subtle) pt-2 text-[11px] tabular-nums text-(--muted)">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {days.map((day, index) => {
                    const segments = daySegments[index].filter(
                      ({ segment }) => segment.hour === hour,
                    );
                    const current =
                      format(day, 'yyyy-MM-dd') ===
                        format(planner.now, 'yyyy-MM-dd') &&
                      planner.now.getHours() === hour;
                    const occupied = occupiedSlots.has(`${index}:${hour}`);
                    return (
                      <div
                        key={day.getTime()}
                        data-calendar-slot={`${format(day, 'yyyy-MM-dd')}T${String(hour).padStart(2, '0')}:00`}
                        data-calendar-cell={`${index}:${hour}`}
                        className="relative border-r border-(--line) hover:bg-(--subtle)"
                        onDragOver={(event) => dragOver(event, index, hour)}
                        onDragLeave={() => setDrop(null)}
                        onDrop={(event) => dropSession(event, index, hour)}
                        onPointerDown={(event) => beginDraft(event, index, hour)}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-(--line) opacity-50" />
                        {!occupied && onCreateSession && (
                          <button
                            ref={(node) => {
                              const key = `${index}:${hour}`;
                              if (node) slotRefs.current.set(key, node);
                              else slotRefs.current.delete(key);
                            }}
                            tabIndex={
                              activeSlot === `${index}:${hour}` ? 0 : -1
                            }
                            aria-describedby={slotHelpId}
                            onFocus={() => setFocusedSlot(`${index}:${hour}`)}
                            onKeyDown={(event) =>
                              navigateSlot(event, index, hour)
                            }
                            disabled={pending}
                            aria-label={text.addAt(t, format(day, 'd MMMM'), String(hour).padStart(2, '0'))}
                            className="absolute inset-0 flex items-center justify-center text-(--muted) opacity-100 sm:opacity-0 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
                            style={{ scrollMarginTop: 56 }}
                            onClick={() => create(index, hour)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                        {current && (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 z-30 border-t border-red-500"
                            style={{
                              top: (planner.now.getMinutes() / 60) * hourHeight,
                            }}
                          />
                        )}
                        {draftSpan && draft?.day === index && Math.floor(draftSpan.start / 60) === hour && (
                          <div
                            aria-hidden="true"
                            data-calendar-draft
                            className="pointer-events-none absolute inset-x-1 z-20 overflow-hidden rounded-sm border border-l-[3px] border-primary-600 bg-(--surface) px-1.5 py-0.5 text-primary-600 shadow-md"
                            style={{
                              top: ((draftSpan.start - hour * 60) / 60) * hourHeight,
                              height: ((draftSpan.end - draftSpan.start) / 60) * hourHeight,
                            }}
                          >
                            <span className="text-[11px] font-medium tabular-nums">
                              {clockText(draftSpan.start)} – {clockText(draftSpan.end)}
                            </span>
                          </div>
                        )}
                        {drag && drop?.day === index && drop.hour === hour && (
                          <div
                            className="pointer-events-none absolute inset-x-1 z-20 rounded-sm border border-dashed border-(--muted) bg-(--subtle) opacity-70"
                            style={{
                              top:
                                ((drop.minute - hour * 60) / 60) * hourHeight,
                              height: Math.max(
                                20,
                                (sessionMinutes(drag.session) / 60) *
                                  hourHeight,
                              ),
                            }}
                          >
                            <span className="p-1 text-[10px] tabular-nums">
                              {String(Math.floor(drop.minute / 60)).padStart(
                                2,
                                '0',
                              )}
                              :{String(drop.minute % 60).padStart(2, '0')}
                            </span>
                          </div>
                        )}
                        {segments.map(
                          ({ session, preview, segment, placement }) => (
                            <CalendarSessionCard
                              key={session.id}
                              actionRef={(node) => {
                                const key = `${session.id}:${format(day, 'yyyy-MM-dd')}:${hour}`;
                                if (node)
                                  sessionActionRefs.current.set(key, node);
                                else sessionActionRefs.current.delete(key);
                              }}
                              session={preview}
                              timezone={timezone}
                              top={segment.top}
                              height={placement.height}
                              lane={placement.lane}
                              laneCount={placement.laneCount}
                              pending={pending}
                              dragging={drag?.session.id === session.id}
                              resizing={resize?.session.id === session.id}
                              canDrag={segment.startsHere && canNativeDrag}
                              canResize={
                                segment.endsHere && placement.height >= 36
                              }
                              canResizeStart={
                                segment.startsHere && placement.height >= 36
                              }
                              onDragStart={(event) => beginDrag(event, session)}
                              onDragEnd={clearDrag}
                              onResize={(event, edge) => beginResize(event, session, edge)}
                              onTouchPress={(event) => {
                                if (segment.startsHere) pressCard(event, session);
                              }}
                              onEdit={() => {
                                if (
                                  !pending &&
                                  !resize &&
                                  Date.now() >= suppressClickUntil.current
                                )
                                  planner.setEditing(session);
                              }}
                              onActions={(event) => openActions(event, session)}
                              onStart={() => void planner.startSession(session)}
                              onPause={() =>
                                planner.setConfirmation({
                                  session,
                                  action: 'pause',
                                })
                              }
                              onComplete={() =>
                                planner.setConfirmation({
                                  session,
                                  action: 'complete',
                                })
                              }
                              onTimer={() => planner.openTimer(session)}
                            />
                          ),
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {drag && !drag.touch && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-3">
          {[-1, 1].map((direction) => (
            <div
              key={direction}
              className="panel border-dashed px-5 py-3 text-sm"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                shiftDragged(direction);
              }}
            >
              {text.dropTo(weekly, direction)}
            </div>
          ))}
        </div>
      )}
      <SessionActionsMenu
        anchor={actions}
        onClose={() => setActions(null)}
        onEdit={planner.setEditing}
        onOpenTimer={planner.openTimer}
        onMove={planner.setMoving}
        onDuplicate={(session) => void planner.duplicate(session)}
        onDelete={(session) =>
          planner.setConfirmation({ session, action: 'delete' })
        }
      />
      <PomodoroModal
        isOpen={!!planner.timer}
        onClose={() => {
          planner.setTimer(null);
          planner.setMinimized(false);
        }}
        session={
          sessions.find((session) => session.id === planner.timer?.id) ??
          planner.timer
        }
        isMinimized={planner.minimized}
        onToggleMinimize={() => planner.setMinimized(!planner.minimized)}
      />
      <CreateSessionModal
        isOpen={!!planner.editing}
        editSession={planner.editing}
        onClose={() => planner.setEditing(null)}
      />
      <MoveSessionModal
        isOpen={!!planner.moving}
        onClose={() => {
          if (!pending) {
            restoreFocusId.current = planner.moving?.id ?? null;
            planner.setMoving(null);
          }
        }}
        sourceUnavailable={
          query.isError ||
          (!!planner.moving &&
            !sessions.some((session) => session.id === planner.moving!.id))
        }
        onReload={() => void planner.reloadMoving()}
        sessionDuration={planner.moving ? sessionMinutes(planner.moving) : 60}
        onSelectDate={(date, changes) =>
          planner.moving
            ? planner.move(
                planner.moving,
                date,
                changes?.minute,
                changes?.duration,
              )
            : false
        }
        pending={pending || query.isFetching}
        sessionTitle={planner.moving?.title ?? ''}
        currentDate={
          planner.moving
            ? calendarViewDate(planner.moving.startTime, timezone)
            : planner.date
        }
      />
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      <ConfirmDialog
        isOpen={!!planner.confirmation}
        onClose={() => {
          if (!pending) planner.setConfirmation(null);
        }}
        onConfirm={planner.confirm}
        title={
          planner.confirmation?.action === 'pause'
            ? text.confirmPause(t)
            : planner.confirmation?.action === 'complete'
              ? text.confirmComplete(t)
              : text.confirmDelete(t)
        }
        message={
          planner.confirmation?.action === 'delete'
            ? text.deleteMessage(t, planner.confirmation.session.title, canRecreate(planner.confirmation.session))
            : text.confirmQuestion
        }
        type={planner.confirmation?.action === 'delete' ? 'danger' : 'info'}
      />
    </div>
  );
}
