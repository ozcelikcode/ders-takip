import { Calendar, CalendarDays } from 'lucide-react';
import { useText } from '../../store/languageStore';

interface PlannerNavigationProps {
  activeView: 'weekly' | 'daily';
  onViewChange: (view: 'weekly' | 'daily') => void;
}

const PlannerNavigation = ({ activeView, onViewChange }: PlannerNavigationProps) => {
  const text = useText().planner;
  return (
    <div className="segmented-control" role="group" aria-label={text.view}>
      <button onClick={() => onViewChange('weekly')} aria-pressed={activeView === 'weekly'} className={`segment ${activeView === 'weekly' ? 'segment-active' : ''}`}><CalendarDays className="h-3.5 w-3.5" />{text.weekly}</button>
      <button onClick={() => onViewChange('daily')} aria-pressed={activeView === 'daily'} className={`segment ${activeView === 'daily' ? 'segment-active' : ''}`}><Calendar className="h-3.5 w-3.5" />{text.daily}</button>
    </div>
  );
};

export default PlannerNavigation;
