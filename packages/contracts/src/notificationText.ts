import type { Language } from './language.js';
import type { Terms } from './terminology.js';

/** Words for emails and browser notifications, sent in the recipient's interface language. */
export interface NotificationText {
  footer: (siteName: string) => string;
  reminderTitle: (title: string, minutes: number) => string;
  reminderGreeting: (name: string) => string;
  reminderLead: (t: Terms, minutes: number) => string;
  openPlanner: string;
  dailyGreeting: (name: string) => string;
  dailyGoal: (goal: string) => string;
  dailySessions: (t: Terms, count: number) => string;
  dailyNoSessions: (t: Terms) => string;
  dailySubject: (t: Terms, count: number) => string;
  dailyNoPlan: string;
  planDay: string;
  weeklyGreeting: (name: string) => string;
  noStudy: string;
  weeklyStudied: (studied: string, goal: string | null, percent: number) => string;
  weeklyCompleted: (t: Terms, count: number) => string;
  weeklyTopRecords: (t: Terms) => string;
  weeklySubject: (studied: string) => string;
  openStats: string;
  goalTitle: (remaining: string) => string;
  goalBody: (studied: string, goal: string) => string;
  testTitle: string;
  testGreeting: (name: string) => string;
  testEmailBody: string;
  testPushBody: string;
  notificationSettings: string;
  resetSubject: (siteName: string) => string;
  resetIntro: string;
  resetAction: string;
  resetIgnore: string;
}

export const notificationText: Record<Language, NotificationText> = {
  tr: {
    footer: (siteName) => `Bu e-postayı ${siteName} bildirim ayarlarına göre aldın; Ayarlar › Bildirimler'den kapatabilirsin.`,
    reminderTitle: (title, minutes) => `“${title}” ${minutes} dk sonra başlıyor`,
    reminderGreeting: (name) => `Merhaba ${name},`,
    reminderLead: (t, minutes) => `${t.session({ capitalize: true })} ${minutes} dakika sonra başlıyor:`,
    openPlanner: 'Planlayıcıda aç',
    dailyGreeting: (name) => `Günaydın ${name},`,
    dailyGoal: (goal) => `Bugünkü hedefin: ${goal}.`,
    dailySessions: (t, count) => `Bugün planlı ${count} ${t.session()}:`,
    dailyNoSessions: (t) => `Bugün için planlı ${t.session()} yok.`,
    dailySubject: (t, count) => `Bugünün planı: ${count} ${t.session()}`,
    dailyNoPlan: 'Bugün için plan yok',
    planDay: 'Günü planla',
    weeklyGreeting: (name) => `Merhaba ${name}, haftanın özeti:`,
    noStudy: '0 dk',
    weeklyStudied: (studied, goal, percent) => `Ölçülen çalışma: ${studied}${goal ? ` / hedef ${goal} (%${percent})` : ''}.`,
    weeklyCompleted: (t, count) => `Tamamlanan ${t.session()}: ${count}.`,
    weeklyTopRecords: (t) => `En çok zaman ayırdığın ${t.course({ plural: true })}:`,
    weeklySubject: (studied) => `Haftalık özet: ${studied}`,
    openStats: 'İstatistikleri aç',
    goalTitle: (remaining) => `Bugünkü hedefine ${remaining} kaldı`,
    goalBody: (studied, goal) => `Bugün ${studied} çalıştın; günlük hedefin ${goal}.`,
    testTitle: 'Deneme bildirimi',
    testGreeting: (name) => `Merhaba ${name},`,
    testEmailBody: 'E-posta bildirimleri çalışıyor.',
    testPushBody: 'Tarayıcı bildirimleri çalışıyor.',
    notificationSettings: 'Bildirim ayarları',
    resetSubject: (siteName) => `${siteName} şifre sıfırlama`,
    resetIntro: 'Şifrenizi sıfırlamak için bağlantıyı 30 dakika içinde açın:',
    resetAction: 'Şifremi sıfırla',
    resetIgnore: 'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.',
  },
  en: {
    footer: (siteName) => `You received this email because of your ${siteName} notification settings; turn it off in Settings › Notifications.`,
    reminderTitle: (title, minutes) => `“${title}” starts in ${minutes} min`,
    reminderGreeting: (name) => `Hello ${name},`,
    reminderLead: (t, minutes) => `Your ${t.session()} starts in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}:`,
    openPlanner: 'Open in the planner',
    dailyGreeting: (name) => `Good morning ${name},`,
    dailyGoal: (goal) => `Today's goal: ${goal}.`,
    dailySessions: (t, count) => `${count} ${t.session({ plural: count !== 1 })} planned for today:`,
    dailyNoSessions: (t) => `No ${t.session({ plural: true })} planned for today.`,
    dailySubject: (t, count) => `Today's plan: ${count} ${t.session({ plural: count !== 1 })}`,
    dailyNoPlan: 'Nothing planned for today',
    planDay: 'Plan the day',
    weeklyGreeting: (name) => `Hello ${name}, here is your week:`,
    noStudy: '0 min',
    weeklyStudied: (studied, goal, percent) => `Measured study: ${studied}${goal ? ` / goal ${goal} (${percent}%)` : ''}.`,
    weeklyCompleted: (t, count) => `Completed ${t.session({ plural: true })}: ${count}.`,
    weeklyTopRecords: (t) => `The ${t.course({ plural: true })} you spent the most time on:`,
    weeklySubject: (studied) => `Weekly summary: ${studied}`,
    openStats: 'Open statistics',
    goalTitle: (remaining) => `${remaining} left of today's goal`,
    goalBody: (studied, goal) => `You have studied ${studied} today; your daily goal is ${goal}.`,
    testTitle: 'Test notification',
    testGreeting: (name) => `Hello ${name},`,
    testEmailBody: 'Email notifications are working.',
    testPushBody: 'Browser notifications are working.',
    notificationSettings: 'Notification settings',
    resetSubject: (siteName) => `${siteName} password reset`,
    resetIntro: 'Open this link within 30 minutes to reset your password:',
    resetAction: 'Reset my password',
    resetIgnore: 'If you did not ask for this, ignore this email; your password stays the same.',
  },
};
