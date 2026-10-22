import { reminderLeadOptions, resolveNotifications, type NotificationPreferences, type PreferencesPatch, type UserPreferences } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { serverMessage } from '../../lib/messages';
import { useEffect, useId, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { browserPushState, PushPermissionError, subscribeBrowser, unsubscribeBrowser, type BrowserPushState } from '../../lib/push';
import { notificationsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useText } from '../../store/languageStore';

interface NotificationsTabProps {
  preferences: UserPreferences;
  onSave: (patch: PreferencesPatch) => void;
}

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
  const text = useText().notificationSettings;
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
      toast.success(text.enabled);
    } catch (error) {
      if (error instanceof PushPermissionError) setBrowser(await browserPushState());
      else toast.error(serverMessage(error) || text.enableFailed);
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
      toast.success(text.disabled);
    } catch (error) {
      toast.error(serverMessage(error) || text.disableFailed);
    } finally {
      setBusy(null);
    }
  };
  const test = async (channel: 'email' | 'push') => {
    setBusy(channel === 'email' ? 'test-email' : 'test-push');
    try {
      await notificationsAPI.test({ channel });
      toast.success(channel === 'email' ? text.testEmailSent(email) : text.testPushSent);
    } catch (error) {
      toast.error(serverMessage(error) || text.testFailed);
    } finally {
      setBusy(null);
    }
  };

  if (channels.isPending) return <p role="status" className="text-sm text-(--muted)">{text.loading}</p>;
  if (channels.isError) {
    return (
      <div role="alert" className="text-sm">
        {text.failed}{' '}
        <button type="button" className="btn btn-secondary ml-2" onClick={() => void channels.refetch()}>{text.retry}</button>
      </div>
    );
  }
  const { email: mail, push } = channels.data;
  if (!mail.enabled && !push.enabled) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium">{text.title}</h2>
        <p className="text-sm text-(--muted)">{text.off}</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {push.enabled && push.publicKey && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">{text.thisBrowser}</h2>
          <p role="status" className="text-sm text-(--muted)">{browser ? text.browserStates[browser] : text.checking}</p>
          <div className="flex flex-wrap gap-2">
            {browser === 'off' && (
              <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void enableBrowser(push.publicKey!)}>
                {text.enable}
              </button>
            )}
            {browser === 'subscribed' && (
              <>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void test('push')}>{text.sendTest}</button>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void disableBrowser()}>{text.disable}</button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4 border-t border-(--line) pt-6 first:border-t-0 first:pt-0">
        <div>
          <h2 className="text-base font-medium">{text.remindersTitle(t)}</h2>
          <p className="mt-1 text-sm text-(--muted)">{text.remindersHint(t)}</p>
        </div>
        {mail.enabled && <Toggle checked={options.sessionReminderEmail} onChange={(sessionReminderEmail) => save({ sessionReminderEmail })} label={text.byEmail} />}
        {push.enabled && (
          <Toggle
            checked={options.sessionReminderPush}
            onChange={(sessionReminderPush) => save({ sessionReminderPush })}
            label={text.byPush}
            hint={options.sessionReminderPush && browser !== 'subscribed' ? text.pushNeedsBrowser : undefined}
          />
        )}
        <div className="max-w-xs">
          <label htmlFor={leadId} className="mb-2 block text-sm font-medium">{text.leadTime}</label>
          <select
            id={leadId}
            className="input"
            value={options.reminderLeadMinutes}
            onChange={(event) => save({ reminderLeadMinutes: Number(event.target.value) as NotificationPreferences['reminderLeadMinutes'] })}
          >
            {reminderLeadOptions.map((minutes) => <option key={minutes} value={minutes}>{text.leadOption(minutes)}</option>)}
          </select>
        </div>
      </section>

      {mail.enabled && (
        <section className="space-y-4 border-t border-(--line) pt-6">
          <div>
            <h2 className="text-base font-medium">{text.emailTitle}</h2>
            <p className="mt-1 text-sm text-(--muted)">{text.emailHint(email)}</p>
          </div>
          <Toggle checked={options.dailyPlanEmail} onChange={(dailyPlanEmail) => save({ dailyPlanEmail })} label={text.dailyPlan} hint={text.dailyPlanHint(t)} />
          <Toggle checked={options.weeklySummaryEmail} onChange={(weeklySummaryEmail) => save({ weeklySummaryEmail })} label={text.weeklySummary} hint={text.weeklySummaryHint} />
          <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void test('email')}>{text.sendTestEmail}</button>
        </section>
      )}
    </div>
  );
}
