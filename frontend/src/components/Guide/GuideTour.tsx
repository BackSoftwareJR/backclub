import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGuide } from '../../context/GuideContext';
import { useTheme } from '../../context/ThemeContext';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { triggerHaptic, hapticButtonPress, hapticSelection } from '../../utils/hapticFeedback';
import { setupSwipeGesture } from '../../utils/gestureSupport';
import './GuideTour.css';

export interface GuideStep {
  target: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disableBeacon?: boolean;
  navigateTo?: string; // Path per navigazione automatica
}

interface GuideTourProps {
  steps: GuideStep[];
  tourId: string;
  showProgress?: boolean;
  showSkipButton?: boolean;
}

const GuideTour: React.FC<GuideTourProps> = ({
  steps,
  tourId,
  showProgress = true,
  showSkipButton = true,
}) => {
  const { t } = useTranslation();
  const { state, stopTour, completeTour, dismissTour, setCurrentStep: setContextStep } = useGuide();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Tutti gli hook DEVONO essere chiamati in cima, prima di qualsiasi return (Rules of Hooks)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isRunning = state.isRunning && state.currentTour === tourId;
  const currentStep = state.currentStep ?? 0;
  const setCurrentStep = useCallback((step: number) => {
    setContextStep(step);
  }, [setContextStep]);

  // Define handlers before useEffects that use them
  const handleNext = useCallback(() => {
    hapticButtonPress();
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Se il prossimo step richiede navigazione, verrà gestito dall'useEffect
    } else {
      triggerHaptic('success');
      completeTour(tourId as any);
      stopTour();
    }
  }, [currentStep, steps.length, completeTour, stopTour, tourId, setCurrentStep]);

  const handleBack = useCallback(() => {
    hapticButtonPress();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);
  
  // Setup swipe gestures for mobile
  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip || !isVisible || !isRunning) return;

    const cleanup = setupSwipeGesture(tooltip, {
      onSwipeLeft: () => {
        // Swipe left = next
        if (currentStep < steps.length - 1) {
          handleNext();
        }
      },
      onSwipeRight: () => {
        // Swipe right = back
        if (currentStep > 0) {
          handleBack();
        }
      },
    });

    return cleanup;
  }, [isVisible, isRunning, currentStep, steps.length, handleNext, handleBack]);
  
  // Debug log
  useEffect(() => {
    if (isRunning) {
      console.log(`GuideTour ${tourId} is running, steps:`, steps.length);
    }
  }, [isRunning, tourId, steps.length]);

  // Gestione navigazione automatica
  useEffect(() => {
    if (!isRunning || steps.length === 0) return;

    const step = steps[currentStep];
    if (!step || !step.navigateTo) return;

    // Se lo step richiede navigazione e non siamo già sulla pagina corretta
    if (location.pathname !== step.navigateTo) {
      console.log(`Navigating to: ${step.navigateTo} for step ${currentStep}`);
      // NON nascondere il tooltip - lascia che continui durante la navigazione
      // Naviga alla pagina corretta
      navigate(step.navigateTo);
      // Il tour continuerà automaticamente quando la nuova pagina si carica
      // perché lo step è salvato nel context e isRunning rimane true
    }
  }, [isRunning, currentStep, steps, location.pathname, navigate]);

  useEffect(() => {
    if (!isRunning || steps.length === 0) {
      setIsVisible(false);
      setTargetElement(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) {
      setIsVisible(false);
      return;
    }

    // Se lo step richiede navigazione, aspetta che la navigazione sia completata
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      console.log(`Waiting for navigation to ${step.navigateTo}, current path: ${location.pathname}`);
      setIsVisible(false);
      setTargetElement(null);
      // NON fermare il tour - aspetta solo che la navigazione sia completata
      return;
    }

    // Retry mechanism per trovare l'elemento (potrebbe non essere ancora nel DOM)
    // Aumentato i retry per dare più tempo dopo la navigazione
    let retryCount = 0;
    const maxRetries = 20; // Aumentato ulteriormente per navigazione
    const retryDelay = 250; // Aumentato il delay
    let timeoutId: number | null = null;

    const findElement = () => {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        console.log(`Element found: ${step.target} on page ${location.pathname}`);
        setTargetElement(element);
        setIsVisible(true);
        return;
      }
      
      if (retryCount < maxRetries) {
        retryCount++;
        timeoutId = setTimeout(findElement, retryDelay);
        return;
      }
      
      console.warn(`Element not found after ${maxRetries} retries: ${step.target} on page ${location.pathname}`);
      setIsVisible(false);
      setTargetElement(null);
    };

    // Aspetta un po' prima di iniziare a cercare (dopo la navigazione)
    const initialDelay = step.navigateTo ? 300 : 0;
    timeoutId = setTimeout(findElement, initialDelay);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

  }, [isRunning, currentStep, steps, location.pathname]);

  // Effetto separato per gestire la posizione del tooltip quando l'elemento è trovato
  useEffect(() => {
    // IMPORTANTE: Se il tour NON è attivo, NON fare NULLA
    if (!isRunning) {
      // Pulisci eventuali timeout pendenti
      return;
    }
    
    if (!targetElement || !isVisible) return;

    const step = steps[currentStep];
    if (!step) return;

    // Flag per prevenire scroll ricorsivi
    let isScrolling = false;
    let scrollTimeoutId: number | null = null;
    let userScrolling = false;
    let userScrollTimeoutId: number | null = null;
    let hasScrolledOnce = false; // Flag per fare scroll solo una volta per step

    // Rileva scroll manuale dell'utente
    const detectUserScroll = () => {
      userScrolling = true;
      if (userScrollTimeoutId) clearTimeout(userScrollTimeoutId);
      // Dopo 500ms senza scroll manuale, considera che l'utente ha finito
      userScrollTimeoutId = setTimeout(() => {
        userScrolling = false;
      }, 500);
    };

    // Calcola posizione tooltip (senza fare scroll)
    const updatePosition = (skipScroll = false) => {
      // CRITICO: Se il tour non è più attivo, NON fare NULLA
      if (!isRunning || !isVisible) return;
      
      // Non fare nulla se l'utente sta scrollando manualmente
      if (userScrolling && !skipScroll) return;
      
      // Verifica che l'elemento target esista ancora
      if (!targetElement || !document.contains(targetElement)) return;
      
      const rect = targetElement.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      
      // On mobile, position tooltip so target element is visible
      if (isMobile) {
        const viewportHeight = window.innerHeight;
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0', 10) || 0;
        
        // Calculate optimal position: ensure target element is always visible
        const targetBottom = rect.bottom;
        const targetTop = rect.top;
        const spacing = 20; // Increased spacing for better visibility
        const minTooltipTop = 10;
        const estimatedTooltipHeight = tooltipRect.height || 280; // Better estimate
        
        // Check if target would be covered by bottom-sheet tooltip
        const bottomSheetTop = viewportHeight - estimatedTooltipHeight - safeAreaBottom;
        const targetWouldBeCovered = targetBottom > (bottomSheetTop - spacing);
        
        if (targetWouldBeCovered && targetTop > estimatedTooltipHeight + spacing + 50) {
          // Target would be covered and there's space above - position tooltip above target
          const tooltipTop = Math.max(minTooltipTop, targetTop - estimatedTooltipHeight - spacing);
          setTooltipPosition({ 
            top: tooltipTop, 
            left: 0 
          });
          
          // Scroll to ensure target is visible (solo UNA volta per step, non ricorsivo)
          if (!skipScroll && !isScrolling && !hasScrolledOnce) {
            isScrolling = true;
            hasScrolledOnce = true; // Marca che abbiamo già fatto scroll per questo step
            if (scrollTimeoutId) {
              clearTimeout(scrollTimeoutId);
            }
            scrollTimeoutId = setTimeout(() => {
              // Verifica ancora che il tour sia attivo prima di scrollare
              if (!isRunning || !isVisible) {
                isScrolling = false;
                return;
              }
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
              // Reset flag dopo lo scroll
              setTimeout(() => {
                isScrolling = false;
              }, 1000);
            }, 50);
          }
        } else {
          // Use bottom-sheet style and scroll target up if needed
          setTooltipPosition({ 
            top: bottomSheetTop, 
            left: 0 
          });
          
          // Scroll target element up if it would be covered (solo UNA volta per step, non ricorsivo)
          if (!skipScroll && !isScrolling && !hasScrolledOnce) {
            isScrolling = true;
            hasScrolledOnce = true; // Marca che abbiamo già fatto scroll per questo step
            if (scrollTimeoutId) {
              clearTimeout(scrollTimeoutId);
            }
            scrollTimeoutId = setTimeout(() => {
              // Verifica ancora che il tour sia attivo prima di scrollare
              if (!isRunning || !isVisible) {
                isScrolling = false;
                return;
              }
              const targetRect = targetElement.getBoundingClientRect();
              const tooltipTopPos = bottomSheetTop;
              if (targetRect.bottom > tooltipTopPos - spacing) {
                // Calculate how much to scroll to show target above tooltip
                const scrollAmount = (targetRect.bottom + spacing) - tooltipTopPos;
                window.scrollBy({ 
                  top: scrollAmount, 
                  behavior: 'smooth' 
                });
              }
              // Reset flag dopo lo scroll
              setTimeout(() => {
                isScrolling = false;
              }, 1000);
            }, 100);
          }
        }
        return;
      }

      // Desktop positioning
      const placement = step.placement || 'bottom';
      const spacing = 16;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = rect.top - tooltipRect.height - spacing;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + spacing;
          break;
      }

      // Assicurati che il tooltip sia visibile nella viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 10) left = 10;
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
      }
      if (top < 10) top = 10;
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = viewportHeight - tooltipRect.height - 10;
      }

      setTooltipPosition({ top, left });
    };

    // Scroll element into view (only on desktop, mobile handles it in updatePosition)
    // IMPORTANTE: Solo se il tour è attivo e non abbiamo già fatto scroll
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && !isScrolling && !hasScrolledOnce && isRunning && isVisible) {
      isScrolling = true;
      hasScrolledOnce = true;
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => {
        isScrolling = false;
      }, 1000);
    }

    // Aggiorna posizione dopo un breve delay per permettere al tooltip di renderizzarsi
    // Solo se il tour è ancora attivo
    if (isRunning && isVisible) {
      setTimeout(() => updatePosition(false), 100);
    }
    
    // Throttle per resize e scroll per evitare troppe chiamate
    let resizeTimeoutId: number | null = null;
    let scrollTimeoutId2: number | null = null;
    
    const handleResize = () => {
      // CRITICO: Se il tour non è attivo, NON fare NULLA
      if (!isRunning || !isVisible) return;
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => updatePosition(true), 150);
    };
    
    const handleScroll = () => {
      // CRITICO: Se il tour non è attivo, NON fare NULLA
      if (!isRunning || !isVisible) {
        // Non fare nulla se il tour non è attivo
        return;
      }
      
      // Rileva scroll manuale dell'utente
      detectUserScroll();
      
      // Aggiorna solo la posizione, NON fare scroll (skipScroll = true)
      if (scrollTimeoutId2) clearTimeout(scrollTimeoutId2);
      scrollTimeoutId2 = setTimeout(() => {
        // Verifica ancora che il tour sia attivo
        if (isRunning && isVisible) {
          updatePosition(true);
        }
      }, 50);
    };
    
    // Aggiungi listener SOLO se il tour è attivo
    if (isRunning && isVisible) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      // Rileva anche touchmove per mobile
      window.addEventListener('touchmove', detectUserScroll, { passive: true });
    }

    return () => {
      // Rimuovi listener sempre (sono sicuro che siano stati aggiunti solo se isRunning && isVisible)
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('touchmove', detectUserScroll);
      if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      if (scrollTimeoutId2) clearTimeout(scrollTimeoutId2);
      if (userScrollTimeoutId) clearTimeout(userScrollTimeoutId);
    };
  }, [targetElement, isVisible, currentStep, steps, isRunning]);

  const handleSkip = useCallback(() => {
    hapticSelection();
    setPendingAction(() => () => {
      dismissTour(tourId as any);
      stopTour();
    });
    setShowConfirmDialog(true);
  }, [dismissTour, stopTour, tourId]);

  const handleClose = useCallback(() => {
    hapticSelection();
    setPendingAction(() => () => {
      dismissTour(tourId as any);
      stopTour();
    });
    setShowConfirmDialog(true);
  }, [dismissTour, stopTour, tourId]);

  const handleConfirmTerminate = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  }, [pendingAction]);

  const handleResume = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  }, []);

  // Dialog di conferma
  if (showConfirmDialog) {
    return (
      <div className="guide-confirm-dialog-overlay">
        <div className={`guide-confirm-dialog ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
          <h3>{t('tour.confirm.title')}</h3>
          <p>{t('tour.confirm.message')}</p>
          <div className="guide-confirm-dialog-actions">
            <button
              className="guide-btn guide-btn-secondary"
              onClick={() => {
                hapticButtonPress();
                handleResume();
              }}
            >
              {t('tour.confirm.resume')}
            </button>
            <button
              className="guide-btn guide-btn-danger"
              onClick={() => {
                hapticButtonPress();
                handleConfirmTerminate();
              }}
            >
              {t('tour.confirm.terminate')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isRunning || !isVisible || steps.length === 0 || !targetElement) {
    return null;
  }

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Calcola spotlight position
  const rect = targetElement.getBoundingClientRect();
  const spotlightStyle = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };

  // Calcola clip-path per creare un buco trasparente nell'overlay
  // Il clip-path crea un rettangolo che copre tutto tranne l'area evidenziata
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Aggiungi un po' di padding per il bordo
  const padding = 4;
  const left = Math.max(0, rect.left - padding);
  const top = Math.max(0, rect.top - padding);
  const right = Math.min(viewportWidth, rect.left + rect.width + padding);
  const bottom = Math.min(viewportHeight, rect.top + rect.height + padding);

  const clipPath = `polygon(
    0% 0%, 
    0% 100%, 
    ${left}px 100%, 
    ${left}px ${top}px, 
    ${right}px ${top}px, 
    ${right}px ${bottom}px, 
    ${left}px ${bottom}px, 
    ${left}px 100%, 
    100% 100%, 
    100% 0%
  )`;

  const overlayStyle = {
    clipPath: clipPath,
    WebkitClipPath: clipPath, // Supporto Safari
  };

  return (
    <>
      {/* Overlay con blur - ha un buco trasparente dove c'è lo spotlight */}
      <div
        ref={overlayRef}
        className={`guide-overlay ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}
        style={overlayStyle}
        onClick={handleClose}
      />

      {/* Spotlight - Solo bordo, completamente trasparente */}
      <div
        className="guide-spotlight"
        style={spotlightStyle}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`guide-tooltip ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="guide-tooltip-header">
          {showProgress && (
            <div className="guide-progress">
              {currentStep + 1} / {steps.length}
            </div>
          )}
          <button
            className="guide-close-btn"
            onClick={handleClose}
            aria-label={t('tour.buttons.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="guide-tooltip-content">
          {step.content}
        </div>

        {/* Footer */}
        <div className="guide-tooltip-footer">
          <div className="guide-tooltip-actions">
            {showSkipButton && (
              <button
                className="guide-btn guide-btn-skip"
                onClick={handleSkip}
              >
                {t('tour.buttons.skip')}
              </button>
            )}
            <div className="guide-btn-group">
              {!isFirst && (
                <button
                  className="guide-btn guide-btn-back"
                  onClick={handleBack}
                >
                  <ChevronLeft size={16} />
                  {t('tour.buttons.back')}
                </button>
              )}
              <button
                className="guide-btn guide-btn-primary"
                onClick={handleNext}
              >
                {isLast ? t('tour.buttons.finish') : t('tour.buttons.next')}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuideTour;
