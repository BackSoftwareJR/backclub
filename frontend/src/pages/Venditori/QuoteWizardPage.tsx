import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QuoteStep1Services from './QuoteWizard/QuoteStep1Services';
import QuoteStep2Configuration from './QuoteWizard/QuoteStep2Configuration';
import QuoteStep3AdditionalItems from './QuoteWizard/QuoteStep3AdditionalItems';
import QuoteStep4Recommended from './QuoteWizard/QuoteStep4Recommended';
import QuoteStep5ClientInfo from './QuoteWizard/QuoteStep5ClientInfo';
import QuoteStep6Seller from './QuoteWizard/QuoteStep6Seller';
import QuoteStep7Summary from './QuoteWizard/QuoteStep7Summary';
import QuoteStep8Finalize from './QuoteWizard/QuoteStep8Finalize';
import type { QuoteWizardData, SelectedService } from '../../types/quotes';
import './QuoteWizardPage.css';

const TOTAL_STEPS = 8;

const QuoteWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Controlla se ci sono dati precompilati dal lead o dal progetto
  const locationState = location.state as { fromLead?: boolean; fromProject?: boolean; quoteData?: any; leadId?: number; projectId?: number } | null;
  const quoteDataFromLead = locationState?.quoteData;

  const [wizardData, setWizardData] = useState<QuoteWizardData>({
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
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Auto-set seller_id se l'utente è un venditore
  useEffect(() => {
    if ((user?.role === 'seller' || user?.role === 'venditori') && user?.seller_id) {
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
      
      console.log('QuoteWizardPage - updateSelectedService:', {
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

  const addAdditionalItem = (item: { description: string; quantity: number; unit_price: number }) => {
    const additionalItem = {
      ...item,
      discount: 0,
      total: item.quantity * item.unit_price,
    };
    setWizardData(prev => ({
      ...prev,
      additionalItems: [...prev.additionalItems, additionalItem],
    }));
  };

  const removeAdditionalItem = (index: number) => {
    const items = [...wizardData.additionalItems];
    items.splice(index, 1);
    setWizardData(prev => ({ ...prev, additionalItems: items }));
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
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
        return true; // Opzionale
      case 4:
        return true; // Opzionale
      case 5:
        return !!(wizardData.client_id || wizardData.client_info.company_name);
      case 6:
        return !!wizardData.seller_id;
      case 7:
        return true; // Riepilogo
      case 8:
        return true; // Finalizzazione
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

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

  const getStepTitle = (step: number): string => {
    const titles = {
      1: 'Selezione Servizi',
      2: 'Configurazione',
      3: 'Articoli Aggiuntivi',
      4: 'Servizi Consigliati',
      5: 'Info Cliente',
      6: 'Venditore',
      7: 'Riepilogo',
      8: 'Finalizzazione',
    };
    return titles[step as keyof typeof titles] || '';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <QuoteStep1Services
            selectedServices={wizardData.selectedServices}
            onAddService={addSelectedService}
            onRemoveService={removeSelectedService}
            onUpdateService={updateSelectedService}
          />
        );
      case 2:
        return (
          <QuoteStep2Configuration
            selectedServices={wizardData.selectedServices}
            onUpdateService={updateSelectedService}
          />
        );
      case 3:
        return (
          <QuoteStep3AdditionalItems
            additionalItems={wizardData.additionalItems}
            onAddItem={addAdditionalItem}
            onRemoveItem={removeAdditionalItem}
          />
        );
      case 4:
        return (
          <QuoteStep4Recommended
            selectedServices={wizardData.selectedServices}
            onAddService={addSelectedService}
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
      case 6:
        return (
          <QuoteStep6Seller
            seller_id={wizardData.seller_id}
            isSeller={user?.role === 'seller' || user?.role === 'venditori'}
            onUpdate={updateWizardData}
          />
        );
      case 7:
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
            onComplete={() => navigate('/venditori/preventivi')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="quote-wizard-page">
      <div className="quote-wizard-header">
        <button
          className="btn-back-wizard"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} />
          Annulla
        </button>
        <h1 className="quote-wizard-title">Nuovo Preventivo</h1>
      </div>

      {/* Progress Steps */}
      <div className="quote-wizard-progress">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
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
    </div>
  );
};

export default QuoteWizardPage;

