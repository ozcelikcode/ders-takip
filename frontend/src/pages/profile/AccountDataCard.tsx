import { serverMessage } from '../../services/httpError';
import { Download, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { unsubscribeBrowser } from '../../lib/push';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

/** Lets a user take their data with them and close their account. */
export default function AccountDataCard() {
  const navigate = useNavigate();
  const passwordId = useId();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    try {
      const data = await authAPI.exportAccount();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `hesap-verisi-${data.exportedAt.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Verilerin indirildi.');
    } catch (failure) {
      toast.error(serverMessage(failure) || 'Veriler indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setDownloading(false);
    }
  };

  const closeDelete = () => { setDeleting(false); setPassword(''); setError(null); };
  const confirmDelete = async () => {
    if (!password) { setError('Şifrenizi girin.'); return false; }
    try {
      await authAPI.deleteAccount({ password });
    } catch (failure) {
      setError(serverMessage(failure) || 'Hesap silinemedi. Lütfen tekrar deneyin.');
      return false;
    }
    void unsubscribeBrowser().catch(() => undefined);
    useAuthStore.getState().clearAuth();
    toast.success('Hesabın ve verilerin silindi.');
    navigate('/login', { replace: true });
    return true;
  };

  return (
    <section aria-labelledby="account-data-heading" className="panel">
      <div className="panel-heading">
        <h2 id="account-data-heading" className="text-base font-medium">Verilerin</h2>
      </div>
      <div className="divide-y divide-(--line)">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-sm font-medium">Verilerimi indir</h3>
            <p className="mt-1 text-sm text-(--muted)">
              Profilin, tercihlerin, kendi kayıt ve kategorilerin, seansların, planların ve ilerlemen tek bir JSON dosyasında.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void download()} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Hazırlanıyor…' : 'İndir'}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-sm font-medium">Hesabı sil</h3>
            <p className="mt-1 text-sm text-(--muted)">
              Hesabın ve sana ait bütün veriler kalıcı olarak silinir. Geri alınamaz; önce verilerini indirmen önerilir.
            </p>
          </div>
          <button type="button" className="btn btn-secondary text-red-600 dark:text-red-400" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" />
            Hesabı sil
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="Hesabı sil"
        message="Hesabın, kişisel kategori ve kayıtların, seansların, planların ve ilerlemen kalıcı olarak silinecek. Ortak kayıtlar etkilenmez."
        confirmText="Hesabımı kalıcı olarak sil"
        type="danger"
      >
        <div className="space-y-2">
          <label htmlFor={passwordId} className="block text-sm font-medium">Onay için şifren</label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError(null); }}
            aria-invalid={!!error}
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      </ConfirmDialog>
    </section>
  );
}
