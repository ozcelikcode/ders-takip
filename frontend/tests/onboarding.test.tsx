import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultPreferences, type UserPreferences } from '@study-tracker/contracts';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OnboardingGate from '../src/components/auth/OnboardingGate';
import { useTerms } from '../src/hooks/useTerms';
import WelcomePage from '../src/pages/onboarding/WelcomePage';
import AppearanceTab from '../src/pages/settings/AppearanceTab';
import StudyTab from '../src/pages/settings/StudyTab';
import { choosePurpose, initialDraft, toOnboardingInput } from '../src/pages/onboarding/onboardingModel';
import { useAuthStore } from '../src/store/authStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const preferences = (patch: Partial<UserPreferences> = {}): UserPreferences => ({ ...defaultPreferences, timezone: 'Europe/Berlin', ...patch });
const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/dashboard" element={<OnboardingGate><p>Pano</p></OnboardingGate>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
const next = () => fireEvent.click(screen.getByRole('button', { name: 'İleri' }));
const heading = () => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => {
  useAuthStore.setState({ user: { id: '7', firstName: 'Deniz' } as never, completeOnboarding: vi.fn().mockResolvedValue(undefined) });
  useUserPreferencesStore.setState({ preferences: preferences({ onboarding: 'pending' }), updatePreferences: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('sends pending accounts to the wizard and lets finished or older accounts through', () => {
  renderAt('/dashboard');
  expect(heading()).toBe('Hoş geldin, Deniz');
  cleanup();
  useUserPreferencesStore.setState({ preferences: preferences({ onboarding: 'done' }) });
  renderAt('/welcome');
  expect(screen.getByText('Pano')).toBeTruthy();
  cleanup();
  useUserPreferencesStore.setState({ preferences: preferences() });
  renderAt('/dashboard');
  expect(screen.getByText('Pano')).toBeTruthy();
});

it('walks through every step, validates each one and submits the chosen setup', async () => {
  renderAt('/welcome');
  next();
  expect(screen.getByRole('alert').textContent).toBe('Devam etmek için bir seçenek seçin.');
  fireEvent.click(screen.getByRole('radio', { name: /Beceri ve hobiler/ }));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.change(screen.getByLabelText(/Odak alanı/), { target: { value: ' Gitar ' } });
  next();

  expect(heading()).toBe('Zamanını planlayalım');
  expect((screen.getByLabelText('Günlük hedef (saat)') as HTMLInputElement).value).toBe('1');
  expect((screen.getByLabelText('Haftalık hedef (saat)') as HTMLInputElement).value).toBe('6');
  fireEvent.change(screen.getByLabelText('Günlük hedef (saat)'), { target: { value: '' } });
  next();
  expect(screen.getByRole('alert').textContent).toBe('Günlük hedef 0 ile 24 saat arasında olmalı.');
  fireEvent.change(screen.getByLabelText('Günlük hedef (saat)'), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pazar' }));
  fireEvent.click(within('Aktif günler', 'Cmt'));
  next();

  expect(heading()).toBe('Çalışma ritmin');
  expect((screen.getByRole('radio', { name: /Klasik/ }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: /Uzun odak/ }));
  next();

  // The words follow the chosen purpose before anything is saved.
  expect(heading()).toBe('İlk beceriler');
  expect((screen.getByLabelText('Kategori') as HTMLInputElement).value).toBe('Becerilerim');
  expect(screen.getByLabelText('Beceri 1').getAttribute('placeholder')).toBe('İngilizce');
  fireEvent.change(screen.getByLabelText('Beceri 1'), { target: { value: 'İngilizce' } });
  fireEvent.change(screen.getByLabelText('Beceri 2'), { target: { value: 'ingilizce' } });
  next();
  expect(screen.getByRole('alert').textContent).toBe('Aynı ad iki kez kullanılamaz.');
  fireEvent.change(screen.getByLabelText('Beceri 2'), { target: { value: 'Gitar' } });
  next();

  expect(heading()).toBe('Özet');
  expect(screen.getByText('Becerilerim: İngilizce, Gitar')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Kurulumu bitir' }));
  await waitFor(() => expect(useAuthStore.getState().completeOnboarding).toHaveBeenCalledTimes(1));
  expect(vi.mocked(useAuthStore.getState().completeOnboarding).mock.calls[0]![0]).toEqual({
    preferences: {
      terminologyPreset: 'skills', studyField: 'Gitar', timezone: 'Europe/Berlin', weekStartsOn: 0,
      activeStudyDays: [1, 2, 3, 4, 5, 0], dailyStudyGoal: 1.5, weeklyStudyGoal: 6,
      defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3,
    },
    workspace: { categoryName: 'Becerilerim', courseNames: ['İngilizce', 'Gitar'] },
  });
});

it('keeps the answers and shows the server message when finishing fails', async () => {
  useAuthStore.setState({ completeOnboarding: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: { message: 'Kurulum zaten tamamlandı' } } } })) });
  renderAt('/welcome');
  fireEvent.click(screen.getByRole('radio', { name: /İş ve projeler/ }));
  for (let step = 0; step < 4; step += 1) next();
  fireEvent.click(screen.getByRole('button', { name: 'Kurulumu bitir' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Kurulum zaten tamamlandı');
  expect(screen.getByRole('button', { name: 'Kurulumu bitir' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
  expect(heading()).toBe('İlk projeler');
});

it('can be skipped, which only marks onboarding finished', async () => {
  renderAt('/welcome');
  fireEvent.click(screen.getByRole('button', { name: 'Şimdilik atla' }));
  await waitFor(() => expect(useUserPreferencesStore.getState().updatePreferences).toHaveBeenCalledWith({ onboarding: 'done' }));
  expect(useAuthStore.getState().completeOnboarding).not.toHaveBeenCalled();
});

it('leaves out the workspace when no record name is filled', () => {
  const draft = choosePurpose(initialDraft(preferences()), 'personal');
  const input = toOnboardingInput({ ...draft, courseNames: [' ', '', ''] });
  expect(input?.workspace).toBeNull();
  expect(input?.preferences.terminologyPreset).toBe('goals');
  expect(toOnboardingInput(initialDraft(preferences()))).toBeNull();
});

it('a personal word set wins over the site preset', () => {
  const Words = () => <p>{useTerms().course({ capitalize: true })}</p>;
  useUserPreferencesStore.setState({ preferences: preferences({ terminologyPreset: 'goals' }) });
  render(<Words />);
  expect(screen.getByText('Hedef')).toBeTruthy();
  cleanup();
  useUserPreferencesStore.setState({ preferences: preferences({ terminologyPreset: null }) });
  render(<Words />);
  expect(screen.getByText('Ders')).toBeTruthy();
});

it('settings let a user pick their own word set and restart the wizard', () => {
  const onTerminologyChange = vi.fn();
  render(
    <AppearanceTab preferences={preferences({ terminologyPreset: 'skills' })} sitePrimaryColor="#3b82f6" siteTerminologyPreset="education" onThemeChange={vi.fn()} onColorChange={vi.fn()} onTerminologyChange={onTerminologyChange} />,
  );
  expect((screen.getByRole('radio', { name: /Beceri/ }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('radio', { name: /Site varsayılanı/ }).closest('label')?.textContent).toContain('Eğitim');
  fireEvent.click(screen.getByRole('radio', { name: /Site varsayılanı/ }));
  expect(onTerminologyChange).toHaveBeenCalledWith(null);
  cleanup();
  const onRestartOnboarding = vi.fn();
  const { activeStudyDays, dailyStudyGoal, weeklyStudyGoal, defaultPomodoroDuration, defaultShortBreak, defaultLongBreak, pomodorosUntilLongBreak } = defaultPreferences;
  render(
    <StudyTab studyPrefs={{ activeStudyDays: [...activeStudyDays], dailyStudyGoal, weeklyStudyGoal, defaultPomodoroDuration, defaultShortBreak, defaultLongBreak, pomodorosUntilLongBreak }} setStudyPrefs={vi.fn()} pending={0} onSave={vi.fn()} onReset={vi.fn()} onRestartOnboarding={onRestartOnboarding} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kurulumu yeniden başlat' }));
  expect(onRestartOnboarding).toHaveBeenCalledTimes(1);
});

function within(group: string, name: string) {
  const container = screen.getByRole('group', { name: group });
  return [...container.querySelectorAll('button')].find((button) => button.textContent === name)!;
}
