import { useQuery } from '@tanstack/react-query';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { notificationsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

/** Whether the operator configured SMTP and VAPID keys; the site switches only matter for configured channels. */
export default function NotificationChannelStatus() {
  const text = useText().admin;
  const keys = useAccountQueryKeys();
  const channels = useQuery({ queryKey: keys.resource('notification-channels'), queryFn: notificationsAPI.channels });
  if (channels.isPending) return <p role="status" className="text-xs text-(--muted)">{text.channelsLoading}</p>;
  if (channels.isError) return <p className="text-xs text-red-600 dark:text-red-400">{text.channelsFailed}</p>;
  const { email, push } = channels.data;
  return (
    <ul className="space-y-1 text-xs text-(--muted)">
      <li>{text.emailChannel(email.configured)}</li>
      <li>{text.pushChannel(push.configured)}</li>
    </ul>
  );
}
