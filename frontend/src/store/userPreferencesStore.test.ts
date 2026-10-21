import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences } from '@study-tracker/contracts';
vi.mock('../services/api', () => ({ authAPI: { updateProfile: vi.fn() } }));
import { authAPI } from '../services/api';
import { useUserPreferencesStore as store } from './userPreferencesStore';
const response = (preferences = defaultPreferences) => ({data:{success:true,data:{user:{preferences}}}});
const deferred = () => { let resolve!: (value: unknown) => void; let reject!: (error: Error) => void; const promise = new Promise((resolveValue, rejectValue) => {resolve=resolveValue;reject=rejectValue;});return {promise,resolve,reject}; };
beforeEach(()=>{vi.mocked(authAPI.updateProfile).mockReset();store.getState().bindUser('A',defaultPreferences);localStorage.clear();});
describe('optimistic account preferences confirmed by the server',()=>{
 it('shows a change at once, marks it pending, takes the server answer and persists no private cache',async()=>{
  const pending=deferred();vi.mocked(authAPI.updateProfile).mockReturnValue(pending.promise as ReturnType<typeof authAPI.updateProfile>);
  const saved=store.getState().updatePreferences({theme:'dark'});
  expect(store.getState().pending).toBe(1);expect(store.getState().preferences.theme).toBe('dark');
  pending.resolve(response({...defaultPreferences,theme:'dark',defaultShortBreak:7}));await saved;
  expect(store.getState().preferences.theme).toBe('dark');expect(store.getState().preferences.defaultShortBreak).toBe(7);expect(store.getState().pending).toBe(0);expect(localStorage.length).toBe(0);
 });
 it('undoes a failed change and surfaces the failure',async()=>{
  vi.mocked(authAPI.updateProfile).mockRejectedValue(new Error('Offline'));
  await expect(store.getState().updatePreferences({theme:'dark'})).rejects.toThrow('Offline');
  expect(store.getState().preferences).toEqual(defaultPreferences);expect(store.getState().error).toContain('kaydedilemedi');expect(store.getState().pending).toBe(0);
 });
 it('serializes rapid patches without replacing unrelated preferences',async()=>{
  const first=deferred();vi.mocked(authAPI.updateProfile).mockReturnValueOnce(first.promise as ReturnType<typeof authAPI.updateProfile>).mockResolvedValueOnce(response({...defaultPreferences,theme:'dark',dailyStudyGoal:6}) as Awaited<ReturnType<typeof authAPI.updateProfile>>);
  const theme=store.getState().updatePreferences({theme:'dark'});const goal=store.getState().updatePreferences({dailyStudyGoal:6});
  await vi.waitFor(()=>expect(authAPI.updateProfile).toHaveBeenCalledTimes(1));
  first.resolve(response({...defaultPreferences,theme:'dark'}));await Promise.all([theme,goal]);
  expect(authAPI.updateProfile).toHaveBeenLastCalledWith({preferences:{dailyStudyGoal:6}});expect(store.getState().preferences.dailyStudyGoal).toBe(6);expect(store.getState().preferences.theme).toBe('dark');
 });
 it('undoes only the failed change while a later one stays on screen',async()=>{
  const first=deferred();const second=deferred();
  vi.mocked(authAPI.updateProfile).mockReturnValueOnce(first.promise as ReturnType<typeof authAPI.updateProfile>).mockReturnValueOnce(second.promise as ReturnType<typeof authAPI.updateProfile>);
  const theme=store.getState().updatePreferences({theme:'dark'}).catch(()=>'failed');const goal=store.getState().updatePreferences({dailyStudyGoal:6});
  expect(store.getState().preferences).toMatchObject({theme:'dark',dailyStudyGoal:6});
  await vi.waitFor(()=>expect(authAPI.updateProfile).toHaveBeenCalledTimes(1));
  first.reject(new Error('Offline'));
  expect(await theme).toBe('failed');
  expect(store.getState().preferences).toMatchObject({theme:'system',dailyStudyGoal:6});expect(store.getState().error).toContain('kaydedilemedi');
  second.resolve(response({...defaultPreferences,dailyStudyGoal:6}));await goal;
  expect(store.getState().preferences).toMatchObject({theme:'system',dailyStudyGoal:6});expect(store.getState().error).toBeNull();expect(store.getState().pending).toBe(0);
 });
 it('derives the weekly goal from an unsaved daily goal the same way the server does',()=>{
  vi.mocked(authAPI.updateProfile).mockReturnValue(deferred().promise as ReturnType<typeof authAPI.updateProfile>);
  void store.getState().updatePreferences({dailyStudyGoal:2,activeStudyDays:[1,2,3]});
  expect(store.getState().preferences.weeklyStudyGoal).toBe(6);
 });
 it('discards a late response and cancels queued writes after switching accounts',async()=>{
  const first=deferred();vi.mocked(authAPI.updateProfile).mockReturnValue(first.promise as ReturnType<typeof authAPI.updateProfile>);
  const save=store.getState().updatePreferences({theme:'dark'}).catch(()=>undefined);
  const queued=store.getState().updatePreferences({dailyStudyGoal:9}).catch(()=>undefined);
  await vi.waitFor(()=>expect(authAPI.updateProfile).toHaveBeenCalledTimes(1));
  store.getState().bindUser('B',{...defaultPreferences,theme:'light'});
  first.resolve(response({...defaultPreferences,theme:'dark'}));await Promise.all([save,queued]);
  expect(authAPI.updateProfile).toHaveBeenCalledTimes(1);expect(store.getState().userId).toBe('B');expect(store.getState().preferences.theme).toBe('light');expect(store.getState().pending).toBe(0);
  store.getState().bindUser(null);expect(store.getState().preferences).toEqual(defaultPreferences);
 });
 it('sends reset values through the same contract and rejects invalid writes before transport',async()=>{
  vi.mocked(authAPI.updateProfile).mockResolvedValue(response() as Awaited<ReturnType<typeof authAPI.updateProfile>>);
  await store.getState().resetPreferences();expect(vi.mocked(authAPI.updateProfile).mock.calls[0]?.[0].preferences).toHaveProperty('schemaVersion', 1);
  await expect(store.getState().updatePreferences({timezone:'invalid'})).rejects.toThrow();expect(authAPI.updateProfile).toHaveBeenCalledTimes(1);
 });
});
