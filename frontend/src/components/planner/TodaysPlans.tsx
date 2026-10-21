import { useTerms } from '../../hooks/useTerms';
import { calendarViewDate, formatZonedTime } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  ChevronDown,
  Pencil,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Check,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { studySessionsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { StudySession } from '../../types/planner';
import { canStartSession, isSessionMissed } from '../../utils/sessionHelpers';
import {
  sessionStatusLabels,
  sessionTypeLabels,
} from '../../utils/sessionPresentation';
import ConfirmDialog from '../common/ConfirmDialog';
import CreateSessionModal from './CreateSessionModal';
import PomodoroModal from './PomodoroModal';

type Confirmation = {
  session: StudySession;
  action: 'pause' | 'complete' | 'reopen';
};
export default function TodaysPlans() {
  const t = useTerms();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const [expanded, setExpanded] = useState(false);
  const [editor, setEditor] = useState<{
    date: Date;
    session: StudySession | null;
  } | null>(null);
  const [timer, setTimer] = useState<StudySession | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const mutation = useAccountMutation([keys.sessions()]);
  const query = useQuery({
    queryKey: keys.sessions('todays-sessions', today),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        startDate: today,
        endDate: today,
        timezone,
      });
      if (!response.data.data?.sessions)
        throw new Error('Today sessions response is missing');
      return response.data.data.sessions;
    },
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const sessions = [...(query.data ?? [])].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  );
  const completed = sessions.filter(
    (session) => session.status === 'completed',
  ).length;
  const busy = mutation.isPending || query.isFetching;
  const perform = (operation: () => Promise<unknown>, message: string) =>
    mutation.save(async () => {
      const epoch = useAuthStore.getState().epoch;
      try {
        await operation();
      } catch (error) {
        if (
          isAxiosError(error) &&
          error.response?.status === 409 &&
          epoch === useAuthStore.getState().epoch
        )
          await query.refetch();
        throw error;
      }
    }, message);
  const start = async (session: StudySession) => {
    if (busy || !canStartSession(session)) return;
    mutation.clearError();
    if (session.sessionType === 'pomodoro') {
      setTimer(session);
      return;
    }
    await perform(
      () => studySessionsAPI.startSession(session),
      `${t.session({ capitalize: true })} başlatıldı.`,
    );
  };
  const requestConfirmation = (
    session: StudySession,
    action: Confirmation['action'],
  ) => {
    mutation.clearError();
    setConfirmation({ session, action });
  };
  const current =
    confirmation &&
    query.data?.find((session) => session.id === confirmation.session.id);
  const confirm = async () => {
    if (!confirmation || !current || busy || query.isError) return false;
    const { action } = confirmation;
    const saved = await perform(
      () =>
        action === 'pause'
          ? studySessionsAPI.pauseSession(current)
          : action === 'complete'
            ? studySessionsAPI.completeSession(current)
            : studySessionsAPI.updateSession(current, { status: 'planned' }),
      action === 'reopen'
        ? `${t.session({ capitalize: true })} yeniden planlandı; çalışma geçmişi korundu.`
        : action === 'pause'
          ? `${t.session({ capitalize: true })} duraklatıldı.`
          : `${t.session({ capitalize: true })} tamamlandı.`,
    );
    if (saved) setConfirmation(null);
    return saved;
  };
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="today-sessions"
          onClick={() => setExpanded((value) => !value)}
          className="flex flex-wrap items-center gap-3 rounded-sm text-left"
        >
          <ChevronDown
            className={`h-4 w-4 text-(--muted) ${expanded ? 'rotate-180' : ''}`}
          />
          <span className="text-sm font-medium">Bugünün planları</span>
          {query.isSuccess && (
            <span className="text-xs text-(--muted)">
              {completed}/{sessions.length} tamamlandı
            </span>
          )}
        </button>
        <button
          className="btn btn-primary"
          disabled={mutation.isPending}
          onClick={() =>
            setEditor({
              date: calendarViewDate(new Date(), timezone),
              session: null,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Yeni {t.session()}
        </button>
      </div>
      {query.isPending ? (
        <p
          role="status"
          className="border-t px-4 py-4 text-sm text-(--muted)"
        >
          Bugünün planları yükleniyor…
        </p>
      ) : query.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 border-t p-4"
        >
          <p>Bugünün planları alınamadı.</p>
          <button
            className="btn btn-secondary"
            disabled={query.isFetching || mutation.isPending}
            onClick={() => void query.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        expanded && (
          <div
            id="today-sessions"
            className="border-t"
            aria-busy={query.isFetching}
          >
            {sessions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-(--muted)">
                Bugün için planlanmış {t.session()} yok.
              </p>
            ) : (
              <ul className="divide-y divide-(--line)">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-start justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="text-xs text-(--muted)">
                        {formatZonedTime(session.startTime, timezone)}–
                        {formatZonedTime(session.endTime, timezone)} · Plan:{' '}
                        {session.duration} dk ·{' '}
                        {sessionTypeLabels[session.sessionType]}
                      </p>
                      <h3 className="mt-1 wrap-break-word text-sm font-medium">
                        {session.title}
                      </h3>
                      {session.description && (
                        <p className="mt-1 wrap-break-word text-xs text-(--muted)">
                          {session.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="badge">
                          {sessionStatusLabels[session.status]}
                        </span>
                        {isSessionMissed(session) && (
                          <span className="text-xs text-(--muted)">
                            Planlanan bitiş saati geçti
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`${t.session({ case: 'acc', capitalize: true })} düzenle: ${session.title}`}
                        onClick={() =>
                          setEditor({
                            date: calendarViewDate(session.startTime, timezone),
                            session,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canStartSession(session) && (
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`${session.title}: ${session.sessionType === 'pomodoro' ? 'Pomodoro sayacını aç' : session.status === 'paused' ? 'Devam et' : 'Başlat'}`}
                          onClick={() => void start(session)}
                        >
                          {session.sessionType === 'pomodoro' ? (
                            <Timer className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <>
                          <button
                            className="icon-button"
                            disabled={busy}
                            aria-label={`${t.session({ case: 'acc', capitalize: true })} duraklat: ${session.title}`}
                            onClick={() =>
                              requestConfirmation(session, 'pause')
                            }
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                          <button
                            className="icon-button"
                            disabled={busy}
                            aria-label={`${t.session({ case: 'acc', capitalize: true })} tamamla: ${session.title}`}
                            onClick={() =>
                              requestConfirmation(session, 'complete')
                            }
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          {session.sessionType === 'pomodoro' && (
                            <button
                              className="icon-button"
                              disabled={busy}
                              aria-label={`${session.title}: Pomodoro sayacını aç`}
                              onClick={() => setTimer(session)}
                            >
                              <Timer className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      {(session.status === 'completed' ||
                        session.status === 'cancelled') && (
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`${t.session({ case: 'acc', capitalize: true })} yeniden planla: ${session.title}`}
                          onClick={() => requestConfirmation(session, 'reopen')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
      {!confirmation && mutation.errorMessage && (
        <p role="alert" className="border-t p-4 text-sm text-red-600">
          {mutation.errorMessage}
        </p>
      )}
      {confirmation && (
        <ConfirmDialog
          isOpen
          title={
            confirmation.action === 'pause'
              ? `${t.session({ case: 'acc', capitalize: true })} duraklat`
              : confirmation.action === 'complete'
                ? `${t.session({ case: 'acc', capitalize: true })} tamamla`
                : `${t.session({ case: 'acc', capitalize: true })} yeniden planla`
          }
          message={`“${confirmation.session.title}” ${confirmation.action === 'pause' ? 'duraklatılacak.' : confirmation.action === 'complete' ? 'tamamlandı olarak işaretlenecek.' : 'planlandı durumuna dönecek. Notlar ve ölçülen çalışma geçmişi korunur; çalışma kendiliğinden başlamaz.'}`}
          onClose={() => setConfirmation(null)}
          onConfirm={confirm}
        >
          {mutation.errorMessage && (
            <p role="alert" className="text-sm text-red-600">
              {mutation.errorMessage}
            </p>
          )}
          {!current && (
            <p role="alert">
              Bu {t.session()} artık listede bulunmuyor. Pencereyi kapatıp listeyi
              yenileyin.
            </p>
          )}
          {query.isError && (
            <p role="alert">
              Güncel {t.session({ plural: true })} alınamadı. Önce listeyi yeniden yükleyin.
            </p>
          )}
        </ConfirmDialog>
      )}
      {editor && (
        <CreateSessionModal
          isOpen
          selectedDate={editor.date}
          selectedHour={editor.date.getHours()}
          editSession={editor.session}
          onClose={() => setEditor(null)}
        />
      )}
      <PomodoroModal
        isOpen={!!timer}
        session={timer}
        onClose={() => setTimer(null)}
      />
    </div>
  );
}
