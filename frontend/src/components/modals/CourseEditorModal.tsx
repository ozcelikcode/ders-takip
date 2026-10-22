import { useTerms } from '../../hooks/useTerms';
import { useId, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createCourseSchema,
  type UpdateCourseInput,
} from '@study-tracker/contracts';
import { categoriesAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { canManageCourse } from '../../lib/catalogAccess';
import type { CatalogCategory, CatalogCategoryRecord, CatalogCourse } from '../../types/catalog';
import EditorDialog from '../common/EditorDialog';
import { catalogIcons, catalogIcon } from '../catalog/catalogIcons';
import { useText } from '../../store/languageStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course?: CatalogCourse | null;
  defaultGlobal?: boolean;
}

function CourseEditor({
  onClose,
  course,
  defaultGlobal = false,
}: Omit<Props, 'isOpen'>) {
  const t = useTerms();
  const text = useText().editors;
  const { user } = useAuthStore();
  const admin = user?.role === 'admin';
  const keys = useAccountQueryKeys();
  const mutation = useCatalogMutation();
  const prefix = useId();
  const [initial] = useState(() => ({
    name: course?.name ?? '',
    categoryId: String(course?.categoryId ?? ''),
    description: course?.description ?? '',
    color: course?.color ?? '#52525b',
    icon: course?.icon ?? 'BookOpen',
    order: String(course?.order ?? 1),
    isActive: course?.isActive ?? true,
    isGlobal: course?.isGlobal ?? defaultGlobal,
  }));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const categoriesQuery = useQuery({
    queryKey: keys.catalog('categories'),
    queryFn: () => categoriesAPI.getCategories(),
  });
  // A personal category holds only its owner's own, non-shared records.
  const ownerId = course ? course.userId : user?.id;
  const activeCategories: CatalogCategoryRecord[] = (
    categoriesQuery.data?.data.data?.categories ?? []
  ).filter(
    (category) =>
      category.userId === null ||
      (!form.isGlobal && category.userId === Number(ownerId)),
  );
  const personalIds = new Set(
    activeCategories.filter((category) => category.userId !== null).map((category) => category.id),
  );
  const categories: CatalogCategory[] =
    course?.category &&
    !activeCategories.some((category) => category.id === course.categoryId)
      ? [course.category, ...activeCategories]
      : activeCategories;
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
  const Icon = catalogIcon(form.icon);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !user ||
      (course && !canManageCourse(course, user)) ||
      categoriesQuery.isError ||
      categories.length === 0
    )
      return;
    const result = createCourseSchema.safeParse({
      name: form.name,
      categoryId: Number(form.categoryId),
      description: form.description,
      color: form.color,
      icon: form.icon,
      order: Number(form.order),
      ...(admin ? { isActive: form.isActive, isGlobal: form.isGlobal } : {}),
    });
    if (!result.success) {
      const messages: Record<string, string> = {
        name: text.recordNameLength(t),
        categoryId: text.chooseCategory,
        color: text.invalidColor,
        icon: text.iconTooLong,
        order: text.orderPositive,
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
    const payload = result.data;
    const patch: UpdateCourseInput = {};
    for (const key of [
      'name',
      'categoryId',
      'description',
      'color',
      'icon',
      'order',
      'isActive',
      'isGlobal',
    ] as const) {
      if (
        payload[key] !== undefined &&
        String(payload[key]) !== String(initial[key])
      )
        Object.assign(patch, { [key]: payload[key] });
    }
    if (course && Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const saved = await mutation.save(
      () =>
        course
          ? coursesAPI.updateCourse(String(course.id), patch)
          : coursesAPI.createCourse(payload),
      course ? text.recordUpdated(t) : text.recordCreated(t),
    );
    if (saved) onClose();
  };
  return (
    <EditorDialog
      title={course ? text.editRecord(t) : text.addRecord(t)}
      description={text.recordHint(t)}
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      disabled={
        categoriesQuery.isPending ||
        categoriesQuery.isError ||
        categories.length === 0
      }
    >
      <div>
        {label('name', text.recordName(t))}
        <input
          {...field('name')}
          className="input"
          maxLength={100}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
        {error('name')}
      </div>
      <div>
        {label('categoryId', text.category)}
        <select
          {...field('categoryId')}
          className="input"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">{text.categoryPlaceholder}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {personalIds.has(category.id) ? text.personalSuffix(category.name) : category.name}
            </option>
          ))}
        </select>
        {error('categoryId')}
        {categoriesQuery.isPending && (
          <p role="status" className="mt-2 text-sm text-(--muted)">
            {text.categoriesLoading}
          </p>
        )}
        {categoriesQuery.isError && (
          <div role="alert" className="mt-2 text-sm text-red-600">
            {text.categoriesFailed}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void categoriesQuery.refetch()}
            >
              {text.retry}
            </button>
          </div>
        )}
        {categoriesQuery.isSuccess && categories.length === 0 && (
          <p role="status" className="mt-2 text-sm text-(--muted)">
            {text.needsCategory}
          </p>
        )}
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
          {label('color', text.color)}
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-sm border border-(--line)"
              style={{
                backgroundColor: /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(
                  form.color,
                )
                  ? form.color
                  : undefined,
              }}
              aria-hidden="true"
            />
            <input
              {...field('color')}
              className="input"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          {error('color')}
        </div>
        <div>
          {label('order', text.order)}
          <input
            {...field('order')}
            className="input"
            type="number"
            min={1}
            step={1}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
          {error('order')}
        </div>
      </div>
      <div>
        {label('icon', text.icon)}
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-(--muted)" />
          <select
            {...field('icon')}
            className="input"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          >
            {!Object.prototype.hasOwnProperty.call(catalogIcons, form.icon) && (
              <option value={form.icon}>{text.currentIcon(form.icon)}</option>
            )}
            {Object.keys(catalogIcons).map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </div>
        {error('icon')}
      </div>
      {admin && (
        <div className="space-y-2 border-t border-(--line) pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isGlobal}
              onChange={(e) =>
                setForm({
                  ...form,
                  isGlobal: e.target.checked,
                  // Shared records cannot sit in a personal category.
                  categoryId:
                    e.target.checked && personalIds.has(Number(form.categoryId))
                      ? ''
                      : form.categoryId,
                })
              }
            />
            {text.sharedWithAll}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            {text.activeRecord(t)}
          </label>
        </div>
      )}
    </EditorDialog>
  );
}

export default function CourseEditorModal({ isOpen, ...props }: Props) {
  const { user } = useAuthStore();
  if (
    !isOpen ||
    !user ||
    (props.course && !canManageCourse(props.course, user))
  )
    return null;
  return <CourseEditor key={props.course?.id ?? 'new'} {...props} />;
}
