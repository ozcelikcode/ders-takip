import { useQuery } from '@tanstack/react-query';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { notificationsAPI } from '../../services/api';

/** Whether the operator configured SMTP and VAPID keys; the site switches only matter for configured channels. */
export default function NotificationChannelStatus() {
  const keys = useAccountQueryKeys();
  const channels = useQuery({ queryKey: keys.resource('notification-channels'), queryFn: notificationsAPI.channels });
  if (channels.isPending) return <p role="status" className="text-xs text-(--muted)">Kanal durumu yükleniyor…</p>;
  if (channels.isError) return <p className="text-xs text-red-600 dark:text-red-400">Kanal durumu alınamadı.</p>;
  const { email, push } = channels.data;
  return (
    <ul className="space-y-1 text-xs text-(--muted)">
      <li>E-posta: {email.configured ? 'SMTP yapılandırılmış.' : 'SMTP yapılandırılmamış (SMTP_HOST ve MAIL_FROM); açık olsa da gönderilmez.'}</li>
      <li>Tarayıcı: {push.configured ? 'VAPID anahtarları yapılandırılmış.' : 'VAPID anahtarları yok (`npm run push:keys`); açık olsa da gönderilmez.'}</li>
    </ul>
  );
}
