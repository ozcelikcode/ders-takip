import { useTerms } from '../../hooks/useTerms';
import ConfirmDialog from '../common/ConfirmDialog';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { coursesAPI, topicsAPI } from '../../services/api';

export type CatalogDeleteTarget = {
  kind: 'course' | 'topic';
  id: number;
  name: string;
};

function DeleteConfirmation({
  target,
  onClose,
  onDeleted,
}: {
  target: CatalogDeleteTarget;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const t = useTerms();
  const mutation = useCatalogMutation();
  const course = target.kind === 'course';
  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title={course ? `${t.course({ case: 'acc', capitalize: true })} sil` : `${t.topic({ case: 'acc', capitalize: true })} arşivle`}
      message={
        course
          ? `“${target.name}” ${t.course()}, ${t.topic({ plural: true })} ve ${t.topic()} ilerleme kayıtları kalıcı olarak silinecek. ${t.session({ plural: true, capitalize: true })}, notlar ve ölçülen çalışma süreleri korunacak; ${t.course()} ve ${t.topic()} bağlantıları kaldırılacak.`
          : `“${target.name}” aktif ${t.topic()} listesinden kaldırılacak. İlerleme kayıtları ve çalışma geçmişi korunacak. Arşivden geri alabilirsiniz.`
      }
      confirmText={course ? `${t.course({ case: 'acc', capitalize: true })} sil` : 'Arşivle'}
      type={course ? 'danger' : 'warning'}
      onConfirm={async () => {
        const saved = await mutation.save(
          () =>
            course
              ? coursesAPI.deleteCourse(String(target.id))
              : topicsAPI.deleteTopic(String(target.id)),
          course
            ? `${t.course({ capitalize: true })} silindi. Çalışma geçmişi korundu.`
            : `${t.topic({ capitalize: true })} arşivlendi.`,
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
