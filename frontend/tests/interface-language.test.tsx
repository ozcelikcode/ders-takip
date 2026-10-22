import { cleanup, render, screen } from '@testing-library/react';
import { defaultPreferences, defaultSiteSettings } from '@study-tracker/contracts';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTerms } from '../src/hooks/useTerms';
import { initialLanguage } from '../src/i18n';
import { tr } from '../src/i18n/tr';
import LoginPage from '../src/pages/auth/LoginPage';
import { useLanguageStore } from '../src/store/languageStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

const browserLanguages = (languages: string[]) =>
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });

beforeEach(() => {
  localStorage.clear();
  useLanguageStore.setState({ language: 'tr', text: tr });
  document.documentElement.lang = 'tr';
});
afterEach(() => {
  cleanup();
  browserLanguages(['tr-TR']);
  vi.restoreAllMocks();
});

it('opens in the language last used here, else the browser language, else Turkish', () => {
  browserLanguages(['de-DE', 'en-GB']);
  expect(initialLanguage()).toBe('en');
  localStorage.setItem('interface-language', 'tr');
  expect(initialLanguage()).toBe('tr');
  localStorage.setItem('interface-language', 'klingon');
  browserLanguages(['de-DE']);
  expect(initialLanguage()).toBe('tr');
});

it('switches the catalog, the document language and the remembered choice together', async () => {
  await useLanguageStore.getState().setLanguage('en');
  expect(useLanguageStore.getState().text.auth.login.title).toBe('Sign in');
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem('interface-language')).toBe('en');
});

it('lets a later choice win over a slower earlier one', async () => {
  const english = useLanguageStore.getState().setLanguage('en');
  await useLanguageStore.getState().setLanguage('tr');
  await english;
  expect(useLanguageStore.getState().language).toBe('tr');
  expect(document.documentElement.lang).toBe('tr');
});

it('renders the sign-in page in English', async () => {
  useSettingsStore.setState({ settings: { ...defaultSiteSettings } });
  await useLanguageStore.getState().setLanguage('en');
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
  expect(screen.getByLabelText('Email address')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Forgot password' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
});

it('inflects the record words in the interface language', async () => {
  useSettingsStore.setState({ settings: { ...defaultSiteSettings, terminologyPreset: 'education' } });
  useUserPreferencesStore.setState({ preferences: { ...defaultPreferences } });
  const Words = () => <p>{useTerms().course({ plural: true, capitalize: true })}</p>;
  await useLanguageStore.getState().setLanguage('en');
  render(<Words />);
  expect(screen.getByText('Courses')).toBeTruthy();
});

it('words server codes and schema issues in the interface language', async () => {
  const { HttpError } = await import('../src/services/httpError');
  const { issueMessage, serverMessage } = await import('../src/lib/messages');
  const { loginSchema } = await import('@study-tracker/contracts');
  const refused = new HttpError('x', { status: 400, data: { error: { code: 'invalidCredentials' } } });
  const invalid = new HttpError('x', { status: 400, data: { error: { code: 'validation', details: [{ field: 'body.email', code: 'email' }] } } });
  const unknown = new HttpError('x', { status: 400, data: { error: { code: 'not-a-code' } as never } });
  const issue = loginSchema.safeParse({ email: 'nope', password: 'x' }).error!.issues[0]!.message;
  expect([serverMessage(refused), serverMessage(invalid), serverMessage(unknown), issueMessage(issue)]).toEqual([
    'E-posta veya şifre hatalı', 'Geçerli bir e-posta adresi giriniz', undefined, 'Geçerli bir e-posta adresi giriniz',
  ]);
  await useLanguageStore.getState().setLanguage('en');
  expect([serverMessage(refused), serverMessage(invalid), issueMessage(issue), issueMessage('Too small: expected number')]).toEqual([
    'Wrong email or password', 'Enter a valid email address', 'Enter a valid email address', 'Enter a valid value.',
  ]);
});
