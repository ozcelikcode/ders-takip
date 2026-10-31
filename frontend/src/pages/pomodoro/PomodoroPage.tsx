import { useTerms } from '../../hooks/useTerms';
import { addDateDays, dateKeyInZone, formatZonedTime } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import PomodoroTimer from '../../components/planner/PomodoroTimer';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { studySessionsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

export default function PomodoroPage() {
  const { session: sessionText, pomodoro: text } = useText();
  const t = useTerms();
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: keys.sessions('pomodoro-sessions', today),
    queryFn: async () => {
      // Unfinished sessions from any day (a running timer may have started before midnight) plus the last week's
      // history; the full history is never loaded here.
      const [open, recent] = await Promise.all([
        studySessionsAPI.getSessions({ sessionType: 'pomodoro', unfinished: 'true' }),
        studySessionsAPI.getSessions({ sessionType: 'pomodoro', startDate: addDateDays(today, -6), endDate: today }),
      ]);
      const byId = new Map([...(open.data.data?.sessions ?? []), ...(recent.data.data?.sessions ?? [])].map(session => [session.id, session]));
      return [...byId.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
  const sessions = query.data;
  useEffect(() => {
    if (!sessions || sessions.some(session => session.id === selectedId)) return;
    setSelectedId(sessions.find(session => session.status === 'in_progress')?.id ?? sessions.find(session => session.status === 'paused')?.id ?? sessions.find(session => session.status === 'planned')?.id ?? sessions[0]?.id ?? null);
  }, [sessions, selectedId]);
  const selected = sessions?.find(session => session.id === selectedId);
  return (
    <div className="space-y-6">
      <PageHeader title={text.pageTitle} description={text.pageDescription(t)} actions={<Link className="btn btn-secondary" to="/planner">{text.plan(t)}</Link>} />
      {query.isPending ? <p role="status">{text.listLoading(t)}</p> : query.isError ? <p role="alert">{text.listFailed(t)} <button className="underline" onClick={() => void query.refetch()}>{text.retry}</button></p> : !sessions?.length ? (
        <div className="panel p-12 text-center"><h2 className="text-lg font-medium">{text.emptyTitle(t)}</h2><p className="mt-2 text-sm text-(--muted)">{text.emptyHint(t)}</p></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="panel p-4" aria-label={text.listLabel(t)}>
            <h2 className="mb-3 text-sm font-medium">{text.listTitle(t)}</h2>
            <div className="max-h-[640px] space-y-2 overflow-y-auto">
              {sessions.map(session => <button key={session.id} className={`w-full rounded-md border p-3 text-left ${selectedId === session.id ? 'border-(--muted) bg-(--subtle)' : 'border-transparent hover:border-(--line)'}`} onClick={() => setSelectedId(session.id)} aria-pressed={selectedId === session.id}>
                <span className="block text-sm font-medium">{session.title}</span>
                <span className="mt-1 block text-xs text-(--muted)">{dateKeyInZone(new Date(session.startTime), timezone)} · {formatZonedTime(session.startTime, timezone)} · {sessionText.statuses[session.status]}</span>
              </button>)}
            </div>
          </section>
          <div className="panel p-6 sm:p-8 lg:col-span-2">{selected ? <PomodoroTimer key={selected.id} session={selected} /> : <p>{text.choose(t)}</p>}</div>
        </div>
      )}
    </div>
  );
}
