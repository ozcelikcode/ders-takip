import { useQuery } from '@tanstack/react-query';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { backupAPI } from '../../services/api';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { BackupRecord, ResetMode } from '../../types/backup';

export type MaintenanceAction =
  | { kind: 'restore'; backup: BackupRecord }
  | { kind: 'reset'; mode: ResetMode };
export default function BackupPanel({
  busy,
  dirty,
  onCreate,
  onAction,
}: {
  busy: boolean;
  dirty: boolean;
  onCreate: () => void;
  onAction: (action: MaintenanceAction) => void;
}) {
  const keys = useAccountQueryKeys();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const query = useQuery({
    queryKey: keys.resource('backups'),
    queryFn: async () => {
      const response = await backupAPI.getBackups();
      if (!Array.isArray(response.data.data))
        throw new Error('Backup list response is missing');
      return response.data.data;
    },
  });
  const date = (value: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  return (
    <section className="space-y-6" aria-label="Yedekleme ve kurtarma">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Yedekler</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Yedek sunucuda saklanır; cihazınıza indirilmez. Kaydedilmemiş
            ayarlar yedeğe dahil değildir.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onCreate}
        >
          Şimdi yedek al
        </button>
      </div>
      {query.isPending ? (
        <p role="status">Yedekler yükleniyor…</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p>Yedekler yüklenemedi.</p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || query.isFetching}
            onClick={() => void query.refetch()}
          >
            Yedekleri tekrar yükle
          </button>
        </div>
      ) : query.data.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Henüz yedek bulunmuyor.</p>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border border-[var(--line)]"
          aria-busy={query.isFetching}
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Sunucudaki yedekler ve doğrulama durumu
            </caption>
            <thead className="border-b bg-[var(--subtle)] text-xs text-[var(--muted)]">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  Tarih
                </th>
                <th scope="col" className="p-3 font-medium">
                  Tür
                </th>
                <th scope="col" className="p-3 font-medium">
                  Boyut
                </th>
                <th scope="col" className="p-3 font-medium">
                  Durum
                </th>
                <th scope="col" className="p-3 font-medium">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {query.data.map((backup) => (
                <tr key={backup.id}>
                  <td className="whitespace-nowrap p-3">
                    {date(backup.createdAt)}
                  </td>
                  <td className="p-3">
                    {backup.type === 'auto' ? 'Otomatik' : 'Manuel'}
                  </td>
                  <td className="whitespace-nowrap p-3 tabular-nums">
                    {(backup.size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="p-3">
                    {backup.verified === true ? 'Doğrulanmış' : 'Doğrulanmamış'}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="btn btn-secondary whitespace-nowrap"
                      aria-label={`${date(backup.createdAt)} tarihli yedeği geri yükle`}
                      disabled={
                        backup.verified !== true ||
                        busy ||
                        dirty ||
                        query.isFetching
                      }
                      onClick={() => onAction({ kind: 'restore', backup })}
                    >
                      Geri yükle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--muted)]">
        Geri yükleme öncesinde dosya bütünlüğü ve şema yeniden kontrol edilir.
        Doğrulanmamış eski kayıtlar geri yüklenemez. Ayrı bir konumda yedek
        saklama ve otomatik saklama süresi politikası henüz kurulmadı.
      </p>
      <div className="space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-base font-medium">Verileri sıfırlama</h2>
        <p className="text-sm text-[var(--muted)]">
          İşlemden önce güvenlik yedeği alınır. Uygulanacak kapsam onay
          penceresinde gösterilir.
        </p>
        {dirty && (
          <p role="status" className="text-sm">
            Kurtarma veya sıfırlama öncesinde ayar değişikliklerini kaydedin ya
            da vazgeçin.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || dirty}
            onClick={() => onAction({ kind: 'reset', mode: 'settings_only' })}
          >
            Yalnızca site ayarlarını sıfırla
          </button>
          <button
            type="button"
            className="btn btn-secondary text-red-600"
            disabled={busy || dirty}
            onClick={() => onAction({ kind: 'reset', mode: 'all' })}
          >
            Öğrenci ve çalışma verilerini temizle
          </button>
        </div>
      </div>
    </section>
  );
}
