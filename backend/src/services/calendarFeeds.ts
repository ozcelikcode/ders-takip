import { createHash, randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { calendarFeedTokenPattern, calendarFeedWindowDays } from '@study-tracker/contracts';
import { getEnvironment } from '../config/environment';
import { sequelize } from '../config/database';
import { CalendarFeed, Course, StudySession, User } from '../models';
import { readSiteSettings } from './siteSettings';

const dayMs = 86_400_000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const feedUrl = (token: string) => new URL(`/api/calendar/${token}.ics`, getEnvironment().FRONTEND_URL).toString();

export async function calendarFeedStatus(userId: number) {
  const feed = await CalendarFeed.findByPk(userId);
  return { active: !!feed, createdAt: feed?.createdAt.toISOString() ?? null };
}

/** Starts or renews the subscription; any earlier address stops working. The address is returned only here. */
export async function createCalendarFeed(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const feed = await sequelize.transaction(async (transaction) => {
    await CalendarFeed.destroy({ where: { userId }, transaction });
    return CalendarFeed.create({ userId, tokenHash: hashToken(token) }, { transaction });
  });
  return { url: feedUrl(token), createdAt: feed.createdAt.toISOString() };
}

export const deleteCalendarFeed = (userId: number) => CalendarFeed.destroy({ where: { userId } });

// RFC 5545: TEXT values escape \ ; , and newlines; lines fold at 75 octets without splitting a UTF-8 character.
const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const foldLine = (line: string) => {
  const parts: string[] = [];
  let current = '';
  let limit = 75;
  for (const char of line) {
    if (Buffer.byteLength(current + char) > limit) {
      parts.push(current);
      current = '';
      limit = 74;
    }
    current += char;
  }
  parts.push(current);
  return parts.join('\r\n ');
};
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * The person's sessions as an iCalendar feed: title and record name only, never notes or descriptions.
 * Returns null for an unknown key or an inactive account; 'maintenance' while the site is closed to them.
 */
export async function renderCalendarFeed(token: string, now = new Date(Date.now())): Promise<string | null | 'maintenance'> {
  if (!calendarFeedTokenPattern.test(token)) return null;
  const feed = await CalendarFeed.findOne({ where: { tokenHash: hashToken(token) } });
  const user = feed ? await User.findByPk(feed.userId) : null;
  if (!user?.isActive) return null;
  const site = await readSiteSettings();
  if (site.maintenanceMode && user.role !== 'admin') return 'maintenance';
  const sessions = await StudySession.findAll({
    where: {
      userId: user.id,
      status: { [Op.ne]: 'cancelled' },
      startTime: { [Op.gte]: new Date(now.getTime() - calendarFeedWindowDays.past * dayMs), [Op.lte]: new Date(now.getTime() + calendarFeedWindowDays.ahead * dayMs) },
    },
    include: [{ model: Course, as: 'course', attributes: ['name'] }],
    order: [['startTime', 'ASC']],
  });
  const host = new URL(getEnvironment().FRONTEND_URL).hostname;
  const stamp = utc(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//study-tracker//calendar feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(site.siteName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...sessions.flatMap((session) => {
      const course = (session as StudySession & { course?: Course }).course?.name;
      return [
        'BEGIN:VEVENT',
        `UID:session-${session.id}@${host}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utc(session.startTime)}`,
        `DTEND:${utc(session.endTime)}`,
        `SUMMARY:${escapeText(course ? `${session.title} · ${course}` : session.title)}`,
        'END:VEVENT',
      ];
    }),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
