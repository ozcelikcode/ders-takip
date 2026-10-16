import PlannerCalendar, { type PlannerCalendarProps } from './PlannerCalendar';

export default function WeeklyPlanner(props: PlannerCalendarProps) {
  return <PlannerCalendar {...props} mode="weekly" />;
}
