import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calendarDateSchema, type SeriesRecord } from '@study-tracker/contracts';
import { History, Repeat } from 'lucide-react';
import PlannerCalendar from '../../components/planner/PlannerCalendar';
import CreateSessionModal from '../../components/planner/CreateSessionModal';
import TodaysPlans from '../../components/planner/TodaysPlans';
import type { CalendarMode } from '../../components/planner/calendarGeometry';
import PageHeader from '../../components/common/PageHeader';
import RoutinesDialog from '../../components/planner/RoutinesDialog';
import LogStudyDialog from '../../components/planner/LogStudyDialog';
import TagFilter from '../../components/tags/TagFilter';
import { useText } from '../../store/languageStore';

const PlannerPage = () => {
  const text = useText().planner;
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const [activeView, setActiveView] = useState<CalendarMode>(() => window.matchMedia('(max-width: 639px)').matches ? 'daily' : 'weekly');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMinute, setSelectedMinute] = useState(9 * 60);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [routinesOpen, setRoutinesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [tagId, setTagId] = useState<number | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<SeriesRecord | null>(null);
  const requested = useSearchParams()[0].get('date');
  const initialDate = calendarDateSchema.safeParse(requested).success ? requested ?? undefined : undefined;

  const handleCreateSession = (date: Date, minute: number, duration = 60) => {
    setSelectedDate(date);
    setSelectedMinute(minute);
    setSelectedDuration(duration);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-7">
      <PageHeader title={text.title} description={text.description(timezone)}
        actions={<div className="flex flex-wrap items-center gap-2">
          <TagFilter value={tagId} onChange={setTagId} />
          <button type="button" className="btn btn-secondary" onClick={() => setLogOpen(true)}><History className="h-4 w-4" />{text.logStudy}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setRoutinesOpen(true)}><Repeat className="h-4 w-4" />{text.routines}</button>
        </div>} />
      <TodaysPlans />
      {/* One calendar for every view: switching keeps the shown date, full screen and the undo history. */}
      <section aria-label={activeView === 'monthly' ? text.monthlyCalendar : activeView === 'weekly' ? text.weeklyCalendar : text.dailyCalendar}>
        <PlannerCalendar key={`${timezone}:${initialDate}`} mode={activeView} initialDate={initialDate} tagId={tagId} onCreateSession={handleCreateSession} onViewChange={setActiveView} />
      </section>
      <CreateSessionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} selectedDate={selectedDate} selectedMinute={selectedMinute} selectedDuration={selectedDuration} />
      {logOpen && <LogStudyDialog onClose={() => setLogOpen(false)} />}
      {routinesOpen && <RoutinesDialog onClose={() => setRoutinesOpen(false)} onEdit={(series) => { setRoutinesOpen(false); setEditingRoutine(series); }} />}
      <CreateSessionModal isOpen={!!editingRoutine} onClose={() => setEditingRoutine(null)} editSeries={editingRoutine} />
    </div>
  );
};

export default PlannerPage;
