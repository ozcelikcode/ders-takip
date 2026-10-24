import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { customTerminologyFrom, defaultPreferences, defaultSiteSettings, type UserPreferences } from '@study-tracker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { useTerms } from '../src/hooks/useTerms';
import { tr } from '../src/i18n/tr';
import { useLanguageStore } from '../src/store/languageStore';
import TerminologySection from '../src/pages/settings/TerminologySection';
import { useSettingsStore } from '../src/store/settingsStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

const preferences = (patch: Partial<UserPreferences> = {}): UserPreferences => ({ ...defaultPreferences, ...patch });
const mount = (patch: Partial<UserPreferences> = {}) => {
  const onSave = vi.fn();
  render(<TerminologySection preferences={preferences(patch)} siteTerminology="education" onSave={onSave} />);
  return onSave;
};
afterEach(() => {
  cleanup();
  useLanguageStore.setState({ language: 'tr', text: tr });
});

it('starts custom words from the current preset and saves them only on demand', () => {
  const onSave = mount({ terminologyPreset: 'skills' });
  fireEvent.click(screen.getByRole('radio', { name: /Özel kelimeler/ }));
  expect(onSave).not.toHaveBeenCalled();
  const session = screen.getByRole('group', { name: 'Çalışma' });
  expect((within(session).getByLabelText('Kelime') as HTMLInputElement).value).toBe('seans');
  const save = screen.getByRole('button', { name: 'Kelimeleri kaydet' }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  fireEvent.change(within(session).getByLabelText('Kelime'), { target: { value: 'saat' } });
  fireEvent.change(within(session).getByLabelText('"-ı" hâli'), { target: { value: 'saati' } });
  expect(within(session).getByText('Biçimler: saat · saati · saate · saatin · saatte · saatler')).toBeTruthy();
  fireEvent.click(save);
  expect(onSave).toHaveBeenCalledWith({
    customTerminology: { ...customTerminologyFrom('skills', 'tr'), session: { word: 'saat', accusative: 'saati' } },
  });
});

it('keeps a corrected accusative when the word changes and blocks saving invalid words', () => {
  mount();
  fireEvent.click(screen.getByRole('radio', { name: /Özel kelimeler/ }));
  const course = screen.getByRole('group', { name: 'Ana kayıt' });
  const word = within(course).getByLabelText('Kelime');
  const accusative = within(course).getByLabelText('"-ı" hâli') as HTMLInputElement;
  fireEvent.change(word, { target: { value: 'kitap' } });
  expect(accusative.value).toBe('kitapı');
  fireEvent.change(accusative, { target: { value: 'kitabı' } });
  fireEvent.change(word, { target: { value: 'kitaps' } });
  expect(accusative.value).toBe('kitabı');
  expect(within(course).getByText(/bu kelimeye uymuyor/)).toBeTruthy();
  fireEvent.change(word, { target: { value: 'iki kelime' } });
  expect(within(course).getByText(/Tek kelime yazın/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Kelimeleri kaydet' }) as HTMLButtonElement).disabled).toBe(true);
});

it('drops saved custom words when a preset or the site default is chosen', () => {
  const onSave = mount({ customTerminology: customTerminologyFrom('goals', 'tr') });
  expect((screen.getByRole('radio', { name: /Özel kelimeler/ }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('radio', { name: /Özel kelimeler/ }).closest('label')?.textContent).toContain('Hedef → Adım');
  fireEvent.click(screen.getByRole('radio', { name: /Genel/ }));
  expect(onSave).toHaveBeenCalledWith({ terminologyPreset: 'general', customTerminology: null });
});

it('shows personal custom words before the site words everywhere terms are read', () => {
  const Words = () => <p>{useTerms().course({ case: 'dat', plural: true, capitalize: true })}</p>;
  const book = { ...customTerminologyFrom('general', 'tr'), course: { word: 'kitap', accusative: 'kitabı' } };
  useSettingsStore.setState({ settings: { ...defaultSiteSettings, customTerminology: customTerminologyFrom('skills', 'tr') } });
  useUserPreferencesStore.setState({ preferences: preferences({ customTerminology: book }) });
  render(<Words />);
  expect(screen.getByText('Kitaplara')).toBeTruthy();
  cleanup();
  useUserPreferencesStore.setState({ preferences: preferences() });
  render(<Words />);
  expect(screen.getByText('Becerilere')).toBeTruthy();
});

it('asks English sites for the English word, its plural and article, and keeps corrections', async () => {
  await useLanguageStore.getState().setLanguage('en');
  const onSave = mount({ terminologyPreset: 'skills' });
  fireEvent.click(screen.getByRole('radio', { name: /Custom words/ }));
  const session = screen.getByRole('group', { name: 'Work block' });
  const word = within(session).getByLabelText('Word') as HTMLInputElement;
  const plural = within(session).getByLabelText('Plural') as HTMLInputElement;
  const article = within(session).getByLabelText('Article (a/an)') as HTMLSelectElement;
  expect([word.value, plural.value, article.value]).toEqual(['session', 'sessions', 'a']);
  fireEvent.change(word, { target: { value: 'Hour' } });
  expect([word.value, plural.value, article.value]).toEqual(['hour', 'hours', 'a']);
  fireEvent.change(article, { target: { value: 'an' } });
  fireEvent.change(word, { target: { value: 'study hour' } });
  expect([plural.value, article.value]).toEqual(['study hours', 'an']);
  fireEvent.change(word, { target: { value: 'hour' } });
  expect(within(session).getByText('Forms: an hour · hours')).toBeTruthy();
  const topic = screen.getByRole('group', { name: 'Sub-record' });
  fireEvent.change(within(topic).getByLabelText('Word'), { target: { value: 'child' } });
  fireEvent.change(within(topic).getByLabelText('Plural'), { target: { value: 'children' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save words' }));
  expect(onSave).toHaveBeenCalledWith({
    customTerminology: {
      ...customTerminologyFrom('skills', 'en'),
      topic: { word: 'child', plural: 'children', article: 'a' },
      session: { word: 'hour', plural: 'hours', article: 'an' },
    },
  });
});

it('refuses English words with digits or other scripts', async () => {
  await useLanguageStore.getState().setLanguage('en');
  mount();
  fireEvent.click(screen.getByRole('radio', { name: /Custom words/ }));
  const course = screen.getByRole('group', { name: 'Main record' });
  fireEvent.change(within(course).getByLabelText('Word'), { target: { value: 'book1' } });
  expect(within(course).getAllByText(/lowercase English letters/).length).toBeGreaterThan(0);
  expect((screen.getByRole('button', { name: 'Save words' }) as HTMLButtonElement).disabled).toBe(true);
});

it('shows custom words only in the language they were typed in, never translated', async () => {
  const Words = () => <p>{useTerms().course({ plural: true, capitalize: true })}</p>;
  const book = { ...customTerminologyFrom('general', 'tr'), course: { word: 'kitap', accusative: 'kitabı' } };
  useSettingsStore.setState({ settings: { ...defaultSiteSettings, terminologyPreset: 'education' } });
  useUserPreferencesStore.setState({ preferences: preferences({ customTerminology: book }) });
  render(<Words />);
  expect(screen.getByText('Kitaplar')).toBeTruthy();
  cleanup();
  // On an English site the Turkish words step aside for the site's English preset.
  await useLanguageStore.getState().setLanguage('en');
  render(<Words />);
  expect(screen.getByText('Courses')).toBeTruthy();
  cleanup();
  const english = { ...customTerminologyFrom('general', 'en'), course: { word: 'book', plural: 'books', article: 'a' as const } };
  useUserPreferencesStore.setState({ preferences: preferences({ customTerminology: english }) });
  render(<Words />);
  expect(screen.getByText('Books')).toBeTruthy();
  cleanup();
  await useLanguageStore.getState().setLanguage('tr');
  render(<Words />);
  expect(screen.getByText('Dersler')).toBeTruthy();
});
