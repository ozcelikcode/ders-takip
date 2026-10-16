import { beforeEach, expect, it, vi } from 'vitest';
import { defaultSiteSettings, defaultPreferences, publicSettingsSchema } from '@study-tracker/contracts';
vi.mock('../services/api',()=>({settingsAPI:{getSettings:vi.fn(),getAdminSettings:vi.fn(),updateSettings:vi.fn()}}));
import { settingsAPI } from '../services/api';
import { useSettingsStore as store } from './settingsStore';
import { applyAppearance } from '../lib/appearance';
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();store.getState().clearAdminSettings();});
it('loads administrator settings only into memory and caches public branding alone',async()=>{
 vi.mocked(settingsAPI.getAdminSettings).mockResolvedValue({data:{data:{...defaultSiteSettings,siteName:'Yeni İsim',adminEmail:'private@example.com'}}} as Awaited<ReturnType<typeof settingsAPI.getAdminSettings>>);
 await store.getState().fetchAdminSettings();expect(store.getState().adminSettings?.adminEmail).toBe('private@example.com');
 const cached=JSON.parse(localStorage.getItem('site-branding') || '{}');expect(cached.siteName).toBe('Yeni İsim');expect(cached.adminEmail).toBeUndefined();expect(cached.backup_interval).toBeUndefined();
 store.getState().clearAdminSettings();expect(store.getState().adminSettings).toBeNull();
});
it('ignores late private settings after an account boundary',async()=>{
 let complete!: (value: unknown)=>void;vi.mocked(settingsAPI.getAdminSettings).mockReturnValue(new Promise<unknown>(resolve=>{complete=resolve;}) as ReturnType<typeof settingsAPI.getAdminSettings>);
 const pending=store.getState().fetchAdminSettings();store.getState().clearAdminSettings();complete({data:{data:defaultSiteSettings}});await pending;
 expect(store.getState().adminSettings).toBeNull();expect(localStorage.length).toBe(0);
});
it('does not replace a newly saved name with an older public response',async()=>{
 let complete!: (value: unknown)=>void;vi.mocked(settingsAPI.getSettings).mockReturnValue(new Promise<unknown>(resolve=>{complete=resolve;}) as ReturnType<typeof settingsAPI.getSettings>);
 const pending=store.getState().fetchSettings();vi.mocked(settingsAPI.updateSettings).mockResolvedValue({data:{data:{...defaultSiteSettings,siteName:'Yeni İsim'}}} as Awaited<ReturnType<typeof settingsAPI.updateSettings>>);
 await store.getState().updateSettings({siteName:'Yeni İsim'});complete({data:{data:publicSettingsSchema.parse(defaultSiteSettings)}});await pending;expect(store.getState().settings.siteName).toBe('Yeni İsim');
});
it('applies name and metadata consistently and restores site color when a user override is removed',()=>{
 document.head.innerHTML='<title></title><meta name="description"><meta name="application-name"><meta property="og:site_name"><link rel="icon">';
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false})));
 const site={...defaultSiteSettings,siteName:'Yeni İsim',siteDescription:'Açıklama'};
 applyAppearance({...defaultPreferences,customPrimaryColor:'#ff0000'},site);expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('255 0 0');
 applyAppearance(defaultPreferences,site);expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('59 130 246');expect(document.title).toBe('Yeni İsim');expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Açıklama');expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('Yeni İsim');
});
