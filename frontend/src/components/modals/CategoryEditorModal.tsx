import { useTerms } from '../../hooks/useTerms';
import { useId, useState, type FormEvent } from 'react';
import {
  createCategorySchema,
  type CategoryScope,
  type UpdateCategoryInput,
} from '@study-tracker/contracts';
import { categoriesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import type { CatalogCategoryRecord } from '../../types/catalog';
import EditorDialog from '../common/EditorDialog';
import { catalogIcons, catalogIcon } from '../catalog/catalogIcons';
import { useText } from '../../store/languageStore';

interface Props {
  category: CatalogCategoryRecord | null;
  /** Shared categories are admin-only; personal ones belong to the signed-in user. */
  scope: CategoryScope;
  nextOrder: number;
  onClose: () => void;
}

export default function CategoryEditorModal({
  category,
  scope,
  nextOrder,
  onClose,
}: Props) {
  const { user } = useAuthStore();
  const text = useText().editors;
  const prefix = useId();
  const mutation = useCatalogMutation();
  const [initial] = useState(() => ({
    name: category?.name ?? '',
    description: category?.description ?? '',
    color: category?.color ?? '#52525b',
    icon: category?.icon ?? 'Tag',
    order: String(category?.order ?? nextOrder),
    isActive: category?.isActive ?? true,
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
  const Icon = catalogIcon(form.icon);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scope === 'shared' && useAuthStore.getState().user?.role !== 'admin') return;
    const result = createCategorySchema.safeParse({
      ...form,
      order: Number(form.order),
      scope,
    });
    if (!result.success) {
      const messages: Record<string, string> = {
        name: text.categoryNameLength,
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
    const patch: UpdateCategoryInput = {};
    for (const key of [
      'name',
      'description',
      'color',
      'icon',
      'order',
      'isActive',
    ] as const) {
      if (
        result.data[key] !== undefined &&
        String(result.data[key]) !== String(initial[key])
      )
        Object.assign(patch, { [key]: result.data[key] });
    }
    if (category && Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const saved = await mutation.save(
      () =>
        category
          ? categoriesAPI.updateCategory(String(category.id), patch)
          : categoriesAPI.createCategory(result.data),
      category ? text.categoryUpdated : text.categoryCreated,
    );
    if (saved) onClose();
  };
  const t = useTerms();
  if (scope === 'shared' && user?.role !== 'admin') return null;
  return (
    <EditorDialog
      title={category ? text.editCategory : text.addCategory}
      description={
        scope === 'shared'
          ? text.sharedCategoryHint(t)
          : text.personalCategoryHint(t)
      }
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div>
        {label('name', text.categoryName)}
        <input
          {...field('name')}
          className="input"
          value={form.name}
          maxLength={100}
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
          {label('color', text.color)}
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-5 w-5 shrink-0 rounded-sm border"
              style={{
                backgroundColor: /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(
                  form.color,
                )
                  ? form.color
                  : undefined,
              }}
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
              <option key={icon}>{icon}</option>
            ))}
          </select>
        </div>
        {error('icon')}
      </div>
      <label className="flex items-center gap-2 border-t pt-4 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        {text.activeCategory}
      </label>
    </EditorDialog>
  );
}
