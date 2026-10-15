import { Calendar, CalendarDays } from 'lucide-react';

interface PlannerNavigationProps {
  activeView: 'weekly' | 'daily';
  onViewChange: (view: 'weekly' | 'daily') => void;
}

const PlannerNavigation = ({ activeView, onViewChange }: PlannerNavigationProps) => (
  <div className="segmented-control" role="group" aria-label="Takvim görünümü">
    <button onClick={() => onViewChange('weekly')} aria-pressed={activeView === 'weekly'} className={`segment ${activeView === 'weekly' ? 'segment-active' : ''}`}><CalendarDays className="h-3.5 w-3.5" />Haftalık</button>
    <button onClick={() => onViewChange('daily')} aria-pressed={activeView === 'daily'} className={`segment ${activeView === 'daily' ? 'segment-active' : ''}`}><Calendar className="h-3.5 w-3.5" />Günlük</button>
  </div>
);

export default PlannerNavigation;
