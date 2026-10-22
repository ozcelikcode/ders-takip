import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { PasswordResetLink } from '@study-tracker/contracts';
import { serverMessage } from '../../services/httpError';
import { useState } from 'react';
import { usersAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { useLocale } from '../../lib/locale';

interface PasswordResetLinkDialogProps {
  userId: string;
  name: string;
  onClose: () => void;
}

/** Issues a one-time reset link the administrator hands over out of band. */
export default function PasswordResetLinkDialog({ userId, name, onClose }: PasswordResetLinkDialogProps) {
  const text = useText().admin;
  const { tag } = useLocale();
  const [link, setLink] = useState<PasswordResetLink | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setPending(true);
    setError('');
    try {
      setLink(await usersAPI.createPasswordResetLink(userId));
    } catch (failure) {
      setError(
        serverMessage(failure) ?? text.resetLinkFailed,
      );
    } finally {
      setPending(false);
    }
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setError(text.copyFailed);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="panel w-full max-w-lg space-y-4 p-6 shadow-xl">
          <DialogTitle className="text-lg font-medium">{text.resetLinkTitle}</DialogTitle>
          <Description className="text-sm text-(--muted)">
            {text.resetLinkDescription(name)}
          </Description>
          {link ? (
            <div className="space-y-2">
              <label htmlFor="reset-link" className="block text-sm font-medium">{text.link}</label>
              <input id="reset-link" readOnly className="input font-mono text-xs" value={link.url} onFocus={(event) => event.target.select()} />
              <p className="text-xs text-(--muted)">
                {text.expiresAt(new Date(link.expiresAt).toLocaleString(tag))}
              </p>
            </div>
          ) : null}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {copied && <p role="status" className="text-sm">{text.copied}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={onClose}>
              {text.close}
            </button>
            {link ? (
              <button type="button" className="btn btn-primary" onClick={() => void copy()}>
                {text.copy}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void create()}>
                {pending ? text.creating : text.createLink}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
