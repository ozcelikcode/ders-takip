import { useId, useState, type FormEvent } from 'react';
import {
  createManagedUserSchema,
  type CreateManagedUserInput,
} from '@study-tracker/contracts';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import EditorDialog from '../common/EditorDialog';
import AdminPasswordField from './AdminPasswordField';
import { useText } from '../../store/languageStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}
function CreateUserForm({ onClose }: Pick<Props, 'onClose'>) {
  const { roles, admin: text } = useText();
  const keys = useAccountQueryKeys();
  const mutation = useAccountMutation([keys.resource()]);
  const prefix = useId();
  const [form, setForm] = useState<
    CreateManagedUserInput & { confirmPassword: string }
  >({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student',
    isActive: true,
    adminPassword: '',
  });
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
    if (useAuthStore.getState().user?.role !== 'admin') return;
    const { confirmPassword, adminPassword, ...fields } = form;
    // Only an administrator account asks for the creator's password.
    const input = form.role === 'admin' ? { ...fields, adminPassword } : fields;
    const result = createManagedUserSchema.safeParse(input);
    const messages: Record<string, string> = {
      username: text.usernameRule,
      email: text.emailRule,
      password: text.passwordRule,
      firstName: text.firstNameRule,
      lastName: text.lastNameRule,
    };
    const nextErrors = result.success
      ? {}
      : Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            messages[String(issue.path[0])] ?? text.invalidValue,
          ]),
        );
    if (form.password !== confirmPassword)
      nextErrors.confirmPassword = text.passwordsMismatch;
    setErrors(nextErrors);
    if (!result.success || Object.keys(nextErrors).length > 0) return;
    const saved = await mutation.save(
      () => usersAPI.createUser(result.data),
      text.userCreated,
    );
    if (saved) onClose();
  };
  return (
    <EditorDialog
      title={text.createUser}
      description={text.createUserDescription}
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          {label('firstName', text.firstName)}
          <input
            {...field('firstName')}
            className="input"
            autoComplete="off"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          {error('firstName')}
        </div>
        <div>
          {label('lastName', text.lastName)}
          <input
            {...field('lastName')}
            className="input"
            autoComplete="off"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          {error('lastName')}
        </div>
      </div>
      <div>
        {label('username', text.username)}
        <input
          {...field('username')}
          className="input"
          autoComplete="off"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        {error('username')}
      </div>
      <div>
        {label('email', text.email)}
        <input
          {...field('email')}
          className="input"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {error('email')}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          {label('password', text.password)}
          <input
            {...field('password')}
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error('password')}
        </div>
        <div>
          {label('confirmPassword', text.confirmPassword)}
          <input
            {...field('confirmPassword')}
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
          {error('confirmPassword')}
        </div>
      </div>
      <div>
        {label('role', text.role)}
        <select
          {...field('role')}
          className="input"
          value={form.role}
          onChange={(e) =>
            setForm({
              ...form,
              role: e.target.value as CreateManagedUserInput['role'],
            })
          }
        >
          <option value="student">{roles.student}</option>
          <option value="admin">{roles.admin}</option>
        </select>
        {form.role === 'admin' && (
          <p className="mt-2 text-sm text-(--muted)">
            {text.adminRoleHint}
          </p>
        )}
      </div>
      {form.role === 'admin' && (
        <AdminPasswordField
          value={form.adminPassword ?? ''}
          missing={!!errors.adminPassword}
          onChange={(value) => {
            setForm({ ...form, adminPassword: value });
            setErrors(({ adminPassword: _cleared, ...rest }) => rest);
          }}
        />
      )}
      <label className="flex items-center gap-2 border-t pt-4 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        {text.accountActive}
      </label>
    </EditorDialog>
  );
}
export default function CreateUserModal({ isOpen, onClose }: Props) {
  const { user } = useAuthStore();
  return isOpen && user?.role === 'admin' ? (
    <CreateUserForm onClose={onClose} />
  ) : null;
}
