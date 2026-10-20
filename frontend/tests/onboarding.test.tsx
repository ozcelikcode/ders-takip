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
import { addCourseName, choosePurpose, initialDraft, toOnboardingInput } from '../src/pages/onboarding/onboardingModel';
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
  // The purpose suggested 45 minutes; the weekly goal is derived, not entered.
  expect((screen.getByLabelText('Günlük hedef (saat)') as HTMLInputElement).value).toBe('0');
  expect((screen.getByLabelText('Günlük hedef (dakika)') as HTMLInputElement).value).toBe('45');
  expect(screen.queryByLabelText(/Haftalık hedef/)).toBeNull();
  expect(screen.getByText(/Haftalık hedef:/).parentElement?.textContent).toContain('5 sa 15 dk');
  fireEvent.change(screen.getByLabelText('Günlük hedef (saat)'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Günlük hedef (dakika)'), { target: { value: '30' } });
  expect(screen.getByText(/Haftalık hedef:/).parentElement?.textContent).toContain('10 sa 30 dk');
  fireEvent.click(screen.getByRole('button', { name: '30 dk' }));
  expect((screen.getByLabelText('Günlük hedef (saat)') as HTMLInputElement).value).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: '1 sa 30 dk' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pazar' }));
  fireEvent.click(within('Aktif günler', 'Cmt'));
  expect(screen.getByText(/Haftalık hedef:/).parentElement?.textContent).toContain('9 sa · 6 aktif gün × 1 sa 30 dk');
  for (const day of ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Paz']) fireEvent.click(within('Aktif günler', day));
  next();
  expect(screen.getByRole('alert').textContent).toBe('Hedefin işlemesi için en az bir aktif gün seçin.');
  for (const day of ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Paz']) fireEvent.click(within('Aktif günler', day));
  next();

  expect(heading()).toBe('Çalışma ritmin');
  expect((screen.getByRole('radio', { name: /Klasik/ }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: /Uzun odak/ }));
  next();

  // The words follow the chosen purpose before anything is saved.
  expect(heading()).toBe('İlk beceriler');
  expect((screen.getByLabelText('Kategori') as HTMLInputElement).value).toBe('Becerilerim');
  fireEvent.click(screen.getByRole('button', { name: 'İngilizce ekle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Beceri ekle' }));
  const field = screen.getByLabelText('Yeni beceri');
  fireEvent.change(field, { target: { value: 'ingilizce' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(screen.getByRole('alert').textContent).toBe('“ingilizce” zaten listede.');
  expect(heading()).toBe('İlk beceriler');
  // Text typed but not added stops the step instead of being dropped.
  fireEvent.change(field, { target: { value: ' Piyano ' } });
  next();
  expect(screen.getByRole('alert').textContent).toBe("“Piyano” henüz eklenmedi. Ekle'ye bas ya da alanı temizle.");
  fireEvent.keyDown(field, { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Gitar ekle' }));
  for (const name of ['İngilizce', 'Piyano', 'Gitar']) expect(screen.getByRole('button', { name: `${name} kaldır` })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Gitar ekle' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Piyano kaldır' }));
  expect(screen.queryByRole('button', { name: 'Piyano kaldır' })).toBeNull();
  expect(screen.getByText('2 / 6')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: ' ' } });
  next();
  expect(screen.getByRole('alert').textContent).toBe('Kayıtların duracağı kategoriye bir ad verin.');
  fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'Becerilerim' } });
  next();

  expect(heading()).toBe('Özet');
  expect(screen.getByText('Becerilerim: İngilizce, Gitar')).toBeTruthy();
  expect(screen.getByText('Günde 1 sa 30 dk · Haftada 9 sa')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Kurulumu bitir' }));
  await waitFor(() => expect(useAuthStore.getState().completeOnboarding).toHaveBeenCalledTimes(1));
  expect(vi.mocked(useAuthStore.getState().completeOnboarding).mock.calls[0]![0]).toEqual({
    preferences: {
      terminologyPreset: 'skills', studyField: 'Gitar', timezone: 'Europe/Berlin', weekStartsOn: 0,
      activeStudyDays: [1, 2, 3, 4, 5, 0], dailyStudyGoal: 1.5,
      defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3,
    },
    workspace: { categoryName: 'Becerilerim', courseNames: ['İngilizce', 'Gitar'] },
  });
});

it('stops adding first records at the limit', () => {
  let draft = choosePurpose(initialDraft(preferences()), 'education');
  for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const result = addCourseName(draft, name);
    if ('error' in result) throw new Error(result.error);
    draft = result.draft;
  }
  expect(addCourseName(draft, 'G')).toEqual({ error: 'Kurulumda en fazla 6 kayıt eklenebilir; gerisini sonra ekleyebilirsin.' });
  expect(addCourseName(draft, '   ')).toEqual({ error: 'Önce bir ad yazın.' });
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
  const input = toOnboardingInput(draft);
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
  const { activeStudyDays, dailyStudyGoal, defaultPomodoroDuration, defaultShortBreak, defaultLongBreak, pomodorosUntilLongBreak } = defaultPreferences;
  render(
    <StudyTab studyPrefs={{ activeStudyDays: [...activeStudyDays], dailyStudyGoal, defaultPomodoroDuration, defaultShortBreak, defaultLongBreak, pomodorosUntilLongBreak }} setStudyPrefs={vi.fn()} pending={0} onSave={vi.fn()} onReset={vi.fn()} onRestartOnboarding={onRestartOnboarding} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kurulumu yeniden başlat' }));
  expect(onRestartOnboarding).toHaveBeenCalledTimes(1);
});

function within(group: string, name: string) {
  const container = screen.getByRole('group', { name: group });
  return [...container.querySelectorAll('button')].find((button) => button.textContent === name)!;
}
