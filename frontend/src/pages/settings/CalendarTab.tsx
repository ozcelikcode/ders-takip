import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { useLocale } from '../../lib/locale';
import { calendarFeedAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

/** The calendar subscription: create, renew or turn off its private address; the address is shown only once. */
export default function CalendarTab() {
  const t = useTerms();
  const text = useText().calendarFeed;
  const { tag } = useLocale();
  const id = useId();
  const keys = useAccountQueryKeys();
  const status = useQuery({ queryKey: keys.resource('calendar-feed'), queryFn: calendarFeedAPI.status });
  const mutation = useAccountMutation([keys.resource('calendar-feed')]);
  const [url, setUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'renew' | 'remove' | null>(null);

  const create = () => mutation.save(async () => setUrl((await calendarFeedAPI.create()).url), text.created);
  const remove = () => mutation.save(async () => {
    await calendarFeedAPI.remove();
    setUrl(null);
  }, text.removed);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(text.copied);
    } catch {
      toast.error(text.copyFailed);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby={`${id}-title`}>
      <div className="space-y-2">
        <h2 id={`${id}-title`} className="text-base font-medium">{text.title}</h2>
        <p className="text-sm text-(--muted)">{text.hint(t)}</p>
        <p className="text-sm text-(--muted)">{text.privacy(t)}</p>
      </div>
      {status.isPending ? (
        <p role="status" className="text-sm">{text.loading}</p>
      ) : status.isError ? (
        <p role="alert" className="text-sm text-red-600">{text.failed}</p>
      ) : (
        <div className="space-y-4">
          {url ? (
            <div className="space-y-2">
              <label htmlFor={`${id}-url`} className="block text-sm font-medium">{text.address}</label>
              <input id={`${id}-url`} className="input font-mono text-xs" readOnly value={url} onFocus={(event) => event.target.select()} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => void copy()}>{text.copy}</button>
                <a className="btn btn-secondary" href={url.replace(/^https?:/, 'webcal:')}>{text.openInApp}</a>
              </div>
              <p role="status" className="text-xs text-(--muted)">{text.shownOnce}</p>
            </div>
          ) : (
            <p className="text-sm">
              {status.data.active && status.data.createdAt
                ? text.activeSince(new Intl.DateTimeFormat(tag, { dateStyle: 'long' }).format(new Date(status.data.createdAt)))
                : text.inactive}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {status.data.active ? (
              <>
                <button type="button" className="btn btn-secondary" disabled={mutation.isPending} onClick={() => setConfirming('renew')}>{text.renew}</button>
                <button type="button" className="btn btn-secondary text-red-600" disabled={mutation.isPending} onClick={() => setConfirming('remove')}>{text.remove}</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" disabled={mutation.isPending} onClick={() => void create()}>{text.create}</button>
            )}
          </div>
          {mutation.errorMessage && <p role="alert" className="text-sm text-red-600">{mutation.errorMessage}</p>}
        </div>
      )}
      <div className="space-y-2 border-t border-(--line) pt-5">
        <h3 className="text-sm font-medium">{text.howTo}</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-(--muted)">
          <li>{text.google}</li>
          <li>{text.apple}</li>
          <li>{text.outlook}</li>
        </ul>
      </div>
      <ConfirmDialog
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={async () => {
          const done = confirming === 'renew' ? await create() : await remove();
          if (done) setConfirming(null);
          return done;
        }}
        title={confirming === 'renew' ? text.renewTitle : text.removeTitle}
        message={confirming === 'renew' ? text.renewMessage : text.removeMessage}
        confirmText={confirming === 'renew' ? text.renew : text.remove}
        type={confirming === 'remove' ? 'danger' : 'warning'}
      />
    </section>
  );
}
