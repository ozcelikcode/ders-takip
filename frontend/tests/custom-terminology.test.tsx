import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { customTerminologyFrom, defaultPreferences, defaultSiteSettings, type UserPreferences } from '@study-tracker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { useTerms } from '../src/hooks/useTerms';
import TerminologySection from '../src/pages/settings/TerminologySection';
import { useSettingsStore } from '../src/store/settingsStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

const preferences = (patch: Partial<UserPreferences> = {}): UserPreferences => ({ ...defaultPreferences, ...patch });
const mount = (patch: Partial<UserPreferences> = {}) => {
  const onSave = vi.fn();
  render(<TerminologySection preferences={preferences(patch)} siteTerminology="education" onSave={onSave} />);
  return onSave;
};
afterEach(cleanup);

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
    customTerminology: { ...customTerminologyFrom('skills'), session: { word: 'saat', accusative: 'saati' } },
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
  const onSave = mount({ customTerminology: customTerminologyFrom('goals') });
  expect((screen.getByRole('radio', { name: /Özel kelimeler/ }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('radio', { name: /Özel kelimeler/ }).closest('label')?.textContent).toContain('Hedef → Adım');
  fireEvent.click(screen.getByRole('radio', { name: /Genel/ }));
  expect(onSave).toHaveBeenCalledWith({ terminologyPreset: 'general', customTerminology: null });
});

it('shows personal custom words before the site words everywhere terms are read', () => {
  const Words = () => <p>{useTerms().course({ case: 'dat', plural: true, capitalize: true })}</p>;
  const book = { ...customTerminologyFrom('general'), course: { word: 'kitap', accusative: 'kitabı' } };
  useSettingsStore.setState({ settings: { ...defaultSiteSettings, customTerminology: customTerminologyFrom('skills') } });
  useUserPreferencesStore.setState({ preferences: preferences({ customTerminology: book }) });
  render(<Words />);
  expect(screen.getByText('Kitaplara')).toBeTruthy();
  cleanup();
  useUserPreferencesStore.setState({ preferences: preferences() });
  render(<Words />);
  expect(screen.getByText('Becerilere')).toBeTruthy();
});
