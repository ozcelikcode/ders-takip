export const initializeCalendarViewport = (element: HTMLDivElement | null) => {
  if (!element) return;
  const firstHour = element.querySelector<HTMLElement>('[data-calendar-hour="8"]');
  const header = element.querySelector<HTMLElement>('[data-calendar-header]');
  if (firstHour) element.scrollTop = firstHour.offsetTop - (header?.offsetHeight || 0);
};
