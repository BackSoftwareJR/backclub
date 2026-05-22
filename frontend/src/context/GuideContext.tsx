import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type TourId = 
  | 'dashboard-tour'
  | 'listini-tour'
  | 'preventivi-tour'
  | 'contratti-tour'
  | 'clienti-tour'
  | 'commissioni-tour'
  | 'contatti-tour'
  | 'agenda-tour'
  | 'complete-tour'
  | 'mobile-complete-tour'
  | 'freelance-dashboard-tour'
  | 'freelance-progetti-tour'
  | 'freelance-task-tour'
  | 'freelance-task-detail-tour'
  | 'freelance-richieste-tour'
  | 'freelance-chat-tour'
  | 'freelance-calendario-tour'
  | 'freelance-progetto-detail-tour'
  | 'freelance-supporto-tour'
  | 'freelance-notifiche-tour'
  | 'freelance-complete-tour';

interface GuideState {
  currentTour: TourId | null;
  isRunning: boolean;
  currentStep: number; // Aggiunto per mantenere lo step durante la navigazione
  completedTours: Set<TourId>;
  dismissedTours: Set<TourId>;
  showHelpCenter: boolean;
}

interface GuideContextType {
  state: GuideState;
  startTour: (tourId: TourId) => void;
  stopTour: () => void;
  completeTour: (tourId: TourId) => void;
  dismissTour: (tourId: TourId) => void;
  toggleHelpCenter: () => void;
  isTourCompleted: (tourId: TourId) => boolean;
  isTourDismissed: (tourId: TourId) => boolean;
  setCurrentStep: (step: number) => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

const STORAGE_KEY = 'seller-guide-state';

const loadState = (): Partial<GuideState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        completedTours: new Set(parsed.completedTours || []),
        dismissedTours: new Set(parsed.dismissedTours || []),
      };
    }
  } catch (error) {
    console.error('Error loading guide state:', error);
  }
  return {
    completedTours: new Set<TourId>(),
    dismissedTours: new Set<TourId>(),
  };
};

const saveState = (state: Partial<GuideState>) => {
  try {
    const toSave = {
      completedTours: Array.from(state.completedTours || []),
      dismissedTours: Array.from(state.dismissedTours || []),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving guide state:', error);
  }
};

export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadedState = loadState();
  
  const [state, setState] = useState<GuideState>({
    currentTour: null,
    isRunning: false,
    currentStep: 0,
    completedTours: loadedState.completedTours as Set<TourId> || new Set(),
    dismissedTours: loadedState.dismissedTours as Set<TourId> || new Set(),
    showHelpCenter: false,
  });

  const startTour = useCallback((tourId: TourId) => {
    console.log('Starting tour:', tourId);
    setState(prev => ({
      ...prev,
      currentTour: tourId,
      isRunning: true,
      currentStep: 0, // Reset step quando si avvia un nuovo tour
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const stopTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentTour: null,
      isRunning: false,
      currentStep: 0,
    }));
  }, []);

  const completeTour = useCallback((tourId: TourId) => {
    setState(prev => {
      const newCompleted = new Set(prev.completedTours);
      newCompleted.add(tourId);
      const newDismissed = new Set(prev.dismissedTours);
      newDismissed.delete(tourId); // Rimuovi da dismissed se completato
      
      const newState = {
        ...prev,
        currentTour: null,
        isRunning: false,
        currentStep: 0,
        completedTours: newCompleted,
        dismissedTours: newDismissed,
      };
      
      saveState(newState);
      return newState;
    });
  }, []);

  const dismissTour = useCallback((tourId: TourId) => {
    setState(prev => {
      const newDismissed = new Set(prev.dismissedTours);
      newDismissed.add(tourId);
      
      const newState = {
        ...prev,
        currentTour: null,
        isRunning: false,
        currentStep: 0,
        dismissedTours: newDismissed,
      };
      
      saveState(newState);
      return newState;
    });
  }, []);

  const toggleHelpCenter = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelpCenter: !prev.showHelpCenter,
    }));
  }, []);

  const isTourCompleted = useCallback((tourId: TourId) => {
    return state.completedTours.has(tourId);
  }, [state.completedTours]);

  const isTourDismissed = useCallback((tourId: TourId) => {
    return state.dismissedTours.has(tourId);
  }, [state.dismissedTours]);

  return (
    <GuideContext.Provider
      value={{
        state,
        startTour,
        stopTour,
        completeTour,
        dismissTour,
        toggleHelpCenter,
        isTourCompleted,
        isTourDismissed,
        setCurrentStep,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = (): GuideContextType => {
  const context = useContext(GuideContext);
  if (context === undefined) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};
