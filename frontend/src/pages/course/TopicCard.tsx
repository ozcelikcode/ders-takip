import { useTerms } from '../../hooks/useTerms';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { Archive, CheckCircle2, Circle, Clock, Pencil, RotateCcw } from 'lucide-react';
import type { CatalogTopic as Topic } from '../../types/catalog';
import { statusLabels, type TopicStatus } from './courseTopics';

interface TopicCardProps {
  topic: Topic;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  canReorder: boolean;
  canEdit: boolean;
  archived: boolean;
  status: TopicStatus;
  progressPending: boolean;
  restorePending: boolean;
  onStatusChange: (status: TopicStatus) => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

const TopicCard = ({
  topic,
  provided,
  snapshot,
  canReorder,
  canEdit,
  archived,
  status: currentStatus,
  progressPending,
  restorePending,
  onStatusChange,
  onEdit,
  onArchive,
  onRestore,
}: TopicCardProps) => {
  const t = useTerms();
  return (
    <article
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`panel flex flex-wrap items-center gap-3 p-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
    >
      {canReorder && (
        <div
          {...provided.dragHandleProps}
          aria-label={`${t.topic({ case: 'acc', capitalize: true })} sırala: ${topic.name}`}
          className="cursor-grab text-(--muted)"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1 basis-40">
        <h2 className="wrap-break-word text-sm font-medium">
          {topic.name}
        </h2>
        {topic.description && (
          <p className="mt-1 text-sm text-(--muted)">
            {topic.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-(--muted)">
          <span>{topic.difficulty}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {topic.estimatedTime} dk
          </span>
          {archived && <span>Arşivde</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!archived && (
          <div
            className="flex rounded-md border p-0.5"
            role="group"
            aria-label={`${topic.name} ilerleme durumu`}
          >
            {(
              [
                'not_started',
                'in_progress',
                'completed',
              ] as const
            ).map((status) => {
              const StatusIcon =
                status === 'completed'
                  ? CheckCircle2
                  : status === 'in_progress'
                    ? RotateCcw
                    : Circle;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  className={`icon-button ${currentStatus === status ? 'bg-(--subtle) text-(--text)' : ''}`}
                  title={statusLabels[status]}
                  aria-pressed={currentStatus === status}
                  disabled={progressPending}
                >
                  <StatusIcon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}
        {canEdit && (
          <>
            <button
              className="icon-button"
              aria-label={`${t.topic({ case: 'acc', capitalize: true })} düzenle: ${topic.name}`}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {archived ? (
              <button
                className="btn btn-secondary"
                disabled={restorePending}
                onClick={onRestore}
              >
                <RotateCcw className="h-4 w-4" />
                Geri al
              </button>
            ) : (
              <button
                className="icon-button"
                aria-label={`${t.topic({ case: 'acc', capitalize: true })} arşivle: ${topic.name}`}
                onClick={onArchive}
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
};

export default TopicCard;
