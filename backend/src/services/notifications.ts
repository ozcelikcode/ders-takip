import {
  addDateDays,
  createTerms,
  dailyPlanHour,
  dateKeyInZone,
  dayBounds,
  daysSinceWeekStart,
  formatGoalMinutes,
  formatZonedTime,
  resolveNotifications,
  resolveTerminologyPreset,
  resolveWeekStart,
  weeklyGoalHours,
  weeklySummaryHour,
  type NotificationChannels,
  type PushPayload,
  type PushSubscriptionInput,
  type SiteSettings,
  type Terms,
  type UserPreferences,
} from '@study-tracker/contracts';
import { Op, UniqueConstraintError } from 'sequelize';
import { getEnvironment } from '../config/environment';
import { Course, NotificationDelivery, PushSubscription, StudySession, User } from '../models';
import type { NotificationKind } from '../models/NotificationDelivery';
import { mailer, type MailMessage } from './mailer';
import { pushSender } from './pushSender';
import { readSiteSettings } from './siteSettings';
import { getStudyStats } from './studyTracking';

function fail(statusCode: number, message: string): never { throw Object.assign(new Error(message), { statusCode }); }

/** A channel works only when the operator configured it and the admin's site switch allows it. */
export const channelsFor = (settings: Pick<SiteSettings, 'emailNotifications' | 'pushNotifications'>): NotificationChannels => ({
  email: { configured: mailer.enabled(), enabled: mailer.enabled() && settings.emailNotifications },
  push: { configured: pushSender.enabled(), enabled: pushSender.enabled() && settings.pushNotifications, publicKey: pushSender.enabled() && settings.pushNotifications ? pushSender.publicKey() : null },
});
export const readChannels = async () => channelsFor(await readSiteSettings());

/** Stores this browser for the account; an endpoint moves to whoever subscribed last on that browser. */
export async function savePushSubscription(userId: number, input: PushSubscriptionInput): Promise<void> {
  if (!(await readChannels()).push.enabled) fail(400, 'Tarayıcı bildirimleri bu sitede kapalı');
  const values = { userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth };
  const existing = await PushSubscription.findOne({ where: { endpoint: input.endpoint } });
  if (existing) await existing.update(values);
  else await PushSubscription.create(values);
}

export const removePushSubscription = (userId: number, endpoint: string) => PushSubscription.destroy({ where: { userId, endpoint } });

