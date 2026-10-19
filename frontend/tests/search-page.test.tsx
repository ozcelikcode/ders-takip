import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SearchPage from '../src/pages/search/SearchPage';
import { searchAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('../src/services/api', () => ({ searchAPI: { search: vi.fn() } }));

const Location = () => <p data-testid="location">{useLocation().search}</p>;
const mount = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Routes>
          <Route path="/search" element={<><SearchPage /><Location /></>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1' } as never });
  useUserPreferencesStore.setState({ preferences: { ...defaultPreferences, timezone: 'Asia/Tokyo' } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('groups results with links into the catalog and the planner day in the user’s time zone', async () => {
  vi.mocked(searchAPI.search).mockResolvedValue({
    courses: [{ id: 3, name: 'Mobile Release', categoryName: 'Yazılım', isActive: false }],
    topics: [{ id: 8, name: 'Mobile testing', courseId: 3, courseName: 'Mobile Release' }],
    // 20:00 UTC on the 10th is already the 11th in Tokyo.
    sessions: [{ id: 5, title: 'Weekly review', startTime: '2026-10-10T20:00:00.000Z', status: 'completed', matchedIn: 'notes' }],
  });
  mount('/search?q=mobile');
  const courses = await screen.findByRole('region', { name: 'Dersler' });
  expect(within(courses).getByRole('link', { name: /Mobile Release/ }).getAttribute('href')).toBe('/courses/3');
  expect(within(courses).getByText('Yazılım · Pasif')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Konular' })).getByRole('link').getAttribute('href')).toBe('/courses/3');
  const session = within(screen.getByRole('region', { name: 'Seanslar' })).getByRole('link');
  expect(session.getAttribute('href')).toBe('/planner?date=2026-10-11');
  expect(session.textContent).toMatch(/notlarda/);
  expect(searchAPI.search).toHaveBeenCalledWith('mobile');
});

it('validates short queries without calling the API and submits a new query to the URL', async () => {
  mount('/search?q=a');
  expect((await screen.findByRole('alert')).textContent).toMatch(/En az 2 karakter/);
  expect(searchAPI.search).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Aranacak ifade'), { target: { value: ' rapor ' } });
  fireEvent.submit(screen.getByRole('search'));
  expect(screen.getByTestId('location').textContent).toBe('?q=rapor');
});
