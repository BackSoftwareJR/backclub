import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import QuoteStep1Shop from '../Venditori/QuoteWizard/QuoteStep1Shop';
import QuoteStep1ShopMobile from '../Venditori/QuoteWizard/QuoteStep1ShopMobile';
import QuoteStep2Configuration from '../Venditori/QuoteWizard/QuoteStep2Configuration';
import QuoteStep5ClientInfo from '../Venditori/QuoteWizard/QuoteStep5ClientInfo';
import QuoteStep7Summary from '../Venditori/QuoteWizard/QuoteStep7Summary';
import QuoteStep7SummaryMobile from '../Venditori/QuoteWizard/QuoteStep7SummaryMobile';
import QuoteStep8Finalize from '../Venditori/QuoteWizard/QuoteStep8Finalize';
import type { QuoteWizardData, SelectedService } from '../../types/quotes';
import '../Venditori/QuoteWizardPage.css';
import '../Venditori/QuoteWizard/QuoteWizardMobile.css';

const TOTAL_STEPS = 5; // 5 step (saltiamo step 3 Articoli Aggiuntivi, step 4 Servizi Consigliati e step 6 Venditore)
const WIZARD_STORAGE_KEY = 'seller_quote_wizard_draft';

const SellerQuoteWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(1);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Controlla se ci sono dati precompilati dal lead o dal progetto
  const locationState = location.state as { fromLead?: boolean; fromProject?: boolean; quoteData?: any; leadId?: number; projectId?: number } | null;
  const quoteDataFromLead = locationState?.quoteData;

  // Carica stato salvato dal localStorage
  const loadSavedWizardState = (): { wizardData: QuoteWizardData; currentStep: number; completedSteps: Set<number> } | null => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          wizardData: parsed.wizardData,
          currentStep: parsed.currentStep || 1,
          completedSteps: new Set(parsed.completedSteps || []),
        };
      }
    } catch (error) {
      console.error('Errore nel caricamento stato salvato:', error);
    }
    return null;
  };

  // Salva stato nel localStorage
  const saveWizardState = (data: QuoteWizardData, step: number, completed: Set<number>) => {
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
        wizardData: data,
        currentStep: step,
        completedSteps: Array.from(completed),
        savedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Errore nel salvataggio stato:', error);
    }
  };

  // Cancella stato salvato
  const clearSavedWizardState = () => {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  };

  const [wizardData, setWizardData] = useState<QuoteWizardData>(() => {
    // Se ci sono dati dal lead/progetto, usa quelli
    if (quoteDataFromLead) {
      return {
    selectedServices: [],
    additionalItems: [],
    client_id: quoteDataFromLead?.client_id || undefined,
    client_info: {
      company_name: quoteDataFromLead?.client_info?.company_name || '',
      email: quoteDataFromLead?.client_info?.email || '',
      phone: quoteDataFromLead?.client_info?.phone || '',
      vat_number: quoteDataFromLead?.client_info?.vat_number || '',
      address: quoteDataFromLead?.client_info?.address || '',
      city: quoteDataFromLead?.client_info?.city || '',
      zip_code: quoteDataFromLead?.client_info?.zip_code || '',
      country: quoteDataFromLead?.client_info?.country || 'Italia',
    },
    seller_id: quoteDataFromLead?.seller_id || undefined,
    title: quoteDataFromLead?.title || '',
    description: quoteDataFromLead?.description || '',
    notes: quoteDataFromLead?.notes || '',
    discount_percentage: 0,
    tax_percentage: 0,
    valid_until: undefined,
      };
    }
    // Altrimenti usa stato vuoto (il prompt verrà mostrato dopo)
    return {
      selectedServices: [],
      additionalItems: [],
      client_id: undefined,
      client_info: {
        company_name: '',
        email: '',
        phone: '',
        vat_number: '',
        address: '',
        city: '',
        zip_code: '',
        country: 'Italia',
      },
      seller_id: undefined,
      title: '',
      description: '',
      notes: '',
      discount_percentage: 0,
      tax_percentage: 0,
      valid_until: undefined,
    };
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Controlla se c'è uno stato salvato al mount (solo se non ci sono dati dal lead)
  useEffect(() => {
    if (!quoteDataFromLead) {
      const saved = loadSavedWizardState();
      if (saved && (saved.wizardData.selectedServices.length > 0 || saved.wizardData.client_info.company_name)) {
        setShowRestorePrompt(true);
      }
    }
  }, []);

  // Salva stato ogni volta che cambia
  useEffect(() => {
    if (wizardData.selectedServices.length > 0 || wizardData.client_info.company_name) {
      saveWizardState(wizardData, currentStep, completedSteps);
    }
  }, [wizardData, currentStep, completedSteps]);

  // Auto-set seller_id dal venditore loggato
  useEffect(() => {
    if (user?.seller_id) {
      setWizardData(prev => ({ ...prev, seller_id: user.seller_id }));
    }
  }, [user]);

  // Calcola valid_until (30 giorni da oggi)
  useEffect(() => {
    if (!wizardData.valid_until) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setWizardData(prev => ({ 
        ...prev, 
        valid_until: date.toISOString().split('T')[0] 
      }));
    }
  }, []);

  const updateWizardData = (updates: Partial<QuoteWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const updateSelectedService = (index: number, updates: Partial<SelectedService>) => {
    setWizardData(prev => {
      const services = [...prev.selectedServices];
      const currentService = services[index];
      
      // Merge profondo per payment_option per assicurarsi che tutti i campi vengano preservati
      let mergedUpdates = { ...updates };
      if (updates.payment_option) {
        if (currentService.payment_option) {
          mergedUpdates.payment_option = {
            ...currentService.payment_option,
            ...updates.payment_option,
          };
        } else {
          mergedUpdates.payment_option = { ...updates.payment_option };
        }
      }
      
      services[index] = { ...currentService, ...mergedUpdates };
      
      console.log('SellerQuoteWizardPage - updateSelectedService:', {
        index,
        updates,
        mergedUpdates,
        payment_option: services[index].payment_option,
        payment_schedule: services[index].payment_schedule,
        allServices: services.map(s => ({
          name: s.price_list_item.name,
          payment_option: s.payment_option,
        })),
      });
      
      return { ...prev, selectedServices: services };
    });
  };

  const addSelectedService = (service: SelectedService) => {
    setWizardData(prev => ({
      ...prev,
      selectedServices: [...prev.selectedServices, service],
    }));
  };

  const removeSelectedService = (index: number) => {
    const services = [...wizardData.selectedServices];
    services.splice(index, 1);
    setWizardData(prev => ({ ...prev, selectedServices: services }));
  };

  // Mappa step visualizzati a step logici (saltiamo step 3 Articoli Aggiuntivi, step 4 Servizi Consigliati e step 6 Venditore)
  const getLogicalStep = (visualStep: number): number => {
    // Step 1-2 rimangono uguali
    if (visualStep <= 2) return visualStep;
    // Step 3 visuale = step 5 logico (Info Cliente) - saltiamo step 3 Articoli Aggiuntivi e step 4 Servizi Consigliati
    if (visualStep === 3) return 5;
    // Step 4 visuale = step 7 logico (Riepilogo) - saltiamo step 6 Venditore
    if (visualStep === 4) return 7;
    // Step 5 visuale = step 8 logico (Finalizzazione)
    if (visualStep === 5) return 8;
    return visualStep;
  };

  const canProceedToNextStep = (): boolean => {
    const logicalStep = getLogicalStep(currentStep);
    
    switch (logicalStep) {
      case 1:
        return wizardData.selectedServices.length > 0;
      case 2:
        // Verifica payment_option per tutti i servizi
        const allHavePaymentOption = wizardData.selectedServices.every(s => s.payment_option);
        if (!allHavePaymentOption) return false;
        
        // Verifica rinnovi obbligatori
        const allObligatoryRenewalsSelected = wizardData.selectedServices.every(service => {
          const renewalType = service.price_list_item.renewal_type;
          const renewalOptions = service.price_list_item.renewal_options || [];
          const activeRenewals = renewalOptions.filter(r => r.is_active !== false);
          
          // Se è obbligatorio, deve avere un rinnovo selezionato
          if (renewalType === 'obbligatorio' && activeRenewals.length > 0) {
            // Se c'è solo 1 opzione, è già selezionata automaticamente
            if (activeRenewals.length === 1) {
              return !!service.selected_renewal;
            }
            // Se ci sono più opzioni, deve essere selezionata una
            return !!service.selected_renewal;
          }
          
          // Se è multi-rinnovo, deve avere almeno una opzione selezionata
          if (renewalType === 'multi' && activeRenewals.length > 0) {
            return service.selected_renewals && service.selected_renewals.length > 0;
          }
          
          // Facoltativo o nessun rinnovo: ok
          return true;
        });
        
        return allObligatoryRenewalsSelected;
      case 3:
        // Step 3 Articoli Aggiuntivi saltato - non raggiungibile
        return true;
      case 4:
        // Step 4 Servizi Consigliati saltato - non raggiungibile
        return true;
      case 5:
        return !!(wizardData.client_id || wizardData.client_info.company_name);
      case 6:
        // Step venditore saltato - sempre valido perché seller_id è auto-impostato
        return true;
      case 7:
        // Riepilogo: titolo è obbligatorio
        return !!wizardData.title && wizardData.title.trim().length > 0;
      case 8:
        return true; // Finalizzazione
      default:
        return false;
    }
  };

  const handleNext = () => {
    const logicalStep = getLogicalStep(currentStep);
    
    // Special validation for Step 7 (Summary)
    if (logicalStep === 7) {
      if (!wizardData.title || !wizardData.title.trim()) {
        // Trigger error state in QuoteStep7Summary via custom event
        window.dispatchEvent(new CustomEvent('quote-title-validation-error'));
        return;
      }
    }
    
    if (canProceedToNextStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < TOTAL_STEPS) {
        let nextStep = currentStep + 1;
        // Salta automaticamente gli step che non devono essere visualizzati
        // (non dovrebbero esserci, ma per sicurezza)
        while (nextStep <= TOTAL_STEPS) {
          const nextLogicalStep = getLogicalStep(nextStep);
          if (nextLogicalStep === 3 || nextLogicalStep === 4 || nextLogicalStep === 6) {
            // Step saltati, passa al successivo
            nextStep++;
          } else {
            break;
          }
        }
        setCurrentStep(nextStep);
      }
    }
  };

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Assicura che seller_id sia sempre impostato prima di procedere
  useEffect(() => {
    if (user?.seller_id && !wizardData.seller_id) {
      setWizardData(prev => ({ ...prev, seller_id: user.seller_id }));
    }
  }, [user?.seller_id, wizardData.seller_id]);

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Permetti di tornare indietro a step completati
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  };

  const getStepTitle = (visualStep: number): string => {
    // Mappa step visuali a titoli (saltiamo step 3 Articoli Aggiuntivi, step 4 Servizi Consigliati e step 6 Venditore)
    const titles: Record<number, string> = {
      1: 'Selezione Servizi',
      2: 'Configurazione',
      3: 'Info Cliente', // Step 3 visuale = step 5 logico
      4: 'Riepilogo', // Step 4 visuale = step 7 logico
      5: 'Finalizzazione', // Step 5 visuale = step 8 logico
    };
    return titles[visualStep] || '';
  };

  // Auto-skip skipped steps (3, 4, 6) se per qualche motivo ci si finisce sopra
  useEffect(() => {
    const logicalStep = getLogicalStep(currentStep);
    if (logicalStep === 3 || logicalStep === 4 || logicalStep === 6) {
      // Trova il prossimo step valido
      let nextStep = currentStep + 1;
      while (nextStep <= TOTAL_STEPS) {
        const nextLogicalStep = getLogicalStep(nextStep);
        if (nextLogicalStep === 3 || nextLogicalStep === 4 || nextLogicalStep === 6) {
          nextStep++;
        } else {
          break;
        }
      }
      if (nextStep <= TOTAL_STEPS && nextStep !== currentStep) {
        setCurrentStep(nextStep);
      }
    }
  }, [currentStep]);

  const renderStep = () => {
    const logicalStep = getLogicalStep(currentStep);
    
    switch (logicalStep) {
      case 1:
        if (isMobile) {
          return (
            <QuoteStep1ShopMobile
              selectedServices={wizardData.selectedServices}
              onAddService={addSelectedService}
              onRemoveService={removeSelectedService}
              onUpdateService={updateSelectedService}
              onContinue={handleNext}
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
            />
          );
        }
        return (
          <QuoteStep1Shop
            selectedServices={wizardData.selectedServices}
            onAddService={addSelectedService}
            onRemoveService={removeSelectedService}
            onUpdateService={updateSelectedService}
            onContinue={handleNext}
          />
        );
      case 2:
        return (
          <QuoteStep2Configuration
            selectedServices={wizardData.selectedServices}
            onUpdateService={updateSelectedService}
          />
        );
      case 5:
        return (
          <QuoteStep5ClientInfo
            client_id={wizardData.client_id}
            client_info={wizardData.client_info}
            onUpdate={updateWizardData}
          />
        );
      case 7:
        if (isMobile) {
          return (
            <QuoteStep7SummaryMobile
              wizardData={wizardData}
              onUpdate={updateWizardData}
            />
          );
        }
        return (
          <QuoteStep7Summary
            wizardData={wizardData}
            onUpdate={updateWizardData}
          />
        );
      case 8:
        return (
          <QuoteStep8Finalize
            wizardData={wizardData}
            onComplete={() => {
              clearSavedWizardState(); // Pulisci localStorage quando completato
              navigate('/seller/preventivi');
            }}
          />
        );
      default:
        return null;
    }
  };

  // Genera array di step visualizzati (1-5, saltando step 3, 4 e 6 logici)
  const getVisualSteps = () => {
    return [1, 2, 3, 4, 5]; // Step 3 visuale = step 5 logico, Step 4 visuale = step 7 logico, Step 5 visuale = step 8 logico
  };

  const handleRestoreWizard = () => {
    const saved = loadSavedWizardState();
    if (saved) {
      setWizardData(saved.wizardData);
      setCurrentStep(saved.currentStep);
      setCompletedSteps(saved.completedSteps);
    }
    setShowRestorePrompt(false);
  };

  const handleStartNew = () => {
    clearSavedWizardState();
    setShowRestorePrompt(false);
  };

  return (
    <div className="quote-wizard-page">
      {/* Prompt per riprendere preventivo salvato */}
      {showRestorePrompt && (
        <div className="restore-wizard-overlay">
          <div className="restore-wizard-modal">
            <h2>Preventivo in corso</h2>
            <p>Hai un preventivo in corso di creazione. Vuoi riprendere da dove eri rimasto o iniziare un preventivo nuovo?</p>
            <div className="restore-wizard-actions">
              <button className="btn-restore" onClick={handleRestoreWizard}>
                Riprendi preventivo
              </button>
              <button className="btn-new" onClick={handleStartNew}>
                Inizia nuovo preventivo
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobile ? (
        <>
          {/* Mobile Header */}
          <div className="quote-wizard-header-mobile">
            <button
              className="quote-wizard-cancel-btn"
              onClick={() => navigate('/seller/preventivi')}
            >
              Annulla
            </button>
            <div className="quote-wizard-header-center">
              <h1 className="quote-wizard-title-mobile">Nuovo Preventivo</h1>
              <p className="quote-wizard-subtitle-mobile">
                Step {currentStep} di {TOTAL_STEPS}: {getStepTitle(currentStep)}
              </p>
            </div>
            <div style={{ width: '60px' }} /> {/* Spacer for centering */}
          </div>
          
          {/* Progress Bar */}
          <div className="quote-wizard-progress-bar-container">
            <div 
              className="quote-wizard-progress-bar"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          {/* Step Content - Mobile */}
          <div className="quote-wizard-content-mobile">
            {renderStep()}
          </div>

          {/* Mobile Navigation - Show for all steps except step 1 (which has its own footer) */}
          {getLogicalStep(currentStep) !== 1 && (
            <div className="quote-wizard-navigation-mobile">
              <button
                className="btn-nav-mobile btn-nav-secondary-mobile"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft size={18} />
                Indietro
              </button>
              {currentStep < TOTAL_STEPS ? (
                <button
                  className="btn-nav-mobile btn-nav-primary-mobile"
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                >
                  Avanti
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  className="btn-nav-mobile btn-nav-primary-mobile"
                  disabled
                >
                  Completato
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Desktop Header */}
          <div className="quote-wizard-header">
            <button
              className="btn-back-wizard"
              onClick={() => navigate('/seller/preventivi')}
            >
              <ChevronLeft size={20} />
              Annulla
            </button>
            <h1 className="quote-wizard-title">Nuovo Preventivo</h1>
          </div>

          {/* Progress Steps */}
          <div className="quote-wizard-progress">
            {getVisualSteps().map((step) => {
              const isCompleted = completedSteps.has(step);
              const isCurrent = step === currentStep;
              const isAccessible = step <= currentStep || completedSteps.has(step - 1);

              return (
                <div
                  key={step}
                  className={`progress-step ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isAccessible ? 'accessible' : ''}`}
                  onClick={() => isAccessible && handleStepClick(step)}
                >
                  <div className="progress-step-circle">
                    {isCompleted ? (
                      <Check size={16} />
                    ) : (
                      <span>{step}</span>
                    )}
                  </div>
                  <div className="progress-step-label">{getStepTitle(step)}</div>
                  {step < TOTAL_STEPS && (
                    <div className={`progress-step-line ${isCompleted ? 'completed' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="quote-wizard-content">
            <div className="quote-wizard-step-header">
              <h2>Step {currentStep} di {TOTAL_STEPS}: {getStepTitle(currentStep)}</h2>
            </div>
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="quote-wizard-navigation">
            <button
              className="btn-nav btn-nav-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={18} />
              Indietro
            </button>
            <div className="wizard-step-indicator">
              {currentStep} / {TOTAL_STEPS}
            </div>
            {currentStep < TOTAL_STEPS ? (
              <button
                className="btn-nav btn-nav-primary"
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
              >
                Avanti
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="btn-nav btn-nav-primary"
                disabled
              >
                Completato
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SellerQuoteWizardPage;

