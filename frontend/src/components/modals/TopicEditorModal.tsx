import { useTerms } from '../../hooks/useTerms';
import { useId, useState, type FormEvent } from 'react';
import {
  createTopicSchema,
  topicDifficulties,
  type UpdateTopicInput,
} from '@study-tracker/contracts';
import { topicsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { canManageCourse } from '../../lib/catalogAccess';
import type { CatalogCourse, CatalogTopic } from '../../types/catalog';
import EditorDialog from '../common/EditorDialog';
import { useText } from '../../store/languageStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: CatalogCourse;
  topic?: CatalogTopic | null;
}

function TopicEditor({ course, topic, onClose }: Omit<Props, 'isOpen'>) {
  const t = useTerms();
  const { editors: text, course: courseText } = useText();
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
        name: text.topicNameLength(t),
        estimatedTime: text.topicTimeRange,
        difficulty: text.chooseDifficulty,
      };
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            messages[String(issue.path[0])] ?? text.invalidValue,
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
      topic ? text.topicUpdated(t) : text.topicCreated(t),
    );
    if (saved) onClose();
  };
  return (
    <EditorDialog
      title={topic ? text.editTopic(t) : text.addTopic(t)}
      description={
        topic?.isActive === false
          ? text.archivedTopicHint(t)
          : text.topicHint(t, course.name)
      }
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div>
        {label('name', text.topicName(t))}
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
        {label('description', text.description)}
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
          {label('estimatedTime', text.estimatedTime)}
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
          {label('difficulty', text.difficulty)}
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
            {topicDifficulties.map((value) => (
              // The stored value stays Turkish; only the shown name follows the language.
              <option key={value} value={value}>{courseText.difficulties[value]}</option>
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
