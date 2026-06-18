import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepAppearanceProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { code: 'light', name: 'light', icon: Sun },
  { code: 'dark', name: 'dark', icon: Moon },
  { code: 'system', name: 'system', icon: Monitor },
];

const StepAppearance: React.FC<StepAppearanceProps> = ({ selectedTheme, onThemeChange }) => {
  const { t } = useTranslation();

  const handleThemeSelect = (themeCode: string) => {
    console.log('StepAppearance: handleThemeSelect called with:', themeCode);
    console.log('StepAppearance: Current selectedTheme:', selectedTheme);
    
    if (selectedTheme === themeCode) {
      console.log('StepAppearance: Theme already selected, skipping');
      return;
    }
    
    console.log('StepAppearance: Calling onThemeChange with:', themeCode);
    onThemeChange(themeCode);
  };

  return (
    <div className="onboarding-step-appearance">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="onboarding-header"
      >
        <h1 className="ios-large-title onboarding-title">
          {t('onboarding.appearance.title')}
        </h1>
        <p className="ios-subhead onboarding-subtitle">
          {t('onboarding.appearance.subtitle')}
        </p>
      </motion.div>

      {/* Theme Cards - iOS Style */}
      <div className="ios-inset-grouped" style={{ marginTop: '2rem' }}>
        <ul className="ios-inset-grouped-list">
          {themes.map((theme, index) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.code;
            const isLast = index === themes.length - 1;
            
            return (
              <motion.li
                key={theme.code}
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
                    handleThemeSelect(theme.code);
                  }}
                  className={`ios-inset-grouped-cell ${isLast ? 'ios-inset-grouped-cell-last' : ''} onboarding-theme-cell`}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '20px 16px',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%',
                    gap: '12px'
                  }}>
                    {/* Icon */}
                    <Icon
                      size={24}
                      style={{
                        color: isSelected ? 'var(--ios-system-blue)' : 'var(--ios-secondary-label)',
                        flexShrink: 0,
                      }}
                    />
                    
                    {/* Theme Name */}
                    <span 
                      className="ios-body"
                      style={{ 
                        flex: 1,
                        textAlign: 'left',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--ios-system-blue)' : 'var(--ios-label)',
                      }}
                    >
                      {t(`onboarding.appearance.${theme.name}`)}
                    </span>
                    
                    {/* Checkmark */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: 'spring',
                          stiffness: 500,
                          damping: 30
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

export default StepAppearance;
