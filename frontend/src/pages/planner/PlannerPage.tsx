import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WeeklyPlanner from '../../components/planner/WeeklyPlanner';
import DailyCalendar from '../../components/planner/DailyCalendar';
import CreateSessionModal from '../../components/planner/CreateSessionModal';
import TodaysPlans from '../../components/planner/GoalsOverview';
import PlannerNavigation from '../../components/planner/PlannerNavigation';

const PlannerPage = () => {
  const [activeView, setActiveView] = useState<'weekly' | 'daily'>('weekly');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number>(9);

  const handleCreateSession = (date: Date, hour: number) => {
    console.log('Creating session for:', date, 'at hour:', hour);
    setSelectedDate(date);
    setSelectedHour(hour);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Today's Plans Section */}
      <TodaysPlans />

      {/* Planner Section */}
      <div className="space-y-6">
        {/* Modern Header with iOS-style navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent"
          >
            Planlayıcı
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PlannerNavigation
              activeView={activeView}
              onViewChange={setActiveView}
            />
          </motion.div>
        </div>

        {/* View Content with Smooth Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {activeView === 'weekly' ? (
              <WeeklyPlanner onCreateSession={handleCreateSession} />
            ) : (
              <DailyCalendar
                onCreateSession={handleCreateSession}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
      />
    </div>
  );
};

export default PlannerPage;