import React, { useMemo, useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { QuoteWizardData, QuoteCalculation, PaymentSchedule } from '../../../types/quotes';
import sellersApi from '../../../api/sellers';
import type { Seller } from '../../../types/sellers';
import './QuoteWizardSteps.css';
import './QuoteStep7Summary.css';

interface QuoteStep7SummaryProps {
  wizardData: QuoteWizardData;
  onUpdate: (updates: Partial<QuoteWizardData>) => void;
  onSave?: () => void;
  isEditMode?: boolean;
}

// Funzione per calcolare le date di pagamento in base alla tipologia
const calculatePaymentSchedule = (
  serviceTotal: number,
  paymentOption: any,
  startDate: Date = new Date()
): PaymentSchedule[] => {
  const schedule: PaymentSchedule[] = [];
  
  if (!paymentOption) {
    // Default: pagamento unico
    schedule.push({
      date: startDate.toISOString().split('T')[0],
      amount: serviceTotal,
      commission: 0, // Sarà calcolato dopo
      description: 'Pagamento Unico',
    });
    return schedule;
  }

  const today = new Date(startDate);
  
  switch (paymentOption.type) {
    case 'tantum':
      // Pagamento unico
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal,
        commission: 0,
        description: 'Pagamento Unico',
      });
      break;
      
    case 'installments':
      // Rate: dividi in rate uguali
      let installments = paymentOption.installments;
      
      console.log('calculatePaymentSchedule - installments:', {
        type: paymentOption.type,
        installments: installments,
        serviceTotal,
        paymentOption: paymentOption,
      });
      
      // Se installments non è definito o è <= 1, usa un default di 2
      if (!installments || installments <= 1) {
        console.warn('installments non valido, uso default 2:', installments);
        installments = 2;
      }
      
      const installmentAmount = serviceTotal / installments;
      for (let i = 0; i < installments; i++) {
        const paymentDate = new Date(today);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        schedule.push({
          date: paymentDate.toISOString().split('T')[0],
          amount: installmentAmount,
          commission: 0,
          description: `Rata ${i + 1}/${installments}`,
        });
      }
      break;
      
    case 'split_30_40_30':
      // 30% all'ordine, 40% a metà, 30% alla fine
      const part1 = serviceTotal * 0.3;
      const part2 = serviceTotal * 0.4;
      const part3 = serviceTotal * 0.3;
      
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: part1,
        commission: 0,
        description: 'Acconto 30%',
      });
      
      const midDate = new Date(today);
      midDate.setMonth(midDate.getMonth() + 1);
      schedule.push({
        date: midDate.toISOString().split('T')[0],
        amount: part2,
        commission: 0,
        description: 'Pagamento 40%',
      });
      
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 2);
      schedule.push({
        date: endDate.toISOString().split('T')[0],
        amount: part3,
        commission: 0,
        description: 'Saldo 30%',
      });
      break;
      
    case '30_60_days':
      // 30% all'ordine, 70% a 60 giorni
      const upfront = serviceTotal * 0.3;
      const later = serviceTotal * 0.7;
      
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: upfront,
        commission: 0,
        description: 'Acconto 30%',
      });
      
      const laterDate = new Date(today);
      laterDate.setDate(laterDate.getDate() + 60);
      schedule.push({
        date: laterDate.toISOString().split('T')[0],
        amount: later,
        commission: 0,
        description: 'Saldo 70% (60 giorni)',
      });
      break;
      
    case 'custom':
      // Percentuali personalizzate
      if (paymentOption.percentages && paymentOption.percentages.length > 0) {
        paymentOption.percentages.forEach((percentage: number, index: number) => {
          const amount = serviceTotal * (percentage / 100);
          const paymentDate = new Date(today);
          if (index > 0) {
            paymentDate.setMonth(paymentDate.getMonth() + index);
          }
          schedule.push({
            date: paymentDate.toISOString().split('T')[0],
            amount: amount,
            commission: 0,
            description: `Pagamento ${percentage}%`,
          });
        });
      }
      break;
      
    default:
      // Default: pagamento unico
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal,
        commission: 0,
        description: 'Pagamento Unico',
      });
  }
  
  return schedule;
};

