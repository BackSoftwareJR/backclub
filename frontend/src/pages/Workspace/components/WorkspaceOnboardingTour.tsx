import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { WORKSPACE_ONBOARDING_KEY, DEVELOPER_ONBOARDING_STEPS } from '../config/workspaceOnboarding';
import './WorkspaceOnboardingTour.css';

interface WorkspaceOnboardingTourProps {
  isFirstVisit: boolean;
}

const WorkspaceOnboardingTour: React.FC<WorkspaceOnboardingTourProps> = ({ isFirstVisit }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStep = DEVELOPER_ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === DEVELOPER_ONBOARDING_STEPS.length - 1;

  // Check if onboarding should be shown
  useEffect(() => {
    try {
      const completed = localStorage.getItem(WORKSPACE_ONBOARDING_KEY);
      if (!completed && isFirstVisit) {
        // Show onboarding after a brief delay to let the page load
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.debug('LocalStorage not available for onboarding:', error);
    }
  }, [isFirstVisit]);

  // Find target element for current step
  useEffect(() => {
    if (!isVisible || !currentStep.targetSelector) {
      setTargetElement(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(currentStep.targetSelector!) as HTMLElement;
      setTargetElement(element);
    };

    // Try immediately and with a slight delay for dynamic content
    findElement();
    const timer = setTimeout(findElement, 100);
    
    return () => clearTimeout(timer);
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(WORKSPACE_ONBOARDING_KEY, 'completed');
    } catch (error) {
      console.debug('Failed to save onboarding completion:', error);
    }
    setIsVisible(false);
  };

  const getTooltipPosition = (): { top?: string; left?: string; right?: string; bottom?: string; transform?: string } => {
    if (!targetElement || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipOffset = 20;

    switch (currentStep.position) {
      case 'top':
        return {
          top: `${rect.top - tooltipOffset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: `${rect.bottom + tooltipOffset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - tooltipOffset}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + tooltipOffset}px`,
          transform: 'translate(0, -50%)',
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="workspace-onboarding-backdrop" />
      
      {/* Target element highlight */}
      {targetElement && (
        <div
          className="workspace-onboarding-highlight"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      {/* Onboarding tooltip */}
      <div
        className="workspace-onboarding-tooltip"
        style={getTooltipPosition()}
      >
        <div className="workspace-onboarding-content">
          <div className="workspace-onboarding-header">
            <h3 className="workspace-onboarding-title">{currentStep.title}</h3>
            <button
              className="workspace-onboarding-close"
              onClick={handleSkip}
              aria-label="Chiudi tour"
            >
              <X size={18} />
            </button>
          </div>

          <p className="workspace-onboarding-description">
            {currentStep.description}
          </p>

          <div className="workspace-onboarding-progress">
            {DEVELOPER_ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`workspace-onboarding-dot ${
                  index === currentStepIndex ? 'active' : ''
                } ${index < currentStepIndex ? 'completed' : ''}`}
              />
            ))}
          </div>

          <div className="workspace-onboarding-actions">
            <button
              className="workspace-onboarding-btn workspace-onboarding-btn-secondary"
              onClick={handleSkip}
            >
              Salta
            </button>
            <div className="workspace-onboarding-nav">
              {currentStepIndex > 0 && (
                <button
                  className="workspace-onboarding-btn workspace-onboarding-btn-ghost"
                  onClick={handlePrevious}
                >
                  Indietro
                </button>
              )}
              <button
                className="workspace-onboarding-btn workspace-onboarding-btn-primary"
                onClick={handleNext}
              >
                {isLastStep ? 'Completa' : 'Avanti'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkspaceOnboardingTour;