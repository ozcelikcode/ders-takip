import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlannerNavigationProps {
  activeView: 'weekly' | 'daily';
  onViewChange: (view: 'weekly' | 'daily') => void;
}

const PlannerNavigation: React.FC<PlannerNavigationProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <button
        onClick={() => onViewChange('weekly')}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeView === 'weekly'
            ? 'text-sky-700 dark:text-sky-300'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
      >
        {activeView === 'weekly' && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-600/50"
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Haftalık Görünüm
        </span>
      </button>

      <button
        onClick={() => onViewChange('daily')}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeView === 'daily'
            ? 'text-sky-700 dark:text-sky-300'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
      >
        {activeView === 'daily' && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-600/50"
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Günlük Görünüm
        </span>
      </button>
    </div>
  );
};

export default PlannerNavigation;