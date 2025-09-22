import React, { useState } from 'react';
import WeeklyPlanner from '../../components/planner/WeeklyPlanner';
import DailyCalendar from '../../components/planner/DailyCalendar';
import CreateSessionModal from '../../components/planner/CreateSessionModal';
import GoalsOverview from '../../components/planner/GoalsOverview';
import PlannerNavigation from '../../components/planner/PlannerNavigation';
import PomodoroModal from '../../components/planner/PomodoroModal';
import { StudySession } from '../../types/planner';

const PlannerPage = () => {
  const [activeView, setActiveView] = useState<'weekly' | 'daily'>('weekly');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);

  const handleCreateSession = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setIsCreateModalOpen(true);
  };

  const handleSessionClick = (session: StudySession) => {
    if (session.sessionType === 'pomodoro') {
      setActiveSession(session);
      setIsPomodoroModalOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      <GoalsOverview />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Planlayıcı
          </h1>
          <PlannerNavigation
            activeView={activeView}
            onViewChange={setActiveView}
          />
        </div>

        {activeView === 'weekly' ? (
          <WeeklyPlanner onCreateSession={handleCreateSession} />
        ) : (
          <DailyCalendar
            onCreateSession={handleCreateSession}
            onSessionClick={handleSessionClick}
          />
        )}
      </div>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
      />

      <PomodoroModal
        isOpen={isPomodoroModalOpen}
        onClose={() => {
          setIsPomodoroModalOpen(false);
          setActiveSession(null);
        }}
        session={activeSession}
      />
    </div>
  );
};

export default PlannerPage;