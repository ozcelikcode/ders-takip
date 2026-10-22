import { useTerms } from '../../hooks/useTerms';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Clock, Edit, MoveRight, Timer, Trash2, X } from 'lucide-react';
import type { StudySession } from '../../types/planner';
import { canRepositionSession } from './calendarGeometry';

export interface SessionActionsAnchor {
  session: StudySession;
  x: number;
  y: number;
}

interface SessionActionsMenuProps {
  anchor: SessionActionsAnchor | null;
  onClose: () => void;
  onEdit: (session: StudySession) => void;
  onOpenTimer: (session: StudySession) => void;
  onMove: (session: StudySession) => void;
  onDelete: (session: StudySession) => void;
}

const itemClass =
  'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-(--subtle)';

export default function SessionActionsMenu({
  anchor,
  onClose,
  onEdit,
  onOpenTimer,
  onMove,
  onDelete,
}: SessionActionsMenuProps) {
  const t = useTerms();
  const run = (action: (session: StudySession) => void) => () => {
    if (!anchor) return;
    action(anchor.session);
    onClose();
  };
  return (
    <Dialog open={!!anchor} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0" />
      {anchor && (
        <DialogPanel
          className="panel fixed w-56 p-2 shadow-lg"
          style={{ top: anchor.y, left: anchor.x }}
        >
          <DialogTitle className="px-2 py-1 text-xs text-(--muted)">
            {t.session({ capitalize: true })} işlemleri
          </DialogTitle>
          <button className={itemClass} onClick={run(onEdit)}>
            <Edit className="h-4 w-4" />
            Düzenle
          </button>
          {anchor.session.sessionType === 'pomodoro' && (
            <button className={itemClass} onClick={run(onOpenTimer)}>
              <Timer className="h-4 w-4" />
              Sayacı aç
            </button>
          )}
          <button
            disabled={!canRepositionSession(anchor.session)}
            className={`${itemClass} disabled:opacity-40`}
            onClick={run(onMove)}
          >
            <MoveRight className="h-4 w-4" />
            Tarihe taşı
          </button>
          <button
            disabled={!canRepositionSession(anchor.session)}
            className={`${itemClass} disabled:opacity-40`}
            onClick={run(onMove)}
          >
            <Clock className="h-4 w-4" />
            Saat ve süreyi değiştir
          </button>
          <button
            className={`${itemClass} text-red-600`}
            onClick={run(onDelete)}
          >
            <Trash2 className="h-4 w-4" />
            Sil
          </button>
          <button className={itemClass} onClick={onClose}>
            <X className="h-4 w-4" />
            Kapat
          </button>
        </DialogPanel>
      )}
    </Dialog>
  );
}
