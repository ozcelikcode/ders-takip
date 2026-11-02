import { useTerms } from '../../hooks/useTerms';
import ConfirmDialog from '../common/ConfirmDialog';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { coursesAPI, topicsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

export type CatalogDeleteTarget = {
  kind: 'course' | 'topic';
  id: number;
  name: string;
};

function DeleteConfirmation({
  target,
  onClose,
  onRemoved,
  onDeleted,
}: {
  target: CatalogDeleteTarget;
  onClose: () => void;
  /** Runs as soon as the server deleted it, before the views refresh. */
  onRemoved?: () => void;
  onDeleted?: () => void;
}) {
  const t = useTerms();
  const text = useText().records;
  const mutation = useCatalogMutation();
  const course = target.kind === 'course';
  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title={course ? text.deleteRecordTitle(t) : text.archiveTopicTitle(t)}
      message={
        course
          ? text.deleteRecordMessage(t, target.name)
          : text.archiveTopicMessage(t, target.name)
      }
      confirmText={course ? text.deleteRecordTitle(t) : text.archive}
      type={course ? 'danger' : 'warning'}
      onConfirm={async () => {
        const saved = await mutation.save(
          async () => {
            await (course
              ? coursesAPI.deleteCourse(String(target.id))
              : topicsAPI.deleteTopic(String(target.id)));
            onRemoved?.();
          },
          course
            ? text.recordDeleted(t)
            : text.topicArchived(t),
        );
        if (saved) onDeleted?.();
        return saved;
      }}
    >
      {mutation.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.errorMessage}
        </p>
      )}
    </ConfirmDialog>
  );
}

export default function CatalogDeleteDialog({
  target,
  ...props
}: {
  target: CatalogDeleteTarget | null;
  onClose: () => void;
  onRemoved?: () => void;
  onDeleted?: () => void;
}) {
  return target ? (
    <DeleteConfirmation
      key={`${target.kind}:${target.id}`}
      target={target}
      {...props}
    />
  ) : null;
}
