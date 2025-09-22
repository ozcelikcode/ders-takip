import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';

interface PlannerNavigationProps {
  activeView: 'weekly' | 'daily';
  onViewChange: (view: 'weekly' | 'daily') => void;
}

const PlannerNavigation: React.FC<PlannerNavigationProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => onViewChange('weekly')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeView === 'weekly'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        Haftalık Görünüm
      </button>

      <button
        onClick={() => onViewChange('daily')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeView === 'daily'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <Calendar className="w-4 h-4" />
        Günlük Görünüm
      </button>
    </div>
  );
};

export default PlannerNavigation;