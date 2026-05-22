import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import i18n from '../i18n/config';

const SUPPORTED_LANGS = ['it', 'en', 'es', 'fr'];

/**
 * Syncs theme and language with user preferences from API.
 * Ensures preferences are applied on login and when switching devices.
 * Does NOT sync during onboarding so the user can choose freely.
 */
const ThemeSync: React.FC = () => {
  const { user } = useAuth();
  const { syncWithUser, setTheme } = useTheme();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (user) {
      const isOnboarding = user.onboarding_completed === false ||
                          user.onboarding_completed === null ||
                          user.onboarding_completed === undefined;

      if (isOnboarding) return;

      if (!hasSynced.current) {
        const userTheme = (user as any).preferred_theme;
        if (userTheme && ['light', 'dark', 'system'].includes(userTheme)) {
          setTheme(userTheme as 'light' | 'dark' | 'system');
          syncWithUser(userTheme);
        }

        const userLang = (user as any).preferred_language;
        if (userLang && SUPPORTED_LANGS.includes(userLang) && i18n.language !== userLang) {
          i18n.changeLanguage(userLang);
        }

        hasSynced.current = true;
      }
    } else {
      hasSynced.current = false;
    }
  }, [user, setTheme, syncWithUser]);

  return null;
};

export default ThemeSync;