const QuoteStep7Summary: React.FC<QuoteStep7SummaryProps> = ({
  wizardData,
  onUpdate,
}) => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // Carica dati venditore se presente
  useEffect(() => {
    if (wizardData.seller_id) {
      sellersApi.getById(wizardData.seller_id)
        .then((sellerData) => {
          setSeller(sellerData);
        })
        .catch((error) => {
          console.error('Errore nel caricamento venditore:', error);
        });
    }
  }, [wizardData.seller_id]);

  // Calcola schedule pagamenti per ogni servizio
  useEffect(() => {
    const servicesWithSchedule = wizardData.selectedServices.map((service, idx) => {
      // Ricalcola sempre il payment_schedule per assicurarsi che sia aggiornato
      // Usa il totale corretto (con quantità e sconto applicati)
      const serviceTotal = service.total * service.quantity;
      
      console.log(`Step 7 - Servizio ${idx}:`, {
        name: service.price_list_item.name,
        payment_option: service.payment_option,
        payment_option_type: service.payment_option?.type,
        installments: service.payment_option?.installments,
        serviceTotal,
        hasPaymentSchedule: !!service.payment_schedule,
        paymentScheduleLength: service.payment_schedule?.length,
      });
      
      // Se c'è un payment_option, ricalcola sempre
      if (service.payment_option && service.payment_option.type) {
        // Normalizza il tipo: 'rate' diventa 'installments'
        const normalizedPaymentOption = {
          ...service.payment_option,
          type: service.payment_option.type === 'rate' ? 'installments' : service.payment_option.type,
        };
        
        const schedule = calculatePaymentSchedule(
          serviceTotal,
          normalizedPaymentOption
        );
        
        console.log(`Step 7 - Calcolato schedule per ${service.price_list_item.name}:`, {
          originalType: service.payment_option.type,
          normalizedType: normalizedPaymentOption.type,
          installments: normalizedPaymentOption.installments,
          scheduleLength: schedule.length,
          schedule: schedule,
        });
        
        return {
          ...service,
          payment_option: normalizedPaymentOption, // Salva anche la versione normalizzata
          payment_schedule: schedule,
        };
      }
      
      // Se non c'è payment_option, usa pagamento unico
      console.log(`Step 7 - Nessun payment_option per ${service.price_list_item.name}, usando pagamento unico`);
      const schedule = calculatePaymentSchedule(serviceTotal, null);
      return {
        ...service,
        payment_schedule: schedule,
      };
    });
    
    // Verifica se ci sono cambiamenti confrontando i payment_schedule
    const hasChanges = servicesWithSchedule.some((service, index) => {
      const original = wizardData.selectedServices[index];
      const originalSchedule = original.payment_schedule || [];
      const newSchedule = service.payment_schedule || [];
      
      // Controlla se la lunghezza è diversa
      if (originalSchedule.length !== newSchedule.length) {
        return true;
      }
      
      // Controlla se le descrizioni sono diverse (per rilevare cambi di tipo pagamento)
      if (originalSchedule.length > 0 && newSchedule.length > 0) {
        const originalDesc = originalSchedule.map(p => p.description).join(',');
        const newDesc = newSchedule.map(p => p.description).join(',');
        if (originalDesc !== newDesc) {
          return true;
        }
      }
      
      return false;
    });
    
    if (hasChanges) {
      onUpdate({ selectedServices: servicesWithSchedule });
    }
  }, [
    // Dipendenze: tipo pagamento, numero rate, e totale servizio
    wizardData.selectedServices.map(s => 
      `${s.payment_option?.type || 'none'}-${s.payment_option?.installments || 0}-${s.total * s.quantity}`
    ).join(',')
  ]);

  const calculation = useMemo<QuoteCalculation>(() => {
    // Calcolo subtotale servizi
    const servicesSubtotal = wizardData.selectedServices.reduce((sum, service) => {
      const total = service.total * service.quantity;
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    // Calcolo subtotale articoli aggiuntivi
    const additionalItemsSubtotal = wizardData.additionalItems.reduce((sum, item) => {
      const total = item.quantity * item.unit_price * (1 - (item.discount / 100));
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    // Subtotale totale (i margin_adjustment sono già applicati nei prezzi dei servizi)
    const subtotal = servicesSubtotal + additionalItemsSubtotal;

    // Il totale finale è uguale al subtotale
    // (i margin_adjustment sono già inclusi nei prezzi, non servono sconti/IVA aggiuntivi)
    const totalAmount = subtotal;

    // Manteniamo questi per compatibilità ma non li usiamo più
    const discountAmount = 0;
    const taxAmount = 0;

    // Calcolo provvigioni basato su incassi effettivi
    const commissionRate = parseFloat(String(seller?.commission_rate || 0)) || 0;
    const allPayments: PaymentSchedule[] = [];
    
    // Raccogli tutti i pagamenti da tutti i servizi
    wizardData.selectedServices.forEach((service) => {
      if (service.payment_schedule) {
        service.payment_schedule.forEach((payment) => {
          const commission = payment.amount * (commissionRate / 100);
          allPayments.push({
            ...payment,
            commission,
            service_name: service.price_list_item.name,
          });
        });
      }
    });
    
    // Ordina per data
    allPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calcola provvigione totale
    const totalCommission = allPayments.reduce((sum, payment) => sum + payment.commission, 0);

    // Calcolo totale rinnovi (singoli + multi)
    const totalRenewals = wizardData.selectedServices.reduce((sum, service) => {
      // Rinnovo singolo
      if (service.selected_renewal) {
        return sum + (service.selected_renewal.price || 0);
      }
      // Multi-rinnovo: somma tutte le opzioni selezionate
      if (service.selected_renewals && service.selected_renewals.length > 0) {
        return sum + service.selected_renewals.reduce((s, r) => s + (r.price || 0), 0);
      }
      return sum;
    }, 0);

    // Calcolo margini disponibili e usati
    const availableMargin = wizardData.selectedServices.reduce((sum, service) => {
      const margin = service.price_list_item.margin_percentage || 0;
      const total = service.total * service.quantity;
      return sum + (isNaN(total) ? 0 : total * (margin / 100));
    }, 0);

    const usedMargin = wizardData.selectedServices.reduce((sum, service) => {
      const adjustment = service.margin_adjustment || 0;
      const total = service.total * service.quantity;
      return sum + (isNaN(total) ? 0 : total * (adjustment / 100));
    }, 0);

    return {
      services_subtotal: servicesSubtotal,
      additional_items_subtotal: additionalItemsSubtotal,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      seller_commission: totalCommission,
      seller_commission_percentage: commissionRate,
      available_margin: availableMargin,
      used_margin: usedMargin,
      payment_schedule: allPayments,
      total_renewals: totalRenewals,
    };
  }, [wizardData, seller]);

  // Listen for validation error event from parent
  useEffect(() => {
    const handleValidationError = () => {
      if (!wizardData.title || !wizardData.title.trim()) {
        setTitleError(true);
        // Scroll to top and then to the input
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            titleInputRef.current?.focus();
          }, 300);
        }, 100);
      }
    };

    window.addEventListener('quote-title-validation-error', handleValidationError);
    return () => {
      window.removeEventListener('quote-title-validation-error', handleValidationError);
    };
  }, [wizardData.title]);

  // Handle margin adjustment for all services
  const handleMarginAdjustment = (delta: number) => {
    const updatedServices = wizardData.selectedServices.map((service) => {
    const basePrice = parseFloat(String(service.price_list_item.base_price || 0)) || 0;
    const margin = parseFloat(String(service.price_list_item.margin_percentage || 0)) || 0;
      const currentAdjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
      
      // Calcola il nuovo adjustment
      let newAdjustment = currentAdjustment + delta;
    
      // Limita la diminuzione al margine disponibile (non può scendere sotto -margin)
    const maxDecrease = -margin;
      newAdjustment = Math.max(maxDecrease, newAdjustment);
      
      // Non c'è limite superiore per l'aumento
    
      // Calcola nuovo prezzo
      const marginMultiplier = 1 + (margin + newAdjustment) / 100;
    const newPrice = basePrice * marginMultiplier;
    
    // Verifica che il prezzo sia valido
    if (isNaN(newPrice) || newPrice <= 0) {
        return service; // Mantieni il servizio invariato se c'è un errore
    }
    
    const discountMultiplier = 1 - service.discount / 100;
    const newTotal = newPrice * service.quantity * discountMultiplier;
    
    // Ricalcola payment schedule con nuovo totale
    const newSchedule = calculatePaymentSchedule(
      newTotal,
      service.payment_option
    );
    
      return {
      ...service,
        margin_adjustment: newAdjustment,
      unit_price: newPrice,
      total: newTotal,
      payment_schedule: newSchedule,
    };
    });
    
    onUpdate({ selectedServices: updatedServices });
  };

  return (
    <div className="quote-step-content summary-split-view">
      {/* Split View Layout */}
      <div className="summary-grid">
        {/* Left Column - Services List (The Receipt) */}
        <div className="summary-left-column">
          <div className="summary-services-card">
            <div className="summary-services-header">
              <h2 className="summary-services-title">Riepilogo Preventivo</h2>
      </div>

            {/* Document Header - Title & Date (Top Priority) */}
            <div className="summary-document-header">
              <div className="summary-input-group summary-input-group-title">
                <label className="summary-input-label">
                  TITOLO PREVENTIVO (Richiesto)
                </label>
                    <input
                  ref={titleInputRef}
                  type="text"
                  required
                  className={`summary-input summary-input-title ${titleError ? 'summary-input-error' : ''}`}
                  value={wizardData.title}
                      onChange={(e) => {
                    onUpdate({ title: e.target.value });
                    if (titleError && e.target.value.trim()) {
                      setTitleError(false);
                    }
                  }}
                  placeholder="Es: Sito Web Ristorante Rossi"
                />
                {titleError && (
                  <span className="summary-input-error-message">
                    Inserisci un titolo per proseguire
                  </span>
                )}
              </div>
              <div className="summary-input-group summary-input-group-date">
                <label className="summary-input-label">VALIDO FINO A</label>
                <input
                  type="date"
                  className="summary-input"
                  value={wizardData.valid_until || ''}
                  onChange={(e) => onUpdate({ valid_until: e.target.value })}
                />
        </div>
      </div>

            {/* Services List - Scrollable */}
            <div className="summary-services-list-scrollable">
              {wizardData.selectedServices.map((service, index) => {
                const total = parseFloat(String(service.total * service.quantity || 0)) || 0;
                const departmentName = service.price_list_item.department?.name || '';
                
                return (
                  <React.Fragment key={index}>
                    <div className="summary-service-row-compact">
                      <div className="summary-service-info-compact">
                        <div className="summary-service-name-compact">{service.price_list_item.name}</div>
                        {departmentName && (
                          <div className="summary-service-category-compact">{departmentName}</div>
                        )}
                      </div>
                      <div className="summary-service-price-compact">
                        € {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    {index < wizardData.selectedServices.length - 1 && (
                      <div className="summary-divider-compact"></div>
                    )}
                  </React.Fragment>
                );
              })}
          </div>

          </div>
        </div>

        {/* Right Column - Profit & Actions (The Deal Closer) - Sticky */}
        <div className="summary-right-column">
          <div className="summary-deal-closer">
            {/* Profit & Commission Section - HERO */}
            {calculation.seller_commission > 0 && (
              <div className="summary-commission-hero">
                <div className="summary-commission-label">
                  La tua Provvigione ({Number(calculation.seller_commission_percentage).toFixed(1)}%)
                </div>
                <div className="summary-commission-value">
                  € {calculation.seller_commission.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
                <div className="summary-commission-hint">
                  Guadagno netto su questa vendita
          </div>
        </div>
      )}

            {/* Margin/Discount Controls */}
            <div className="summary-controls-compact">
              <div className="summary-control-row-compact">
                <button
                  type="button"
                  className="summary-control-btn summary-control-btn-discount"
                  onClick={() => handleMarginAdjustment(-1)}
                  disabled={wizardData.selectedServices.every(service => {
                    const margin = parseFloat(String(service.price_list_item.margin_percentage || 0)) || 0;
                    const currentAdjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
                    return currentAdjustment <= -margin;
                  })}
                >
                  <Minus size={16} />
                  <span>Sconto</span>
                </button>
                <div className="summary-control-display-compact">
                  {(() => {
                    const avgAdjustment = wizardData.selectedServices.reduce((sum, service) => {
                      const adjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
                      return sum + adjustment;
                    }, 0) / wizardData.selectedServices.length;
                    
                    if (avgAdjustment < 0) {
                      return <span className="summary-control-value discount">{avgAdjustment.toFixed(1)}%</span>;
                    } else if (avgAdjustment > 0) {
                      return <span className="summary-control-value margin">+{avgAdjustment.toFixed(1)}%</span>;
                    } else {
                      return <span className="summary-control-value neutral">0%</span>;
                    }
                  })()}
        </div>
                <button
                  type="button"
                  className="summary-control-btn summary-control-btn-margin"
                  onClick={() => handleMarginAdjustment(1)}
                >
                  <Plus size={16} />
                  <span>Margine</span>
                </button>
          </div>
        </div>

            {/* Grand Total */}
            <div className="summary-total-section">
              <div className="summary-total-row-compact">
                <span className="summary-total-label-compact">Subtotale</span>
                <span className="summary-total-value-compact">
                  € {calculation.subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
          </div>
              <div className="summary-total-final-compact">
                <span className="summary-total-label-final-compact">Totale</span>
                <span className="summary-total-value-final-compact">
                  € {calculation.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </span>
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteStep7Summary;
