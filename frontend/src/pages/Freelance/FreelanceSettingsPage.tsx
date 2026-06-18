import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { freelanceIntegrationsApi, type GoogleIntegrationStatus } from '../../api/freelanceIntegrations';
import {
  Calendar,
  Check,
  ChevronLeft,
  Globe,
  Link2,
  Link2Off,
  Monitor,
  Moon,
  Sun,
  Unplug,
} from 'lucide-react';
import './FreelanceSettingsPage.css';

const FreelanceSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, refreshUser } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus>({ connected: false });
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);

  const languages = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const themes = [
    { code: 'light', name: t('onboarding.appearance.light'), icon: Sun },
    { code: 'dark', name: t('onboarding.appearance.dark'), icon: Moon },
    { code: 'system', name: t('onboarding.appearance.system'), icon: Monitor },
  ];

  const loadGoogleStatus = useCallback(async () => {
    try {
      setGoogleLoading(true);
      const response = await freelanceIntegrationsApi.getGoogleStatus();
      setGoogleStatus(response.data);
    } catch (error) {
      console.error('Error loading Google status:', error);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setSelectedLanguage((user as any).preferred_language || 'it');
      setSelectedTheme((user as any).preferred_theme || 'system');
    }
  }, [user]);

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  useEffect(() => {
    const googleParam = searchParams.get('google');
    const messageParam = searchParams.get('message');
    if (googleParam === 'connected') {
      setGoogleMessage('Account Google collegato con successo.');
      loadGoogleStatus();
      setSearchParams({}, { replace: true });
    } else if (googleParam === 'error') {
      setGoogleMessage(messageParam ? decodeURIComponent(messageParam) : 'Errore nel collegamento Google.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadGoogleStatus]);

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    i18n.changeLanguage(langCode);
    try {
      await authApi.updateOnboardingPreferences({ preferred_language: langCode });
      await refreshUser();
      showSaveSuccess();
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const handleThemeChange = async (themeCode: string) => {
    setSelectedTheme(themeCode as 'light' | 'dark' | 'system');
    setTheme(themeCode as 'light' | 'dark' | 'system');
    try {
      await authApi.updateOnboardingPreferences({ preferred_theme: themeCode });
      await refreshUser();
      showSaveSuccess();
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setGoogleActionLoading(true);
      const response = await freelanceIntegrationsApi.connectGoogle();
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      setGoogleMessage('Impossibile avviare il collegamento Google.');
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setGoogleActionLoading(true);
      await freelanceIntegrationsApi.disconnectGoogle();
      setGoogleStatus({ connected: false });
      setGoogleMessage('Account Google scollegato.');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      setGoogleMessage('Errore durante lo scollegamento.');
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleAutoSyncChange = async (enabled: boolean) => {
    try {
      setGoogleActionLoading(true);
      const response = await freelanceIntegrationsApi.updateGooglePreferences({ auto_sync_calls: enabled });
      setGoogleStatus((prev) => ({ ...prev, ...response.data, connected: true }));
      showSaveSuccess();
    } catch (error) {
      console.error('Error updating Google preferences:', error);
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    try {
      setGoogleActionLoading(true);
      const response = await freelanceIntegrationsApi.updateGooglePreferences({ calendar_id: calendarId });
      setGoogleStatus((prev) => ({ ...prev, ...response.data, connected: true }));
      showSaveSuccess();
    } catch (error) {
      console.error('Error updating calendar preference:', error);
    } finally {
      setGoogleActionLoading(false);
    }
  };

  return (
    <div className="freelance-settings-page">
      <div className="freelance-settings-header">
        <button type="button" className="freelance-settings-back" onClick={() => navigate('/freelance/dashboard')}>
          <ChevronLeft size={22} />
        </button>
        <h1 className="freelance-settings-title">Impostazioni</h1>
      </div>

      {saveSuccess && (
        <div className="freelance-settings-toast">
          <Check size={16} />
          <span>Salvato</span>
        </div>
      )}

      {googleMessage && (
        <div className="freelance-settings-banner">{googleMessage}</div>
      )}

      <section className="freelance-settings-section">
        <h2 className="freelance-settings-section-title">Integrazioni</h2>
        <div className="freelance-settings-card google-card">
          <div className="google-card-header">
            <div className="google-card-icon">
              <Calendar size={22} />
            </div>
            <div>
              <h3>Google Calendar</h3>
              <p>Collega il tuo account Google per creare call con Meet e inviti automatici.</p>
            </div>
          </div>

          {googleLoading ? (
            <p className="google-card-status">Caricamento...</p>
          ) : googleStatus.connected ? (
            <div className="google-connected">
              <div className="google-connected-badge">
                <Link2 size={16} />
                <span>{googleStatus.google_email}</span>
              </div>

              <label className="google-toggle-row">
                <span>Crea automaticamente evento Google quando creo una call</span>
                <input
                  type="checkbox"
                  checked={!!googleStatus.auto_sync_calls}
                  disabled={googleActionLoading}
                  onChange={(e) => handleAutoSyncChange(e.target.checked)}
                />
              </label>

              {googleStatus.calendars && googleStatus.calendars.length > 0 && (
                <label className="google-select-row">
                  <span>Calendario di destinazione</span>
                  <select
                    value={googleStatus.calendar_id || 'primary'}
                    disabled={googleActionLoading}
                    onChange={(e) => handleCalendarChange(e.target.value)}
                  >
                    {googleStatus.calendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.summary}{calendar.primary ? ' (principale)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                type="button"
                className="google-disconnect-btn"
                disabled={googleActionLoading}
                onClick={handleDisconnectGoogle}
              >
                <Unplug size={16} />
                Scollega account
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="google-connect-btn"
              disabled={googleActionLoading}
              onClick={handleConnectGoogle}
            >
              <Link2Off size={16} />
              Collega account Google
            </button>
          )}
        </div>
      </section>

      <section className="freelance-settings-section">
        <h2 className="freelance-settings-section-title">Lingua</h2>
        <div className="freelance-settings-card">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`freelance-settings-option ${selectedLanguage === lang.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span>{lang.flag} {lang.name}</span>
              {selectedLanguage === lang.code && <Check size={18} />}
            </button>
          ))}
        </div>
      </section>

      <section className="freelance-settings-section">
        <h2 className="freelance-settings-section-title">Aspetto</h2>
        <div className="freelance-settings-card">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                key={themeOption.code}
                type="button"
                className={`freelance-settings-option ${selectedTheme === themeOption.code ? 'selected' : ''}`}
                onClick={() => handleThemeChange(themeOption.code)}
              >
                <span><Icon size={18} /> {themeOption.name}</span>
                {selectedTheme === themeOption.code && <Check size={18} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="freelance-settings-section">
        <h2 className="freelance-settings-section-title">Account</h2>
        <div className="freelance-settings-card account-card">
          <div className="account-row">
            <Globe size={18} />
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FreelanceSettingsPage;
