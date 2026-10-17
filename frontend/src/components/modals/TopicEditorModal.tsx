import { useId, useState, type FormEvent } from 'react';
import {
  createTopicSchema,
  type UpdateTopicInput,
} from '@study-tracker/contracts';
import { topicsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { canManageCourse } from '../../lib/catalogAccess';
import type { CatalogCourse, CatalogTopic } from '../../types/catalog';
import EditorDialog from '../common/EditorDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: CatalogCourse;
  topic?: CatalogTopic | null;
}

function TopicEditor({ course, topic, onClose }: Omit<Props, 'isOpen'>) {
  const mutation = useCatalogMutation();
  const prefix = useId();
  const [initial] = useState(() => ({
    name: topic?.name ?? '',
    description: topic?.description ?? '',
    estimatedTime: String(topic?.estimatedTime ?? 30),
    difficulty: topic?.difficulty ?? 'Orta',
  }));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (name: keyof typeof form) => ({
    id: `${prefix}-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${prefix}-${name}-error` : undefined,
  });
  const label = (name: keyof typeof form, text: string) => (
    <label
      htmlFor={`${prefix}-${name}`}
      className="mb-1 block text-sm font-medium"
    >
      {text}
    </label>
  );
  const error = (name: keyof typeof form) =>
    errors[name] && (
      <p id={`${prefix}-${name}-error`} className="mt-1 text-sm text-red-600">
        {errors[name]}
      </p>
    );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCourse(course, useAuthStore.getState().user)) return;
    const result = createTopicSchema.safeParse({
      ...form,
      courseId: course.id,
      estimatedTime: Number(form.estimatedTime),
    });
    if (!result.success) {
      const messages: Record<string, string> = {
        name: 'Konu adı 1–200 karakter olmalıdır.',
        estimatedTime: 'Süre 5–480 arasında bir tam sayı olmalıdır.',
        difficulty: 'Bir zorluk seviyesi seçin.',
      };
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            messages[String(issue.path[0])] ?? 'Geçerli bir değer girin.',
          ]),
        ),
      );
      return;
    }
    setErrors({});
    const patch: UpdateTopicInput = {};
    for (const key of [
      'name',
      'description',
      'estimatedTime',
      'difficulty',
    ] as const) {
      if (String(result.data[key]) !== String(initial[key]))
        Object.assign(patch, { [key]: result.data[key] });
    }
    if (topic && Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const saved = await mutation.save(
      () =>
        topic
          ? topicsAPI.updateTopic(String(topic.id), patch)
          : topicsAPI.createTopic(result.data),
      topic ? 'Konu güncellendi.' : 'Konu oluşturuldu.',
    );
    if (saved) onClose();
  };
  return (
    <EditorDialog
      title={topic ? 'Konuyu düzenle' : 'Konu ekle'}
      description={
        topic?.isActive === false
          ? 'Arşivdeki konuyu düzenliyorsunuz. Değişiklikler konuyu aktif hale getirmez.'
          : `${course.name} dersine ait konu bilgilerini belirleyin.`
      }
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div>
        {label('name', 'Konu adı')}
        <input
          {...field('name')}
          className="input"
          maxLength={200}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
        {error('name')}
      </div>
      <div>
        {label('description', 'Açıklama')}
        <textarea
          {...field('description')}
          className="input"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {label('estimatedTime', 'Tahmini süre (dk)')}
          <input
            {...field('estimatedTime')}
            className="input"
            type="number"
            min={5}
            max={480}
            step={1}
            value={form.estimatedTime}
            onChange={(e) =>
              setForm({ ...form, estimatedTime: e.target.value })
            }
          />
          {error('estimatedTime')}
        </div>
        <div>
          {label('difficulty', 'Zorluk')}
          <select
            {...field('difficulty')}
            className="input"
            value={form.difficulty}
            onChange={(e) =>
              setForm({
                ...form,
                difficulty: e.target.value as CatalogTopic['difficulty'],
              })
            }
          >
            {['Kolay', 'Orta', 'Zor'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          {error('difficulty')}
        </div>
      </div>
    </EditorDialog>
  );
}

export default function TopicEditorModal({ isOpen, ...props }: Props) {
  const { user } = useAuthStore();
  if (!isOpen || !canManageCourse(props.course, user)) return null;
  return (
    <TopicEditor
      key={`${props.course.id}:${props.topic?.id ?? 'new'}`}
      {...props}
    />
  );
}
