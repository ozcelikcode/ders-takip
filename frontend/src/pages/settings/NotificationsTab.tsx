import { reminderLeadOptions, resolveNotifications, type NotificationPreferences, type PreferencesPatch, type UserPreferences } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useId, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { browserPushState, PushPermissionError, subscribeBrowser, unsubscribeBrowser, type BrowserPushState } from '../../lib/push';
import { notificationsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface NotificationsTabProps {
  preferences: UserPreferences;
  onSave: (patch: PreferencesPatch) => void;
}

const browserStateText: Record<BrowserPushState, string> = {
  unsupported: 'Bu tarayıcı bildirimleri desteklemiyor.',
  denied: 'Bu sitenin bildirimleri tarayıcı ayarlarında engellenmiş. İzni oradan açman gerekir.',
  subscribed: 'Bu tarayıcı bildirim alıyor.',
  off: 'Bu tarayıcıda bildirimler kapalı.',
};
const serverMessage = (error: unknown) => (isAxiosError(error) ? error.response?.data?.error?.message : undefined);

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-(--muted)">{hint}</span>}
      </label>
    </div>
  );
}

/** Opt-in reminders by email and browser push; only channels the site has set up are shown. */
export default function NotificationsTab({ preferences, onSave }: NotificationsTabProps) {
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const email = useAuthStore((state) => state.user?.email);
  const leadId = useId();
  const channels = useQuery({ queryKey: keys.resource('notification-channels'), queryFn: notificationsAPI.channels });
  const [browser, setBrowser] = useState<BrowserPushState | null>(null);
  const [busy, setBusy] = useState<'browser' | 'test-email' | 'test-push' | null>(null);
  const options = resolveNotifications(preferences);
  const save = (patch: Partial<NotificationPreferences>) => onSave({ notifications: { ...options, ...patch } });

  useEffect(() => {
    let active = true;
    void browserPushState().then((state) => { if (active) setBrowser(state); });
    return () => { active = false; };
  }, []);

  const enableBrowser = async (publicKey: string) => {
    setBusy('browser');
    try {
      await notificationsAPI.subscribe(await subscribeBrowser(publicKey));
      setBrowser('subscribed');
      toast.success('Bu tarayıcıda bildirimler açıldı.');
    } catch (error) {
      if (error instanceof PushPermissionError) setBrowser(await browserPushState());
      else toast.error(serverMessage(error) || 'Bildirimler açılamadı. Lütfen tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  };
  const disableBrowser = async () => {
    setBusy('browser');
    try {
      const endpoint = await unsubscribeBrowser();
      if (endpoint) await notificationsAPI.unsubscribe(endpoint);
      setBrowser('off');
      toast.success('Bu tarayıcıda bildirimler kapatıldı.');
    } catch (error) {
      toast.error(serverMessage(error) || 'Bildirimler kapatılamadı.');
    } finally {
      setBusy(null);
    }
  };
  const test = async (channel: 'email' | 'push') => {
    setBusy(channel === 'email' ? 'test-email' : 'test-push');
    try {
      await notificationsAPI.test({ channel });
      toast.success(channel === 'email' ? `Deneme e-postası ${email ?? 'adresine'} gönderildi.` : 'Deneme bildirimi gönderildi.');
    } catch (error) {
      toast.error(serverMessage(error) || 'Deneme gönderilemedi.');
    } finally {
      setBusy(null);
    }
  };

  if (channels.isPending) return <p role="status" className="text-sm text-(--muted)">Bildirim ayarları yükleniyor…</p>;
  if (channels.isError) {
    return (
      <div role="alert" className="text-sm">
        Bildirim ayarları yüklenemedi.{' '}
        <button type="button" className="btn btn-secondary ml-2" onClick={() => void channels.refetch()}>Tekrar dene</button>
      </div>
    );
  }
  const { email: mail, push } = channels.data;
  if (!mail.enabled && !push.enabled) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium">Bildirimler</h2>
        <p className="text-sm text-(--muted)">Bu sitede bildirim gönderimi açık değil. Yöneticin e-posta ya da tarayıcı bildirimlerini açtığında burada seçebilirsin.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {push.enabled && push.publicKey && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Bu tarayıcı</h2>
          <p role="status" className="text-sm text-(--muted)">{browser ? browserStateText[browser] : 'Kontrol ediliyor…'}</p>
          <div className="flex flex-wrap gap-2">
            {browser === 'off' && (
              <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void enableBrowser(push.publicKey!)}>
                Bu tarayıcıda bildirimleri aç
              </button>
            )}
            {browser === 'subscribed' && (
              <>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void test('push')}>Deneme bildirimi gönder</button>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void disableBrowser()}>Bu tarayıcıda kapat</button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4 border-t border-(--line) pt-6 first:border-t-0 first:pt-0">
        <div>
          <h2 className="text-base font-medium">{t.session({ capitalize: true })} hatırlatmaları</h2>
          <p className="mt-1 text-sm text-(--muted)">Planlı bir {t.session()} başlamadan önce haber verir.</p>
        </div>
        {mail.enabled && <Toggle checked={options.sessionReminderEmail} onChange={(sessionReminderEmail) => save({ sessionReminderEmail })} label="E-posta ile" />}
        {push.enabled && (
          <Toggle
            checked={options.sessionReminderPush}
            onChange={(sessionReminderPush) => save({ sessionReminderPush })}
            label="Tarayıcı bildirimi ile"
            hint={options.sessionReminderPush && browser !== 'subscribed' ? 'Bu tarayıcıda almak için yukarıdan bildirimleri aç.' : undefined}
          />
        )}
        <div className="max-w-xs">
          <label htmlFor={leadId} className="mb-2 block text-sm font-medium">Ne kadar önce</label>
          <select
            id={leadId}
            className="input"
            value={options.reminderLeadMinutes}
            onChange={(event) => save({ reminderLeadMinutes: Number(event.target.value) as NotificationPreferences['reminderLeadMinutes'] })}
          >
            {reminderLeadOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} dakika önce</option>)}
          </select>
        </div>
      </section>

      {mail.enabled && (
        <section className="space-y-4 border-t border-(--line) pt-6">
          <div>
            <h2 className="text-base font-medium">E-posta özetleri</h2>
            <p className="mt-1 text-sm text-(--muted)">{email ? `${email} adresine, ` : ''}kendi saat dilimine göre gönderilir.</p>
          </div>
          <Toggle checked={options.dailyPlanEmail} onChange={(dailyPlanEmail) => save({ dailyPlanEmail })} label="Sabah günlük plan" hint={`Aktif günlerde 07:00'de: bugünkü ${t.session({ plural: true })} ve günlük hedef.`} />
          <Toggle checked={options.weeklySummaryEmail} onChange={(weeklySummaryEmail) => save({ weeklySummaryEmail })} label="Haftalık özet" hint="Haftanın son günü 19:00'da: ölçülen süre, hedef ve dağılım." />
          <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void test('email')}>Deneme e-postası gönder</button>
        </section>
      )}
    </div>
  );
}
