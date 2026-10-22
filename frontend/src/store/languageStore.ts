import { defaultLanguage, type Language } from '@study-tracker/contracts';
import { create } from 'zustand';
import { loadText, type Text } from '../i18n';
import { tr } from '../i18n/tr';

interface LanguageState {
  language: Language;
  text: Text;
  /** Loads the catalog, then switches; a later call wins over a slower earlier one. */
  setLanguage: (language: Language) => Promise<void>;
}

let requested: Language = defaultLanguage;
export const useLanguageStore = create<LanguageState>()((set, get) => ({
  language: defaultLanguage,
  text: tr,
  setLanguage: async (language) => {
    requested = language;
    if (get().language === language) return;
    const text = await loadText(language);
    if (requested !== language) return;
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    set({ language, text });
  },
}));

/** The interface text in the current language. */
export const useText = (): Text => useLanguageStore((state) => state.text);
export const useLanguage = (): Language => useLanguageStore((state) => state.language);
