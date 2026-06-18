import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quotesApi } from '../../api/quotes';
import { priceListApi } from '../../api/priceList';
import QuoteStep1Shop from '../Venditori/QuoteWizard/QuoteStep1Shop';
import QuoteStep2Configuration from '../Venditori/QuoteWizard/QuoteStep2Configuration';
import QuoteStep5ClientInfo from '../Venditori/QuoteWizard/QuoteStep5ClientInfo';
import QuoteStep7Summary from '../Venditori/QuoteWizard/QuoteStep7Summary';
import QuoteStep8Finalize from '../Venditori/QuoteWizard/QuoteStep8Finalize';
import type { QuoteWizardData, SelectedService } from '../../types/quotes';
import type { PriceListItem } from '../../types/sellers';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerQuoteEditPage.css';

const TOTAL_STEPS = 5;

const SellerQuoteEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

  const [wizardData, setWizardData] = useState<QuoteWizardData>({
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
  });

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  useEffect(() => {
    if (user?.seller_id) {
      setWizardData(prev => ({ ...prev, seller_id: user.seller_id }));
    }
  }, [user]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const data = await quotesApi.getById(Number(id));

      // Converti Quote in QuoteWizardData
      const selectedServices: SelectedService[] = [];

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          // Carica il price_list_item se non presente
          let priceListItem: PriceListItem | null = item.price_list_item || null;
          
          if (!priceListItem && item.price_list_item_id) {
            try {
              priceListItem = await priceListApi.getById(item.price_list_item_id);
            } catch (error) {
              console.error(`Errore nel caricamento price_list_item ${item.price_list_item_id}:`, error);
              continue; // Salta questo item se non possiamo caricare il price_list_item
            }
          }

          if (!priceListItem) {
            continue; // Salta se non abbiamo il price_list_item
          }

          // Parse payment_option
          let paymentOption = item.payment_option;
          if (paymentOption && typeof paymentOption === 'string') {
            try {
              paymentOption = JSON.parse(paymentOption);
            } catch (e) {
              console.error('Errore parsing payment_option:', e);
              paymentOption = undefined;
            }
          }

          // Parse question_answers se presente (può non esistere su QuoteItem)
          let questionAnswers = (item as any).question_answers;
          if (questionAnswers && typeof questionAnswers === 'string') {
            try {
              questionAnswers = JSON.parse(questionAnswers);
            } catch (e) {
              questionAnswers = [];
            }
          }

          if (!item.price_list_item_id) {
            continue; // Salta se non abbiamo price_list_item_id
          }

          const selectedService: SelectedService = {
            price_list_item_id: item.price_list_item_id,
            price_list_item: priceListItem,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            discount: item.discount || 0,
            total: item.total || 0,
            payment_option: paymentOption,
            question_answers: questionAnswers || [],
            price_adjustments: 0,
          };

          selectedServices.push(selectedService);
        }
      }

      setWizardData({
        selectedServices,
        additionalItems: [],
        client_id: data.client_id,
        client_info: {
          company_name: data.client?.company_name || '',
          email: data.client?.email || '',
          phone: data.client?.phone || '',
          vat_number: data.client?.vat_number || '',
          address: data.client?.address || '',
          city: data.client?.city || '',
          zip_code: data.client?.zip_code || '',
          country: data.client?.country || 'Italia',
        },
        seller_id: data.seller_id,
        title: data.title || '',
        description: data.description || '',
        notes: data.notes || '',
        discount_percentage: data.discount_percentage || 0,
        tax_percentage: data.tax_percentage || 0,
        valid_until: data.valid_until ? data.valid_until.split('T')[0] : undefined,
      });
    } catch (error) {
      console.error('Errore nel caricamento preventivo:', error);
      alert('Errore nel caricamento del preventivo');
      navigate('/seller/preventivi');
    } finally {
      setLoading(false);
    }
  };

  const updateWizardData = (updates: Partial<QuoteWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const updateSelectedService = (index: number, updates: Partial<SelectedService>) => {
    setWizardData(prev => {
      const services = [...prev.selectedServices];
      const currentService = services[index];
      
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

  const getLogicalStep = (visualStep: number): number => {
    if (visualStep <= 2) return visualStep;
    if (visualStep === 3) return 5; // Saltiamo step 4 Servizi Consigliati
    if (visualStep === 4) return 7;
    if (visualStep === 5) return 8;
    return visualStep;
  };

  const getStepTitle = (visualStep: number): string => {
    const titles: Record<number, string> = {
      1: 'Selezione Servizi',
      2: 'Configurazione',
      3: 'Info Cliente',
      4: 'Riepilogo',
      5: 'Finalizzazione',
    };
    return titles[visualStep] || '';
  };

  const canProceedToNextStep = (): boolean => {
    const logicalStep = getLogicalStep(currentStep);
    switch (logicalStep) {
      case 1:
        return wizardData.selectedServices.length > 0;
      case 2:
        return wizardData.selectedServices.every(service => {
          const item = service.price_list_item;
          const renewalType = item.renewal_type;
          const renewalOptions = item.renewal_options || [];
          const activeRenewals = renewalOptions.filter(r => r.is_active !== false);
          
          if (renewalType === 'obbligatorio' && activeRenewals.length > 0) {
            if (activeRenewals.length === 1) {
              return !!service.selected_renewal;
            }
            return !!service.selected_renewal;
          }
          
          if (renewalType === 'multi' && activeRenewals.length > 0) {
            return service.selected_renewals && service.selected_renewals.length > 0;
          }
          
          return true;
        });
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return !!(wizardData.client_id || wizardData.client_info.company_name);
      case 6:
        return true;
      case 7:
        return !!wizardData.title && wizardData.title.trim().length > 0;
      case 8:
        return true;
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
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleSave = async () => {
    try {
      // Prepara i dati per l'aggiornamento (simile a QuoteStep8Finalize)
      const quoteItems = [
        ...wizardData.selectedServices.map(service => {
          const renewalType = service.price_list_item.renewal_type;
          
          const item: any = {
            price_list_item_id: service.price_list_item_id,
            description: service.price_list_item.name,
            quantity: service.quantity,
            unit_price: service.unit_price,
            discount: service.discount,
            total: service.total,
            payment_option: service.payment_option || null,
            notes: service.price_list_item.description || null,
            question_answers: service.question_answers || null,
          };
          
          if (renewalType === 'multi' && service.selected_renewals && service.selected_renewals.length > 0) {
            item.renewal_options = service.selected_renewals.map(r => ({
              ...r,
              price: r.price,
            }));
            item.renewal_option = null;
          } else if (service.selected_renewal) {
            item.renewal_option = {
              ...service.selected_renewal,
              price: service.selected_renewal.price,
            };
            item.renewal_options = null;
          } else {
            item.renewal_option = null;
            item.renewal_options = null;
          }
          
          return item;
        }),
      ];

      const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
      // Venditori non possono applicare sconti - sempre 0
      const discountAmount = 0;
      const totalAfterDiscount = subtotal - discountAmount;
      const taxAmount = totalAfterDiscount * (wizardData.tax_percentage / 100);
      const totalAmount = totalAfterDiscount + taxAmount;

      const quoteData = {
        client_id: wizardData.client_id,
        seller_id: wizardData.seller_id,
        title: wizardData.title,
        description: wizardData.description,
        notes: wizardData.notes,
        discount_percentage: 0, // Venditori non possono applicare sconti
        discount_amount: 0, // Venditori non possono applicare sconti
        tax_percentage: wizardData.tax_percentage,
        tax_amount: taxAmount,
        subtotal,
        total_amount: totalAmount,
        valid_until: wizardData.valid_until,
        items: quoteItems,
      };

      await quotesApi.update(Number(id), quoteData);
      alert('Preventivo aggiornato con successo!');
      navigate(`/seller/preventivi/${id}`);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento preventivo:', error);
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento del preventivo');
    }
  };

  const renderStep = () => {
    const logicalStep = getLogicalStep(currentStep);
    
    switch (logicalStep) {
      case 1:
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
        return (
          <QuoteStep7Summary
            wizardData={wizardData}
            onUpdate={updateWizardData}
            onSave={handleSave}
            isEditMode={true}
          />
        );
      case 8:
        return (
          <QuoteStep8Finalize
            wizardData={wizardData}
            onComplete={() => navigate(`/seller/preventivi/${id}`)}
            isEditMode={true}
            quoteId={Number(id)}
          />
        );
      default:
        return null;
    }
  };

  const getVisualSteps = () => {
    return [1, 2, 3, 4, 5];
  };

  if (loading) {
    return (
      <div className="quote-wizard-page quote-wizard-skeleton">
        <div className="quote-wizard-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 28, marginTop: 8 }} />
        </div>
        <div className="quote-wizard-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="quote-wizard-page">
      <div className="quote-wizard-header">
        <button
          className="btn-back-wizard"
          onClick={() => navigate(`/seller/preventivi/${id}`)}
        >
          <ChevronLeft size={20} />
          Annulla
        </button>
        <h1 className="quote-wizard-title">Modifica Preventivo</h1>
      </div>

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

      <div className="quote-wizard-content">
        <div className="quote-wizard-step-header">
          <h2>Step {currentStep} di {TOTAL_STEPS}: {getStepTitle(currentStep)}</h2>
        </div>
        {renderStep()}
      </div>

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
            onClick={handleSave}
          >
            Salva Modifiche
          </button>
        )}
      </div>
    </div>
  );
};

export default SellerQuoteEditPage;

