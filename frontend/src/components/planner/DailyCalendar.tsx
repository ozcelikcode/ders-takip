import PlannerCalendar, { type PlannerCalendarProps } from './PlannerCalendar';

export default function DailyCalendar(props: PlannerCalendarProps) {
  return <PlannerCalendar {...props} mode="daily" />;
}
