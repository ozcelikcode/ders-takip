import { useTerms } from '../../hooks/useTerms';
import { dateKeyInZone, formatZonedTime } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import PomodoroTimer from '../../components/planner/PomodoroTimer';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { studySessionsAPI } from '../../services/api';

const statusLabels = { planned: 'Planlandı', in_progress: 'Devam ediyor', paused: 'Duraklatıldı', completed: 'Tamamlandı', cancelled: 'İptal edildi' };
export default function PomodoroPage() {
  const t = useTerms();
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: keys.sessions('pomodoro-sessions', today),
    queryFn: async () => {
      // Include unfinished sessions across midnight; today's list alone cannot recover a running timer.
      const response = await studySessionsAPI.getSessions({ sessionType: 'pomodoro' });
      return response.data.data?.sessions ?? [];
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
      <PageHeader title="Pomodoro" description={`Bir ${t.session()} seç. Tek bir işe odaklan, molalarla ritmini koru.`} actions={<Link className="btn btn-secondary" to="/planner">{t.session({ capitalize: true })} planla</Link>} />
      {query.isPending ? <p role="status">{t.session({ plural: true, capitalize: true })} yükleniyor…</p> : query.isError ? <p role="alert">{t.session({ plural: true, capitalize: true })} yüklenemedi. <button className="underline" onClick={() => void query.refetch()}>Tekrar dene</button></p> : !sessions?.length ? (
        <div className="panel p-12 text-center"><h2 className="text-lg font-medium">Pomodoro {t.session()} yok</h2><p className="mt-2 text-sm text-(--muted)">Planlayıcıdan Pomodoro türünde bir {t.session()} oluşturun.</p></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="panel p-4" aria-label={`Pomodoro ${t.session({ plural: true })}`}>
            <h2 className="mb-3 text-sm font-medium">{t.session({ plural: true, capitalize: true })}</h2>
            <div className="max-h-[640px] space-y-2 overflow-y-auto">
              {sessions.map(session => <button key={session.id} className={`w-full rounded-md border p-3 text-left ${selectedId === session.id ? 'border-(--muted) bg-(--subtle)' : 'border-transparent hover:border-(--line)'}`} onClick={() => setSelectedId(session.id)} aria-pressed={selectedId === session.id}>
                <span className="block text-sm font-medium">{session.title}</span>
                <span className="mt-1 block text-xs text-(--muted)">{dateKeyInZone(new Date(session.startTime), timezone)} · {formatZonedTime(session.startTime, timezone)} · {statusLabels[session.status]}</span>
              </button>)}
            </div>
          </section>
          <div className="panel p-6 sm:p-8 lg:col-span-2">{selected ? <PomodoroTimer key={selected.id} session={selected} /> : <p>Bir {t.session()} seçin.</p>}</div>
        </div>
      )}
    </div>
  );
}
