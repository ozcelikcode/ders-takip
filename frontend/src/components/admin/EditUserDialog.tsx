import { useId, useState, type FormEvent } from 'react';
import { managedUserPatchSchema, type ManagedUser } from '@study-tracker/contracts';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { usersAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import EditorDialog from '../common/EditorDialog';
import AdminPasswordField from './AdminPasswordField';

type Fields = Pick<ManagedUser, 'firstName' | 'lastName' | 'username' | 'email'>;
const fieldNames = ['firstName', 'lastName', 'username', 'email'] as const;

/** Corrects a person's name, username or email; a new email for an administrator is confirmed with the password. */
export default function EditUserDialog({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const text = useText().admin;
  const keys = useAccountQueryKeys();
  const mutation = useAccountMutation([keys.resource()]);
  const prefix = useId();
  const [form, setForm] = useState<Fields>({ firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email });
  const [adminPassword, setAdminPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const changed = fieldNames.filter((name) => form[name].trim() !== user[name]);
  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const confirmed = emailChanged && user.role === 'admin';
  const messages: Record<string, string> = {
    username: text.usernameRule,
    email: text.emailRule,
    firstName: text.firstNameRule,
    lastName: text.lastNameRule,
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changed.length) return onClose();
    const patch: Record<string, string> = Object.fromEntries(changed.map((name) => [name, form[name]]));
    if (confirmed) patch.adminPassword = adminPassword;
    const result = managedUserPatchSchema.safeParse(patch);
    const nextErrors: Record<string, string> = result.success
      ? {}
      : Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), messages[String(issue.path[0])] ?? text.invalidValue]));
    setErrors(nextErrors);
    if (!result.success) return;
    const saved = await mutation.save(() => usersAPI.updateUser(String(user.id), result.data), text.userUpdated);
    if (saved) onClose();
  };

  const input = (name: keyof Fields, label: string, type = 'text') => (
    <div>
      <label htmlFor={`${prefix}-${name}`} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={`${prefix}-${name}`}
        className="input"
        type={type}
        autoComplete="off"
        value={form[name]}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${prefix}-${name}-error` : undefined}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
      />
      {errors[name] && <p id={`${prefix}-${name}-error`} className="mt-1 text-sm text-red-600">{errors[name]}</p>}
    </div>
  );

  return (
    <EditorDialog
      title={text.editDetails}
      description={text.editDetailsDescription(`${user.firstName} ${user.lastName}`)}
      pending={mutation.isPending}
      error={mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input('firstName', text.firstName)}
        {input('lastName', text.lastName)}
      </div>
      {input('username', text.username)}
      {input('email', text.email, 'email')}
      {emailChanged && <p className="text-xs text-(--muted)">{text.emailChangeHint}</p>}
      {confirmed && (
        <AdminPasswordField
          value={adminPassword}
          missing={!!errors.adminPassword}
          onChange={(value) => {
            setAdminPassword(value);
            setErrors(({ adminPassword: _cleared, ...rest }) => rest);
          }}
        />
      )}
    </EditorDialog>
  );
}
