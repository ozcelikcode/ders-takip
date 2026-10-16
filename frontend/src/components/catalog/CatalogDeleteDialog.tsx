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
  const mutation = useCatalogMutation();
  const course = target.kind === 'course';
  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title={course ? 'Dersi sil' : 'Konuyu arşivle'}
      message={
        course
          ? `“${target.name}” dersi, konuları ve konu ilerleme kayıtları kalıcı olarak silinecek. Seanslar, notlar ve ölçülen çalışma süreleri korunacak; ders ve konu bağlantıları kaldırılacak.`
          : `“${target.name}” aktif konu listesinden kaldırılacak. İlerleme kayıtları ve çalışma geçmişi korunacak. Konuyu arşivden geri alabilirsiniz.`
      }
      confirmText={course ? 'Dersi sil' : 'Arşivle'}
      type={course ? 'danger' : 'warning'}
      onConfirm={async () => {
        const saved = await mutation.save(
          () =>
            course
              ? coursesAPI.deleteCourse(String(target.id))
              : topicsAPI.deleteTopic(String(target.id)),
          course
            ? 'Ders silindi. Çalışma geçmişi korundu.'
            : 'Konu arşivlendi.',
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
