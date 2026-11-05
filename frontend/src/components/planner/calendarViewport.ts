/** Scrolls the hours to the minute the calendar should open at (`data-opening-minute`, 08:00 by default), under the sticky header. */
export const initializeCalendarViewport = (element: HTMLDivElement | null) => {
  if (!element) return;
  const minute = Number(element.dataset.openingMinute ?? 8 * 60);
  const row = element.querySelector<HTMLElement>(`[data-calendar-hour="${Math.floor(minute / 60)}"]`);
  const header = element.querySelector<HTMLElement>('[data-calendar-header]');
  if (row) element.scrollTop = row.offsetTop + ((minute % 60) / 60) * row.offsetHeight - (header?.offsetHeight || 0);
};
