import { act, renderHook } from '@testing-library/react';
import { defaultSiteSettings } from '@study-tracker/contracts';
import { afterEach, expect, it } from 'vitest';
import { useTerms } from '../src/hooks/useTerms';
import { useSettingsStore } from '../src/store/settingsStore';

const initial = useSettingsStore.getState().settings;
const usePreset = (terminologyPreset: typeof defaultSiteSettings.terminologyPreset) =>
  act(() => useSettingsStore.setState({ settings: { ...initial, terminologyPreset } }));
afterEach(() => usePreset(initial.terminologyPreset));

it('derives every display word from the admin preset and follows preset changes', () => {
  const { result } = renderHook(() => useTerms());
  usePreset('general');
  expect(result.current.course({ capitalize: true, plural: true })).toBe('Projeler');
  expect(result.current.topic({ case: 'acc' })).toBe('görevi');
  usePreset('goals');
  expect(result.current.course({ case: 'dat', plural: true })).toBe('hedeflere');
  expect(result.current.session({ capitalize: true })).toBe('Seans');
  usePreset('skills');
  expect(result.current.topic({ plural: true, case: 'acc' })).toBe('alıştırmaları');
});

it('uses the neutral general vocabulary when the stored preset is missing', () => {
  expect(defaultSiteSettings.terminologyPreset).toBe('general');
});
