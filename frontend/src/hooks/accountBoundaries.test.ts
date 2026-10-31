import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultPreferences } from '@study-tracker/contracts';
vi.mock('../services/api',()=>({authAPI:{updateProfile:vi.fn()}}));
import { useCurrentDateKey, dateKeyAt } from './useCurrentDateKey';
import { useUserPreferencesStore } from '../store/userPreferencesStore';
import { useReadNotifications } from './useReadNotifications';
import { clearLegacyStorage } from '../lib/legacyStorage';
afterEach(()=>{cleanup();vi.useRealTimers();localStorage.clear();});
it('removes unowned browser preferences from older versions without adopting them for another account',()=>{
 localStorage.setItem('user-preferences-storage','{"state":{"preferences":{"theme":"dark"}}}');
 localStorage.setItem('readNotifications','[12]');
 localStorage.setItem('unassigned-account-state','{}');
 localStorage.setItem('auth-storage','{"state":{"accessToken":"old"}}');
 clearLegacyStorage();
 for (const key of ['user-preferences-storage','readNotifications','unassigned-account-state','auth-storage']) expect(localStorage.getItem(key)).toBeNull();
 useUserPreferencesStore.getState().bindUser('B',defaultPreferences);
 expect(useUserPreferencesStore.getState().preferences.theme).toBe('system');
});
it('changes the current date key after midnight in the selected timezone',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-15T20:59:59Z'));useUserPreferencesStore.getState().bindUser('A',defaultPreferences);
 const {result}=renderHook(()=>useCurrentDateKey());expect(result.current).toBe('2026-10-15');
 act(()=>vi.advanceTimersByTime(30000));expect(result.current).toBe('2026-10-16');expect(dateKeyAt(new Date('2026-10-15T21:00:00Z'),'UTC')).toBe('2026-10-15');
});
it('keeps read notifications separated by account and ignores corrupt storage',()=>{
 localStorage.setItem('read-notifications:B','invalid');const {result,rerender}=renderHook(({id})=>useReadNotifications(id),{initialProps:{id:'A' as string|null}});
 act(()=>result.current.markRead([12]));expect(result.current.ids.has(12)).toBe(true);
 rerender({id:'B'});expect(result.current.ids.size).toBe(0);act(()=>result.current.markRead([34]));
 rerender({id:'A'});expect([...result.current.ids]).toEqual([12]);rerender({id:null});expect(result.current.ids.size).toBe(0);expect(JSON.parse(localStorage.getItem('read-notifications:B') || '[]')).toEqual([34]);
});
