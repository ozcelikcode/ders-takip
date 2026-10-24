import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import TagManagerDialog from '../src/components/tags/TagManagerDialog';
import CourseTagsPanel from '../src/components/tags/CourseTagsPanel';
import TagFilter from '../src/components/tags/TagFilter';
import CreateSessionModal from '../src/components/planner/CreateSessionModal';
import { HttpError } from '../src/services/httpError';
import { coursesAPI, studySessionsAPI, tagsAPI } from '../src/services/api';

vi.mock('../src/services/api', () => ({
  tagsAPI: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), remove: vi.fn(), setCourseTags: vi.fn(), setSessionTags: vi.fn() },
  coursesAPI: { getCourses: vi.fn() },
  studySessionsAPI: { createSession: vi.fn() },
  seriesAPI: {},
}));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return { useAccountQueryKeys: () => accountQueryKeys('1', 'Europe/Istanbul') };
});
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const assignments = (patch = {}) => ({ tags: [{ id: 1, name: 'Sınav' }, { id: 2, name: 'Okuma' }], courseTags: [], sessionTags: [], ...patch });
const mount = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.mocked(coursesAPI.getCourses).mockResolvedValue({ data: { success: true, data: { courses: [] } } } as never);
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });

it('adds, renames and deletes tags, and shows a duplicate name as an error', async () => {
  vi.mocked(tagsAPI.list).mockResolvedValue(assignments());
  vi.mocked(tagsAPI.create).mockRejectedValueOnce(new HttpError('x', { status: 409, data: { error: { code: 'tagExists' } } }));
  mount(<TagManagerDialog onClose={vi.fn()} />);
  expect(await screen.findByDisplayValue('Sınav')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Yeni etiket'), { target: { value: 'SINAV' } });
  fireEvent.click(screen.getByRole('button', { name: 'Etiket ekle' }));
  expect(await screen.findByText('Bu adda bir etiketin zaten var')).toBeTruthy();

  vi.mocked(tagsAPI.rename).mockResolvedValue({ id: 2, name: 'Okuma listesi' });
  fireEvent.change(screen.getByLabelText('Etiket adı: Okuma'), { target: { value: 'Okuma listesi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden adlandır: Okuma' }));
  await waitFor(() => expect(tagsAPI.rename).toHaveBeenCalledWith(2, 'Okuma listesi'));

  vi.mocked(tagsAPI.remove).mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Sil: Sınav' }));
  expect(tagsAPI.remove).not.toHaveBeenCalled();
  const confirm = await screen.findByRole('dialog', { name: 'Etiket silinsin mi?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Onayla' }));
  await waitFor(() => expect(tagsAPI.remove).toHaveBeenCalledWith(1));
});

it('saves a record’s tags as soon as one is toggled', async () => {
  vi.mocked(tagsAPI.list).mockResolvedValue(assignments({ courseTags: [{ courseId: 7, tagId: 2 }] }));
  vi.mocked(tagsAPI.setCourseTags).mockResolvedValue(undefined);
  mount(<CourseTagsPanel courseId={7} />);
  const reading = await screen.findByRole('button', { name: 'Okuma' });
  expect(reading.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Sınav' }));
  await waitFor(() => expect(tagsAPI.setCourseTags).toHaveBeenCalledWith(7, [2, 1]));
});

it('offers the tag filter only once there are tags', async () => {
  vi.mocked(tagsAPI.list).mockResolvedValue(assignments({ tags: [] }));
  const { container } = mount(<TagFilter value={null} onChange={vi.fn()} />);
  await waitFor(() => expect(tagsAPI.list).toHaveBeenCalled());
  expect(container.textContent).toBe('');
});

it('tags a new session after saving it, and a failed tag write does not undo or repeat the session', async () => {
  vi.mocked(tagsAPI.list).mockResolvedValue(assignments());
  vi.mocked(studySessionsAPI.createSession).mockResolvedValue({ data: { success: true, data: { session: { id: 41 } } } } as never);
  vi.mocked(tagsAPI.setSessionTags).mockRejectedValue(new Error('offline'));
  const onClose = vi.fn();
  mount(<CreateSessionModal isOpen selectedDate={new Date(Date.UTC(2031, 0, 6))} selectedHour={9} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Özel' }));
  fireEvent.change(await screen.findByLabelText('Özel Başlık *'), { target: { value: 'Reading' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Okuma' }));
  fireEvent.submit(document.getElementById('create-session-form')!);
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(studySessionsAPI.createSession).toHaveBeenCalledTimes(1);
  expect(tagsAPI.setSessionTags).toHaveBeenCalledWith(41, [2]);
  expect(toast.error).toHaveBeenCalledWith('Seans kaydedildi ama etiketleri kaydedilemedi; tekrar dene.');
});
