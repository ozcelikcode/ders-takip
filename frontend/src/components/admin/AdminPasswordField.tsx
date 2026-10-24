import { useId } from 'react';
import { useText } from '../../store/languageStore';

/** The administrator's own password inside a confirmation, for the actions the server asks to be confirmed again. */
export default function AdminPasswordField({ value, onChange, missing }: { value: string; onChange: (value: string) => void; missing: boolean }) {
  const text = useText().adminConfirmation;
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{text.label}</label>
      <input
        id={id}
        type="password"
        className="input"
        autoComplete="current-password"
        value={value}
        aria-invalid={missing}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-hint`} className="text-xs text-(--muted)">{text.hint}</p>
      {missing && <p role="alert" className="text-sm text-red-600">{text.missing}</p>}
    </div>
  );
}
