import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepTourProps {
  onStartTour: () => void;
  onSkip: () => void;
}

const StepTour: React.FC<StepTourProps> = ({ onStartTour, onSkip }) => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-step-tour">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="onboarding-header"
      >
        {/* Icon with Glow Effect */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
          className="onboarding-icon-container"
        >
          {/* Gradient Glow */}
          <div className="onboarding-icon-glow" />
          
          {/* Icon */}
          <div className="onboarding-icon-wrapper">
            <Map size={48} style={{ color: 'var(--ios-system-blue)' }} />
            <Sparkles 
              size={20} 
              className="onboarding-icon-sparkle"
              style={{ color: 'var(--ios-system-yellow)' }}
            />
          </div>
        </motion.div>

        <h1 className="ios-large-title onboarding-title" style={{ marginTop: '2rem' }}>
          {t('onboarding.tour.title')}
        </h1>
        <p className="ios-subhead onboarding-subtitle">
          {t('onboarding.tour.subtitle')}
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          type="button"
          onClick={onStartTour}
          className="onboarding-button-continue"
          style={{ width: '100%' }}
        >
          {t('onboarding.tour.start_tour')}
        </motion.button>
        
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          type="button"
          onClick={onSkip}
          className="onboarding-button-back"
          style={{ width: '100%', textAlign: 'center' }}
        >
          {t('onboarding.tour.skip')}
        </motion.button>
      </div>
    </div>
  );
};

export default StepTour;
