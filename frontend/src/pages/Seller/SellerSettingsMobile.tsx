import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import {
  ChevronLeft,
  Globe,
  Sun,
  Moon,
  Monitor,
  Check,
  Bell,
  Mail,
  Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import './SellerSettingsMobile.css';

const SellerSettingsMobile: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Initialize from user preferences
  useEffect(() => {
    if (user) {
      const userLang = (user as any).preferred_language || 'it';
      const userTheme = (user as any).preferred_theme || 'system';
      setSelectedLanguage(userLang);
      setSelectedTheme(userTheme);
    }
  }, [user]);

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    i18n.changeLanguage(langCode);
    
    // Save immediately
    try {
      await authApi.updateOnboardingPreferences({
        preferred_language: langCode,
      });
      await refreshUser();
      showSaveSuccess();
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const handleThemeChange = async (themeCode: string) => {
    // Update local state immediately for instant feedback
    setSelectedTheme(themeCode as 'light' | 'dark' | 'system');
    
    // Update ThemeContext immediately (this applies the theme to the document)
    setTheme(themeCode as 'light' | 'dark' | 'system');
    
    // Save to API in background
    try {
      await authApi.updateOnboardingPreferences({
        preferred_theme: themeCode,
      });
      await refreshUser();
      showSaveSuccess();
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Revert on error
      const userTheme = (user as any)?.preferred_theme || 'system';
      setSelectedTheme(userTheme);
      setTheme(userTheme as 'light' | 'dark' | 'system');
    }
  };

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="seller-settings-mobile">
      {/* Header */}
      <header className="ios-header">
        <button
          onClick={() => navigate(-1)}
          className="ios-header-back"
          aria-label={t('common.back')}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="ios-large-title">{t('settings.title')}</h1>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      {/* Success Toast */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="ios-toast"
        >
          {t('settings.preferences_saved')}
        </motion.div>
      )}

      <main className="ios-system-background" style={{ paddingTop: '1rem' }}>
        {/* Profile Section */}
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <button
              className="ios-inset-grouped-cell"
              style={{ padding: '16px' }}
              onClick={() => {
                // Navigate to profile if exists
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                <div
                  className="ios-avatar"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  {user?.name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'V'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ios-body-bold" style={{ marginBottom: '4px' }}>
                    {user?.name || 'Venditore'}
                  </div>
                  <div className="ios-subhead">{user?.email}</div>
                </div>
                <ChevronLeft size={20} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
              </div>
            </button>
          </ul>
        </div>

        {/* Language Section */}
        <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
          <div className="ios-section-header" style={{ display: 'flex', alignItems: 'center' }}>
            <Globe size={16} style={{ opacity: 0.6, marginRight: '6px' }} />
            <span>{t('menu.lingua')}</span>
          </div>
          <ul className="ios-inset-grouped-list">
            {languages.map((lang, index) => {
              const isSelected = selectedLanguage === lang.code;
              const isLast = index === languages.length - 1;
              
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`ios-inset-grouped-cell ${isLast ? 'ios-inset-grouped-cell-last' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '24px', marginRight: '12px' }}>{lang.flag}</span>
                    <span className="ios-body">{lang.name}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Check size={20} className="ios-checkmark" />
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </ul>
        </div>

        {/* Appearance Section */}
        <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
          <div className="ios-section-header" style={{ display: 'flex', alignItems: 'center' }}>
            {resolvedTheme === 'dark' ? (
              <Moon size={16} style={{ opacity: 0.6, marginRight: '6px' }} />
            ) : (
              <Sun size={16} style={{ opacity: 0.6, marginRight: '6px' }} />
            )}
            <span>{t('settings.appearance')}</span>
          </div>
          <ul className="ios-inset-grouped-list">
            {themes.map((themeOption, index) => {
              const Icon = themeOption.icon;
              const isSelected = selectedTheme === themeOption.code;
              const isLast = index === themes.length - 1;
              
              return (
                <button
                  key={themeOption.code}
                  onClick={() => handleThemeChange(themeOption.code)}
                  className={`ios-inset-grouped-cell ${isLast ? 'ios-inset-grouped-cell-last' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Icon
                      size={20}
                      style={{
                        color: isSelected ? '#0A84FF' : 'var(--ios-secondary-label)',
                        marginRight: '12px',
                      }}
                    />
                    <span className="ios-body">{themeOption.name}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Check size={20} className="ios-checkmark" />
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </ul>
        </div>

        {/* Notifications Section (Placeholder) */}
        <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
          <div className="ios-section-header" style={{ display: 'flex', alignItems: 'center' }}>
            <Bell size={16} style={{ opacity: 0.6, marginRight: '6px' }} />
            <span>{t('settings.notifications')}</span>
          </div>
          <ul className="ios-inset-grouped-list">
            <div className="ios-inset-grouped-cell">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Bell size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">Notifiche Push</span>
                <div style={{ marginLeft: 'auto' }}>
                  <label className="ios-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ios-switch-slider" />
                  </label>
                </div>
              </div>
            </div>
            <div className="ios-inset-grouped-cell ios-inset-grouped-cell-last">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Mail size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">Notifiche Email</span>
                <div style={{ marginLeft: 'auto' }}>
                  <label className="ios-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ios-switch-slider" />
                  </label>
                </div>
              </div>
            </div>
          </ul>
        </div>

        {/* Security Section (Placeholder) */}
        <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
          <div className="ios-section-header" style={{ display: 'flex', alignItems: 'center' }}>
            <Shield size={16} style={{ opacity: 0.6, marginRight: '6px' }} />
            <span>{t('settings.security')}</span>
          </div>
          <ul className="ios-inset-grouped-list">
            <button
              className="ios-inset-grouped-cell"
              onClick={() => {
                // Navigate to change password
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Shield size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">{t('settings.change_password')}</span>
                <ChevronLeft
                  size={20}
                  style={{ transform: 'rotate(180deg)', opacity: 0.3, marginLeft: 'auto' }}
                />
              </div>
            </button>
          </ul>
        </div>

        {/* About Section */}
        <div className="ios-inset-grouped" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
          <ul className="ios-inset-grouped-list">
            <div className="ios-inset-grouped-cell">
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className="ios-subhead" style={{ opacity: 0.6 }}>
                  Versione 1.0.0
                </div>
              </div>
            </div>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default SellerSettingsMobile;
