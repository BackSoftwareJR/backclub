import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { getHomeRouteForUser } from '../../utils/userRoles';
import { useNavigate } from 'react-router-dom';
import StepLanguage from './StepLanguage';
import StepAppearance from './StepAppearance';
import StepTour from './StepTour';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingWizard.css';

type Step = 1 | 2 | 3;

interface OnboardingData {
  language: string;
  theme: string;
  startTour: boolean;
}

const OnboardingWizard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [data, setData] = useState<OnboardingData>({
    language: 'it',
    theme: 'system',
    startTour: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize with user preferences if available - ONLY ONCE when user loads
  useEffect(() => {
    if (user && !hasInitialized.current) {
      const userLang = (user as any).preferred_language || 'it';
      const userTheme = (user as any).preferred_theme || 'system';
      
      console.log('OnboardingWizard: Initializing with user preferences', { userLang, userTheme });
      
      setData(prev => ({
        ...prev,
        language: userLang,
        theme: userTheme,
      }));
      
      // Set initial language
      i18n.changeLanguage(userLang);
      
      // Set initial theme
      setTheme(userTheme as 'light' | 'dark' | 'system');
      
      // Mark as initialized so this doesn't run again
      hasInitialized.current = true;
    }
  }, [user]); // Only depend on user, not i18n or setTheme

  const handleLanguageChange = (language: string) => {
    console.log('OnboardingWizard: handleLanguageChange called with:', language);
    console.log('OnboardingWizard: Current data.language:', data.language);
    
    // Update state immediately
    setData(prev => {
      const newData = { ...prev, language };
      console.log('OnboardingWizard: Updated data:', newData);
      return newData;
    });
    
    // Change i18n language immediately for visual feedback
    i18n.changeLanguage(language);
    console.log('OnboardingWizard: i18n language changed to:', language);
  };
  
  // Debug: Log when data.language changes
  useEffect(() => {
    console.log('OnboardingWizard: data.language changed to:', data.language);
  }, [data.language]);

  const handleThemeChange = (theme: string) => {
    console.log('OnboardingWizard: handleThemeChange called with:', theme);
    console.log('OnboardingWizard: Current data.theme:', data.theme);
    
    // Update local state immediately
    setData(prev => {
      const newData = { ...prev, theme };
      console.log('OnboardingWizard: Updated data with theme:', newData);
      return newData;
    });
    
    // Apply theme immediately - this should update the entire app including onboarding
    const themeValue = theme as 'light' | 'dark' | 'system';
    console.log('OnboardingWizard: Setting theme to:', themeValue);
    
    // CRITICAL: Update localStorage FIRST to prevent ThemeSync from overriding
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_theme', themeValue);
      localStorage.setItem('theme', themeValue);
      console.log('OnboardingWizard: Updated localStorage with theme:', themeValue);
    }
    
    // Then update ThemeContext
    setTheme(themeValue);
    
    // Force immediate application to document (backup, in case ThemeContext is slow)
    if (typeof document !== 'undefined') {
      const resolved = themeValue === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : themeValue;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.colorScheme = resolved;
      console.log('OnboardingWizard: Applied theme to document:', resolved);
    }
  };
  
  // Debug: Log when data.theme changes
  useEffect(() => {
    console.log('OnboardingWizard: data.theme changed to:', data.theme);
  }, [data.theme]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await authApi.updateOnboardingPreferences({
        onboarding_completed: true,
        preferred_language: data.language,
        preferred_theme: data.theme,
      });
      
      // Refresh user data to get updated onboarding_completed status
      const updatedUser = await refreshUser();
      
      // Use updated user if available, otherwise fallback to current user
      const finalUser = updatedUser || user;
      
      navigate(getHomeRouteForUser(finalUser), { replace: true });
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
      // Still navigate to dashboard even if save fails
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipTour = () => {
    setData(prev => ({ ...prev, startTour: false }));
    handleComplete();
  };

  const handleStartTour = () => {
    setData(prev => ({ ...prev, startTour: true }));
    // Save flag in sessionStorage to start tour after navigation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startOnboardingTour', 'true');
      console.log('OnboardingWizard: Saved startOnboardingTour flag in sessionStorage');
    }
    handleComplete();
  };

  return (
    <div className="onboarding-wizard-container">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="onboarding-progress">
          <div
            className="onboarding-progress-bar"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="onboarding-step-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ 
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1] as const
              }}
            >
              {currentStep === 1 && (
                <StepLanguage
                  selectedLanguage={data.language}
                  onLanguageChange={handleLanguageChange}
                />
              )}
              {currentStep === 2 && (
                <StepAppearance
                  selectedTheme={data.theme}
                  onThemeChange={handleThemeChange}
                />
              )}
              {currentStep === 3 && (
                <StepTour
                  onStartTour={handleStartTour}
                  onSkip={handleSkipTour}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation - Only show for steps 1 and 2 */}
        {currentStep < 3 && (
          <div className="onboarding-bottom-nav">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="onboarding-button-back"
              >
                {t('onboarding.back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="onboarding-button-continue"
            >
              {isSaving ? t('onboarding.saving') : t('onboarding.continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
