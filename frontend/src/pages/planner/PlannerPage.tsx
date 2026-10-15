import { useState } from 'react';
import WeeklyPlanner from '../../components/planner/WeeklyPlanner';
import DailyCalendar from '../../components/planner/DailyCalendar';
import CreateSessionModal from '../../components/planner/CreateSessionModal';
import TodaysPlans from '../../components/planner/GoalsOverview';
import PlannerNavigation from '../../components/planner/PlannerNavigation';
import PageHeader from '../../components/common/PageHeader';

const PlannerPage = () => {
  const [activeView, setActiveView] = useState<'weekly' | 'daily'>(() => window.matchMedia('(max-width: 639px)').matches ? 'daily' : 'weekly');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState(9);

  const handleCreateSession = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-7">
      <PageHeader title="Planlayıcı" description="Zamanına yer aç. Çalışmalarını tek bir takvimde düzenle."
        actions={<PlannerNavigation activeView={activeView} onViewChange={setActiveView} />} />
      <TodaysPlans />
      <section aria-label={activeView === 'weekly' ? 'Haftalık takvim' : 'Günlük takvim'}>
        {activeView === 'weekly' ? <WeeklyPlanner onCreateSession={handleCreateSession} /> : <DailyCalendar onCreateSession={handleCreateSession} />}
      </section>
      <CreateSessionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} selectedDate={selectedDate} selectedHour={selectedHour} />
    </div>
  );
};

export default PlannerPage;
