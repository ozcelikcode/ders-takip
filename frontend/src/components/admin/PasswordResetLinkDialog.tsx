import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { PasswordResetLink } from '@study-tracker/contracts';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { usersAPI } from '../../services/api';

interface PasswordResetLinkDialogProps {
  userId: string;
  name: string;
  onClose: () => void;
}

/** Issues a one-time reset link the administrator hands over out of band. */
export default function PasswordResetLinkDialog({ userId, name, onClose }: PasswordResetLinkDialogProps) {
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
        (isAxiosError(failure) ? failure.response?.data?.error?.message : undefined) ?? 'Bağlantı oluşturulamadı.',
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
      setError('Kopyalanamadı; bağlantıyı seçip elle kopyalayın.');
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="panel w-full max-w-lg space-y-4 p-6 shadow-xl">
          <DialogTitle className="text-lg font-medium">Şifre sıfırlama bağlantısı</DialogTitle>
          <Description className="text-sm text-(--muted)">
            “{name}” için tek kullanımlık, 30 dakika geçerli bir bağlantı oluşturulur ve önceki bağlantılar geçersiz olur.
            Bağlantıyı yalnızca hesap sahibine güvenli bir kanaldan iletin.
          </Description>
          {link ? (
            <div className="space-y-2">
              <label htmlFor="reset-link" className="block text-sm font-medium">Bağlantı</label>
              <input id="reset-link" readOnly className="input font-mono text-xs" value={link.url} onFocus={(event) => event.target.select()} />
              <p className="text-xs text-(--muted)">
                Son geçerlilik: {new Date(link.expiresAt).toLocaleString('tr-TR')}
              </p>
            </div>
          ) : null}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {copied && <p role="status" className="text-sm">Bağlantı kopyalandı.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={onClose}>
              Kapat
            </button>
            {link ? (
              <button type="button" className="btn btn-primary" onClick={() => void copy()}>
                Kopyala
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void create()}>
                {pending ? 'Oluşturuluyor…' : 'Bağlantı oluştur'}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
