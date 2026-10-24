import {
  addDateDays,
  createTerms,
  dailyPlanHour,
  dateKeyInZone,
  dayBounds,
  daysSinceWeekStart,
  fail,
  formatGoalMinutes,
  formatZonedTime,
  notificationText,
  resolveNotifications,
  resolveTerminology,
  resolveWeekStart,
  weeklyGoalHours,
  weeklySummaryHour,
  type NotificationChannels,
  type Language,
  type NotificationText,
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

/** A channel works only when the operator configured it and the admin's site switch allows it. */
export const channelsFor = (settings: Pick<SiteSettings, 'emailNotifications' | 'pushNotifications'>): NotificationChannels => ({
  email: { configured: mailer.enabled(), enabled: mailer.enabled() && settings.emailNotifications },
  push: { configured: pushSender.enabled(), enabled: pushSender.enabled() && settings.pushNotifications, publicKey: pushSender.enabled() && settings.pushNotifications ? pushSender.publicKey() : null },
});
export const readChannels = async () => channelsFor(await readSiteSettings());

/** Stores this browser for the account; an endpoint moves to whoever subscribed last on that browser. */
export async function savePushSubscription(userId: number, input: PushSubscriptionInput): Promise<void> {
  if (!(await readChannels()).push.enabled) fail(400, 'pushDisabled');
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
function composeMail(to: string, siteName: string, text: NotificationText, subject: string, lines: string[], link: { label: string; path: string }): MailMessage {
  const url = appLink(link.path);
  const footer = text.footer(siteName);
  return {
    to,
    subject: `${subject} · ${siteName}`,
    text: [...lines, '', `${link.label}: ${url}`, '', footer].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b">${lines.map((line) => (line ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>` : '')).join('')}<p style="margin:16px 0"><a href="${escapeHtml(url)}">${escapeHtml(link.label)}</a></p><p style="margin:16px 0 0;font-size:12px;color:#71717a">${escapeHtml(footer)}</p></div>`,
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
/** Everyone gets mail in the site's one language. */
interface Site { name: string; language: Language; text: NotificationText }

async function sendSessionReminders(now: Date, recipients: Recipient[], channels: NotificationChannels, site: Site) {
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
    const { text } = site;
    const title = text.reminderTitle(session.title, minutes);
    const body = sessionLine(session, timezone, courseName);
    if (email) {
      await mailer.send(composeMail(recipient.user.email, site.name, text, title, [text.reminderGreeting(recipient.user.firstName), text.reminderLead(recipient.terms, minutes), body], { label: text.openPlanner, path: `/planner?date=${date}` }))
        .catch((error: unknown) => console.error('Reminder mail failed:', error instanceof Error ? error.message : error));
    }
    if (push) await pushTo(recipient.user.id, { title, body, url: `/planner?date=${date}`, tag: `session-${session.id}` });
  }
}

async function sendDailyPlans(now: Date, recipients: Recipient[], site: Site) {
  const { text, language } = site;
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
      text.dailyGreeting(user.firstName),
      goal ? text.dailyGoal(formatGoalMinutes(goal, language)) : '',
      sessions.length ? text.dailySessions(terms, sessions.length) : text.dailyNoSessions(terms),
      ...sessions.map((session) => `• ${sessionLine(session, timezone, (session as StudySession & { course?: Course }).course?.name)}`),
    ];
    await mailer.send(composeMail(user.email, site.name, text, sessions.length ? text.dailySubject(terms, sessions.length) : text.dailyNoPlan, lines, { label: text.planDay, path: `/planner?date=${today}` }))
      .catch((error: unknown) => console.error('Daily plan mail failed:', error instanceof Error ? error.message : error));
  }
}

async function sendWeeklySummaries(now: Date, recipients: Recipient[], site: Site) {
  const { text, language } = site;
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
    const studiedText = studied ? formatGoalMinutes(studied, language) : text.noStudy;
    const lines = [
      text.weeklyGreeting(user.firstName),
      text.weeklyStudied(studiedText, goalMinutes ? formatGoalMinutes(goalMinutes, language) : null, goalMinutes ? Math.min(999, Math.round((studied / goalMinutes) * 100)) : 0),
      text.weeklyCompleted(terms, stats.completedSessions),
      ...(named.length ? [text.weeklyTopRecords(terms)] : []),
      ...named.map((row) => `• ${courses.find((course) => course.id === row.courseId)?.name ?? '—'}: ${formatGoalMinutes(Math.max(1, Math.floor(row.studySeconds / 60)), language)}`),
    ];
    await mailer.send(composeMail(user.email, site.name, text, text.weeklySubject(studiedText), lines, { label: text.openStats, path: '/stats' }))
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
    .map((user) => ({
      user,
      preferences: user.preferences,
      terms: createTerms(resolveTerminology(user.preferences, settings, settings.language), settings.language),
    }));
  if (!recipients.length) return;
  const site: Site = { name: settings.siteName, language: settings.language, text: notificationText[settings.language] };
  await sendSessionReminders(now, recipients, channels, site);
  if (channels.email.enabled) {
    await sendDailyPlans(now, recipients, site);
    await sendWeeklySummaries(now, recipients, site);
  }
  // The claims only need to outlive the occasions they guard.
  await NotificationDelivery.destroy({ where: { createdAt: { [Op.lt]: new Date(now.getTime() - 60 * 86_400_000) } } });
}

/** Sends one sample now so the user can check a channel. */
export async function sendTestNotification(userId: number, channel: 'email' | 'push'): Promise<{ delivered: number }> {
  const settings = await readSiteSettings();
  const channels = channelsFor(settings);
  const user = await User.findByPk(userId);
  if (!user) fail(404, 'userNotFound');
  const text = notificationText[settings.language];
  if (channel === 'email') {
    if (!channels.email.enabled) fail(400, 'emailDisabled');
    await mailer.send(composeMail(user.email, settings.siteName, text, text.testTitle, [text.testGreeting(user.firstName), text.testEmailBody], { label: text.notificationSettings, path: '/settings' }));
    return { delivered: 1 };
  }
  if (!channels.push.enabled) fail(400, 'pushDisabled');
  const delivered = await pushTo(user.id, { title: text.testTitle, body: text.testPushBody, url: '/settings', tag: 'test' });
  if (!delivered) fail(409, 'noPushSubscription');
  return { delivered };
}
