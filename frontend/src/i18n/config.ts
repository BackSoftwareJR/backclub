import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from '../locales/it.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

// Get language from localStorage or default to Italian
const getStoredLanguage = (): string => {
  if (typeof window === 'undefined') return 'it';
  
  const stored = localStorage.getItem('preferred_language');
  if (stored && ['it', 'en', 'es', 'fr'].includes(stored)) {
    return stored;
  }
  
  // Try to detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (['it', 'en', 'es', 'fr'].includes(browserLang)) {
    return browserLang;
  }
  
  return 'it'; // Default to Italian
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

// Listen for language changes and update localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('preferred_language', lng);
});

export default i18n;