/** Sends to every browser of the account and forgets the ones the push service no longer knows. */
async function pushTo(userId: number, payload: PushPayload): Promise<number> {
  let delivered = 0;
  for (const subscription of await PushSubscription.findAll({ where: { userId } })) {
    try {
      if (await pushSender.send(subscription, payload)) delivered += 1;
      else await subscription.destroy();
    } catch (error) {
      console.error('Push delivery failed:', error instanceof Error ? error.message : error);
    }
  }
  return delivered;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const appLink = (path: string) => new URL(path, getEnvironment().FRONTEND_URL).toString();

/** Plain text and a minimal HTML twin with the same lines and one link. */
function composeMail(to: string, siteName: string, subject: string, lines: string[], link: { label: string; path: string }): MailMessage {
  const url = appLink(link.path);
  return {
    to,
    subject: `${subject} · ${siteName}`,
    text: [...lines, '', `${link.label}: ${url}`, '', `Bu e-postayı ${siteName} bildirim ayarlarına göre aldın; Ayarlar › Bildirimler'den kapatabilirsin.`].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b">${lines.map((line) => (line ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>` : '')).join('')}<p style="margin:16px 0"><a href="${escapeHtml(url)}">${escapeHtml(link.label)}</a></p><p style="margin:16px 0 0;font-size:12px;color:#71717a">Bu e-postayı ${escapeHtml(siteName)} bildirim ayarlarına göre aldın; Ayarlar › Bildirimler'den kapatabilirsin.</p></div>`,
  };
}

// Claiming first makes every occasion at-most-once, even across overlapping ticks or restarts.
async function claim(userId: number, kind: NotificationKind, key: string): Promise<boolean> {
  try {
    await NotificationDelivery.create({ userId, kind, key });
    return true;
  } catch (error) {
    if (error instanceof UniqueConstraintError) return false;
    throw error;
  }
}

const localHour = (now: Date, timezone: string) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const sessionLine = (session: StudySession, timezone: string, courseName?: string) =>
  `${formatZonedTime(session.startTime, timezone)}–${formatZonedTime(session.endTime, timezone)} · ${session.title}${courseName ? ` (${courseName})` : ''}`;

interface Recipient { user: User; preferences: UserPreferences; terms: Terms }

async function sendSessionReminders(now: Date, recipients: Recipient[], channels: NotificationChannels, siteName: string) {
  const byId = new Map(recipients.map((recipient) => [recipient.user.id, recipient]));
  // The longest lead is 30 minutes, so only sessions starting within that window can be due.
  const sessions = await StudySession.findAll({
    where: { userId: { [Op.in]: [...byId.keys()] }, status: 'planned', startTime: { [Op.gt]: now, [Op.lte]: new Date(now.getTime() + 30 * 60_000) } },
    include: [{ model: Course, as: 'course', attributes: ['name'] }],
  });
  for (const session of sessions) {
    const recipient = byId.get(session.userId)!;
    const options = resolveNotifications(recipient.preferences);
    if (session.startTime.getTime() - options.reminderLeadMinutes * 60_000 > now.getTime()) continue;
    const email = options.sessionReminderEmail && channels.email.enabled;
    const push = options.sessionReminderPush && channels.push.enabled;
    if (!email && !push) continue;
    if (!(await claim(recipient.user.id, 'session-reminder', `${session.id}:${session.startTime.toISOString()}`))) continue;
    const { timezone } = recipient.preferences;
    const minutes = Math.max(1, Math.round((session.startTime.getTime() - now.getTime()) / 60_000));
    const courseName = (session as StudySession & { course?: Course }).course?.name;
    const date = dateKeyInZone(session.startTime, timezone);
    const title = `“${session.title}” ${minutes} dk sonra başlıyor`;
    const body = sessionLine(session, timezone, courseName);
    if (email) {
      await mailer.send(composeMail(recipient.user.email, siteName, title, [`Merhaba ${recipient.user.firstName},`, `${recipient.terms.session({ capitalize: true })} ${minutes} dakika sonra başlıyor:`, body], { label: 'Planlayıcıda aç', path: `/planner?date=${date}` }))
        .catch((error: unknown) => console.error('Reminder mail failed:', error instanceof Error ? error.message : error));
    }
    if (push) await pushTo(recipient.user.id, { title, body, url: `/planner?date=${date}`, tag: `session-${session.id}` });
  }
}

async function sendDailyPlans(now: Date, recipients: Recipient[], siteName: string) {
  for (const { user, preferences, terms } of recipients) {
    if (!resolveNotifications(preferences).dailyPlanEmail) continue;
    const { timezone } = preferences;
    const today = dateKeyInZone(now, timezone);
    // Only in the morning window and on active days; a late start never sends yesterday's plan at noon.
    const hour = localHour(now, timezone);
    if (hour < dailyPlanHour || hour >= 12 || !preferences.activeStudyDays.includes(weekday(today))) continue;
    if (!(await claim(user.id, 'daily-plan', today))) continue;
    const { start, end } = dayBounds(today, timezone);
    const sessions = await StudySession.findAll({
      where: { userId: user.id, status: { [Op.ne]: 'cancelled' }, startTime: { [Op.gte]: start, [Op.lt]: end } },
      include: [{ model: Course, as: 'course', attributes: ['name'] }],
      order: [['startTime', 'ASC']],
    });
    const goal = Math.round(preferences.dailyStudyGoal * 60);
    if (!sessions.length && !goal) continue;
    const lines = [
      `Günaydın ${user.firstName},`,
      goal ? `Bugünkü hedefin: ${formatGoalMinutes(goal)}.` : '',
      sessions.length ? `Bugün planlı ${sessions.length} ${terms.session()}:` : `Bugün için planlı ${terms.session()} yok.`,
      ...sessions.map((session) => `• ${sessionLine(session, timezone, (session as StudySession & { course?: Course }).course?.name)}`),
    ];
    await mailer.send(composeMail(user.email, siteName, sessions.length ? `Bugünün planı: ${sessions.length} ${terms.session()}` : 'Bugün için plan yok', lines, { label: 'Günü planla', path: `/planner?date=${today}` }))
      .catch((error: unknown) => console.error('Daily plan mail failed:', error instanceof Error ? error.message : error));
  }
}

async function sendWeeklySummaries(now: Date, recipients: Recipient[], siteName: string) {
  for (const { user, preferences, terms } of recipients) {
    if (!resolveNotifications(preferences).weeklySummaryEmail) continue;
    const { timezone } = preferences;
    const today = dateKeyInZone(now, timezone);
    const weekStart = addDateDays(today, -daysSinceWeekStart(weekday(today), resolveWeekStart(preferences)));
    // On the week's last day, in the evening window only.
    if (addDateDays(weekStart, 6) !== today || localHour(now, timezone) < weeklySummaryHour) continue;
    if (!(await claim(user.id, 'weekly-summary', weekStart))) continue;
    const stats = await getStudyStats(user.id, timezone, { startDate: weekStart, endDate: today });
    const goalMinutes = Math.round(weeklyGoalHours(preferences) * 60);
    const studied = Math.floor(stats.studySeconds / 60);
    const named = stats.courses.filter((row) => row.courseId !== null).slice(0, 5);
    const courses = named.length ? await Course.findAll({ where: { id: named.map((row) => row.courseId!) }, attributes: ['id', 'name'] }) : [];
    const lines = [
      `Merhaba ${user.firstName}, haftanın özeti:`,
      `Ölçülen çalışma: ${studied ? formatGoalMinutes(studied) : '0 dk'}${goalMinutes ? ` / hedef ${formatGoalMinutes(goalMinutes)} (%${Math.min(999, Math.round((studied / goalMinutes) * 100))})` : ''}.`,
      `Tamamlanan ${terms.session()}: ${stats.completedSessions}.`,
      ...(named.length ? [`En çok zaman ayırdığın ${terms.course({ plural: true })}:`] : []),
      ...named.map((row) => `• ${courses.find((course) => course.id === row.courseId)?.name ?? '—'}: ${formatGoalMinutes(Math.max(1, Math.floor(row.studySeconds / 60)))}`),
    ];
    await mailer.send(composeMail(user.email, siteName, `Haftalık özet: ${studied ? formatGoalMinutes(studied) : '0 dk'}`, lines, { label: 'İstatistikleri aç', path: '/stats' }))
      .catch((error: unknown) => console.error('Weekly summary mail failed:', error instanceof Error ? error.message : error));
  }
}

/** One scheduler tick: everything that is due at `now`, each at most once. */
export async function runDueNotifications(now = new Date()): Promise<void> {
  const settings = await readSiteSettings();
  const channels = channelsFor(settings);
  if (!channels.email.enabled && !channels.push.enabled) return;
  const recipients: Recipient[] = (await User.findAll({ where: { isActive: true } }))
    .filter((user) => {
      const options = resolveNotifications(user.preferences);
      return options.sessionReminderEmail || options.sessionReminderPush || options.dailyPlanEmail || options.weeklySummaryEmail;
    })
    .map((user) => ({ user, preferences: user.preferences, terms: createTerms(resolveTerminologyPreset(user.preferences, settings.terminologyPreset)) }));
  if (!recipients.length) return;
  await sendSessionReminders(now, recipients, channels, settings.siteName);
  if (channels.email.enabled) {
    await sendDailyPlans(now, recipients, settings.siteName);
    await sendWeeklySummaries(now, recipients, settings.siteName);
  }
  // The claims only need to outlive the occasions they guard.
  await NotificationDelivery.destroy({ where: { createdAt: { [Op.lt]: new Date(now.getTime() - 60 * 86_400_000) } } });
}

/** Sends one sample now so the user can check a channel. */
export async function sendTestNotification(userId: number, channel: 'email' | 'push'): Promise<{ delivered: number }> {
  const settings = await readSiteSettings();
  const channels = channelsFor(settings);
  const user = await User.findByPk(userId);
  if (!user) fail(404, 'Kullanıcı bulunamadı');
  if (channel === 'email') {
    if (!channels.email.enabled) fail(400, 'E-posta bildirimleri bu sitede kapalı');
    await mailer.send(composeMail(user.email, settings.siteName, 'Deneme bildirimi', [`Merhaba ${user.firstName},`, 'E-posta bildirimleri çalışıyor.'], { label: 'Bildirim ayarları', path: '/settings' }));
    return { delivered: 1 };
  }
  if (!channels.push.enabled) fail(400, 'Tarayıcı bildirimleri bu sitede kapalı');
  const delivered = await pushTo(user.id, { title: 'Deneme bildirimi', body: 'Tarayıcı bildirimleri çalışıyor.', url: '/settings', tag: 'test' });
  if (!delivered) fail(409, 'Bu hesap için bildirime abone bir tarayıcı yok');
  return { delivered };
}
