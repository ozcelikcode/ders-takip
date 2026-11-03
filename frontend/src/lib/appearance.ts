import { siteIconUrl, type PublicSettings, type UserPreferences } from '@study-tracker/contracts';
const rgb = (hex: string) => hex.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16)).join(' ');
export const applyAppearance = (preferences: UserPreferences, settings: PublicSettings) => {
  const root = document.documentElement;
  root.classList.toggle('dark', preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const primary = preferences.customPrimaryColor || settings.primaryColor;
  root.style.setProperty('--primary-rgb', rgb(primary) || '59 130 246');
  // The phone's address bar and an installed app's title bar take the same accent as the interface.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primary);
  document.title = settings.siteName;
  document.querySelector('meta[name="application-name"]')?.setAttribute('content', settings.siteName);
  document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', settings.siteName);
  const meta = document.querySelector('meta[name="description"]');
  meta?.setAttribute('content', settings.siteDescription);
  document.querySelector('link[rel="icon"]')?.setAttribute('href', siteIconUrl(settings.siteIcon));
};
