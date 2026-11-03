import { defaultPreferences, defaultSiteSettings } from '@study-tracker/contracts';
import { afterEach, expect, it } from 'vitest';
import { applyAppearance } from './appearance';

afterEach(() => { document.head.innerHTML = ''; });

it('gives the browser bar the accent color and the tab the site icon', () => {
  document.head.innerHTML = '<meta name="theme-color" content="#171717"><link rel="icon" href="/brand-mark.svg">';
  applyAppearance({ ...defaultPreferences, theme: 'light' }, { ...defaultSiteSettings, primaryColor: '#16A34A', siteIcon: 'Calendar' });
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#16A34A');
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/brand-icons/Calendar.svg');
  // A person's own accent wins over the site's, the same as in the interface.
  applyAppearance({ ...defaultPreferences, theme: 'light', customPrimaryColor: '#DC2626' }, { ...defaultSiteSettings, primaryColor: '#16A34A' });
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#DC2626');
});
