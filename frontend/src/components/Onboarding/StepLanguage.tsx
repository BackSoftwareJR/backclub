import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepLanguageProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
  { code: 'it', flag: '🇮🇹' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'fr', flag: '🇫🇷' },
];

const StepLanguage: React.FC<StepLanguageProps> = ({ selectedLanguage, onLanguageChange }) => {
  const { t } = useTranslation();

  // Debug: Log current selected language
  useEffect(() => {
    console.log('StepLanguage: Current selectedLanguage:', selectedLanguage);
  }, [selectedLanguage]);

  const handleLanguageSelect = (langCode: string) => {
    console.log('StepLanguage: handleLanguageSelect called with:', langCode);
    console.log('StepLanguage: Current selectedLanguage:', selectedLanguage);
    
    // Prevent double clicks
    if (selectedLanguage === langCode) {
      console.log('StepLanguage: Language already selected, skipping');
      return;
    }
    
    console.log('StepLanguage: Calling onLanguageChange with:', langCode);
    // Call the handler
    onLanguageChange(langCode);
  };

  return (
    <div className="onboarding-step-language">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="onboarding-header"
      >
        <h1 className="ios-large-title onboarding-title">
          {t('onboarding.welcome.title')}
        </h1>
        <p className="ios-subhead onboarding-subtitle">
          {t('onboarding.welcome.subtitle')}
        </p>
      </motion.div>

      {/* Language List - iOS Inset Grouped Style */}
      <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
        <ul className="ios-inset-grouped-list">
          {languages.map((lang, index) => {
            const isSelected = selectedLanguage === lang.code;
            const isLast = index === languages.length - 1;
            
            return (
              <motion.li
                key={lang.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: index * 0.08,
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1] as const
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button clicked for language:', lang.code);
                    handleLanguageSelect(lang.code);
                  }}
                  onTouchStart={() => {
                    // Add haptic feedback on mobile (only if user gesture is allowed)
                    try {
                      if ('vibrate' in navigator && navigator.vibrate) {
                        navigator.vibrate(10);
                      }
                    } catch (error) {
                      // Silently ignore vibration errors (browser may block it)
                    }
                  }}
                  className={`ios-inset-grouped-cell ${isLast ? 'ios-inset-grouped-cell-last' : ''} onboarding-language-cell`}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    position: 'relative',
                  }}
                  data-selected={isSelected}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%',
                    gap: '12px'
                  }}>
                    {/* Flag */}
                    <span 
                      style={{ 
                        fontSize: '28px',
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        transition: 'transform 0.2s ease',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {lang.flag}
                    </span>
                    
                    {/* Language Name */}
                    <span 
                      className="ios-body"
                      style={{ 
                        flex: 1,
                        textAlign: 'left',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--ios-system-blue)' : 'var(--ios-label)',
                        transition: 'color 0.2s ease, font-weight 0.2s ease',
                      }}
                    >
                      {t(`languages.${lang.code}`)}
                    </span>
                    
                    {/* Checkmark - Only show when selected */}
                    {isSelected ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: 'spring',
                          stiffness: 500,
                          damping: 30
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check 
                          size={22} 
                          style={{ 
                            color: 'var(--ios-system-blue)',
                            strokeWidth: 3
                          }} 
                        />
                      </motion.div>
                    ) : (
                      <div style={{ width: '22px', height: '22px' }} />
                    )}
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default StepLanguage;
