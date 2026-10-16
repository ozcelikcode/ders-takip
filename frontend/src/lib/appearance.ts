import { brandIconNames, type PublicSettings, type UserPreferences } from '@study-tracker/contracts';
const rgb = (hex: string) => hex.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16)).join(' ');
export const applyAppearance = (preferences: UserPreferences, settings: PublicSettings) => {
  const root = document.documentElement;
  root.classList.toggle('dark', preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  root.style.setProperty('--color-primary', rgb(preferences.customPrimaryColor || settings.primaryColor) || '59 130 246');
  root.style.setProperty('--color-secondary', rgb(settings.secondaryColor) || '16 185 129');
  document.title = settings.siteName;
  document.querySelector('meta[name="application-name"]')?.setAttribute('content', settings.siteName);
  document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', settings.siteName);
  const meta = document.querySelector('meta[name="description"]');
  meta?.setAttribute('content', settings.siteDescription);
  const icon = settings.siteIcon;
  const isNamedIcon = brandIconNames.some(name => name === icon);
  document.querySelector('link[rel="icon"]')?.setAttribute('href', isNamedIcon ? `/brand-icons/${icon}.svg` : icon || '/brand-mark.svg');
};
