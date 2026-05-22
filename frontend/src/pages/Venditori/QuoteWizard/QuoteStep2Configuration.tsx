import React, { useEffect } from 'react';
import { RefreshCw, Minus, Plus } from 'lucide-react';
import type { SelectedService, PaymentSchedule } from '../../../types/quotes';
import type { PaymentOption, RenewalOption } from '../../../types/sellers';
import './QuoteWizardSteps.css';
import './QuoteStep2Configuration.css';

// Funzione per calcolare le date di pagamento (stessa logica di QuoteStep7Summary)
const calculatePaymentSchedule = (
  serviceTotal: number,
  paymentOption: any,
  startDate: Date = new Date()
): PaymentSchedule[] => {
  const schedule: PaymentSchedule[] = [];
  
  if (!paymentOption) {
    schedule.push({
      date: startDate.toISOString().split('T')[0],
      amount: serviceTotal,
      commission: 0,
      description: 'Pagamento Unico',
    });
    return schedule;
  }

  const today = new Date(startDate);
  
  switch (paymentOption.type) {
    case 'tantum':
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal,
        commission: 0,
        description: 'Pagamento Unico',
      });
      break;
      
    case 'installments':
      let installments = paymentOption.installments;
      
      // Se installments non è definito o è <= 1, usa un default di 2
      if (!installments || installments <= 1) {
        console.warn('calculatePaymentSchedule (Step2) - installments non valido, uso default 2:', installments);
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
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal * 0.3,
        commission: 0,
        description: 'Acconto 30%',
      });
      const midDate = new Date(today);
      midDate.setMonth(midDate.getMonth() + 1);
      schedule.push({
        date: midDate.toISOString().split('T')[0],
        amount: serviceTotal * 0.4,
        commission: 0,
        description: 'Pagamento 40%',
      });
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 2);
      schedule.push({
        date: endDate.toISOString().split('T')[0],
        amount: serviceTotal * 0.3,
        commission: 0,
        description: 'Saldo 30%',
      });
      break;
      
    case '30_60_days':
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal * 0.3,
        commission: 0,
        description: 'Acconto 30%',
      });
      const laterDate = new Date(today);
      laterDate.setDate(laterDate.getDate() + 60);
      schedule.push({
        date: laterDate.toISOString().split('T')[0],
        amount: serviceTotal * 0.7,
        commission: 0,
        description: 'Saldo 70% (60 giorni)',
      });
      break;
      
    case 'custom':
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
      schedule.push({
        date: today.toISOString().split('T')[0],
        amount: serviceTotal,
        commission: 0,
        description: 'Pagamento Unico',
      });
  }
  
  return schedule;
};

interface QuoteStep2ConfigurationProps {
  selectedServices: SelectedService[];
  onUpdateService: (index: number, updates: Partial<SelectedService>) => void;
}

// Helper per ottenere label durata
const getDurationLabel = (duration: string, durationMonths?: number): string => {
  const labels: Record<string, string> = {
    monthly: 'Mensile',
    quarterly: 'Trimestrale',
    semiannual: 'Semestrale',
    annual: 'Annuale',
    custom: durationMonths ? `Personalizzata (${durationMonths} mesi)` : 'Personalizzata',
  };
  return labels[duration] || duration;
};

const QuoteStep2Configuration: React.FC<QuoteStep2ConfigurationProps> = ({
  selectedServices,
  onUpdateService,
}) => {
  // Auto-selezione rinnovo obbligatorio se c'è solo 1 opzione
  useEffect(() => {
    selectedServices.forEach((service, index) => {
      const item = service.price_list_item;
      const renewalType = item.renewal_type;
      const renewalOptions = item.renewal_options || [];
      const activeRenewals = renewalOptions.filter(r => r.is_active !== false);
      
      // Se è obbligatorio e c'è solo 1 opzione attiva, selezionala automaticamente
      if (renewalType === 'obbligatorio' && activeRenewals.length === 1) {
        // Verifica se non è già selezionata
        if (!service.selected_renewal || service.selected_renewal.id !== activeRenewals[0].id) {
          onUpdateService(index, { selected_renewal: activeRenewals[0] });
        }
      }
      
      // Se è multi-rinnovo, seleziona tutte le opzioni attive di default
      if (renewalType === 'multi' && activeRenewals.length > 0) {
        // Verifica se non sono già tutte selezionate
        const currentRenewals = service.selected_renewals || [];
        const allSelected = activeRenewals.every(r => 
          currentRenewals.some(cr => cr.id === r.id)
        );
        
        if (!allSelected || currentRenewals.length !== activeRenewals.length) {
          onUpdateService(index, { selected_renewals: [...activeRenewals] });
        }
      }
    });
  }, [selectedServices, onUpdateService]);

  if (selectedServices.length === 0) {
    return (
      <div className="quote-step-content">
        <div className="empty-state">
          <p>Nessun servizio selezionato. Torna allo step precedente per selezionare i servizi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-step-content">
      <div className="configuration-list-minimal">
        {selectedServices.map((service, index) => {
          const item = service.price_list_item;
          const serviceTotal = service.total * service.quantity;
          
          // Normalizza i tipi per il confronto
          const currentType = service.payment_option?.type === 'rate' ? 'installments' : service.payment_option?.type;
          const isInstallments = currentType === 'installments';
          const numInstallments = service.payment_option?.installments || 2;
          const installmentAmount = isInstallments ? serviceTotal / numInstallments : 0;
          
          // Mappa le opzioni di pagamento disponibili
          const paymentOptions = item.payment_options || [];
          
          // Helper per ottenere il label dell'opzione
          const getPaymentLabel = (option: PaymentOption): string => {
            if (option.type === 'tantum') return 'Unico';
            if (option.type === 'split_30_40_30') return '30/40/30';
            if (option.type === 'installments' || option.type === 'rate') return 'Rate';
            return option.label || 'Altro';
          };
          
          return (
            <div key={index} className="config-card-minimal">
              <div className="config-card-header">
                <h3 className="config-service-name">{item.name}</h3>
                <span className="config-service-price">
                  € {serviceTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Separator */}
              <div className="config-card-separator"></div>

              {/* Radio Button List per Metodo di Pagamento */}
              {paymentOptions.length > 0 && (
                <div className="payment-method-section">
                  <label className="payment-method-label">PIANO DI PAGAMENTO</label>
                  <div className="payment-options-radio-list">
                    {paymentOptions.map((option, optIndex) => {
                      const optionType = option.type === 'rate' ? 'installments' : option.type;
                      const isSelected = currentType === optionType || 
                                        (option.type === 'rate' && currentType === 'installments');
                      
                      // Calcola il label e la descrizione
                      let optionLabel = getPaymentLabel(option);
                      let optionDescription = '';
                      
                      if (option.type === 'tantum') {
                        optionDescription = 'Pagamento unico';
                      } else if (option.type === 'split_30_40_30') {
                        optionDescription = 'Pagamento 30/40/30';
                      } else if (option.type === 'installments' || option.type === 'rate') {
                        const installments = option.installments || service.payment_option?.installments || 2;
                        optionDescription = `${installments} rate`;
                      }
                      
                      return (
                        <div
                          key={optIndex}
                          className={`payment-option-radio-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                              const normalizedType = option.type === 'rate' ? 'installments' : option.type;
                              const newOption: PaymentOption = { 
                                type: normalizedType,
                                label: option.label,
                              };
                              
                              if (option.installments !== undefined) {
                                newOption.installments = option.installments;
                              }
                              if (option.percentages !== undefined) {
                                newOption.percentages = [...option.percentages];
                              }
                              if (option.days !== undefined) {
                                newOption.days = option.days;
                              }
                              
                              if (normalizedType === 'installments' || option.type === 'rate') {
                                const defaultInstallments = Math.min(item.max_installments || 6, 6);
                                newOption.installments = newOption.installments || 
                                                         service.payment_option?.installments || 
                                                         defaultInstallments;
                                
                                if (!newOption.installments || newOption.installments < 2) {
                                  newOption.installments = 2;
                                }
                            }
                            
                              const newSchedule = calculatePaymentSchedule(serviceTotal, newOption);
                              onUpdateService(index, { 
                                payment_option: newOption,
                                payment_schedule: newSchedule,
                              });
                          }}
                        >
                          <div className="payment-option-radio-content">
                            <div className="payment-option-radio-info">
                              <div className="payment-option-radio-label">{optionLabel}</div>
                              {optionDescription && (
                                <div className="payment-option-radio-description">{optionDescription}</div>
                              )}
                            </div>
                            <div className={`payment-option-radio-button ${isSelected ? 'checked' : ''}`}>
                              {isSelected && <div className="payment-option-radio-dot"></div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Payment Breakdown for 30/40/30 */}
                  {currentType === 'split_30_40_30' && service.payment_schedule && service.payment_schedule.length > 0 && (
                    <div className="payment-breakdown">
                      {service.payment_schedule.map((payment, payIndex) => {
                        let label = payment.description;
                        if (payment.description === 'Acconto 30%') label = 'Acconto 30%';
                        else if (payment.description === 'Pagamento 40%') label = 'Avanzamento 40%';
                        else if (payment.description === 'Saldo 30%') label = 'Saldo 30%';
                    
                    return (
                          <div key={payIndex} className="payment-breakdown-item">
                            <span className="payment-breakdown-label">{label}</span>
                            <span className="payment-breakdown-amount">
                              € {payment.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Stepper per Numero Rate */}
                  {isInstallments && (
                    <div className="installments-stepper-section">
                      <div className="stepper-container">
                        <label className="stepper-label">Numero di Rate</label>
                        <div className="stepper-control">
                          <button
                            type="button"
                            className="stepper-button"
                            onClick={() => {
                              const newNum = Math.max(2, numInstallments - 1);
                              if (!service.payment_option) return;
                              const updatedOption: PaymentOption = {
                                ...service.payment_option,
                                installments: newNum,
                              };
                              const newSchedule = calculatePaymentSchedule(serviceTotal, updatedOption);
                              onUpdateService(index, {
                                payment_option: updatedOption,
                                payment_schedule: newSchedule,
                              });
                            }}
                            disabled={numInstallments <= 2}
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            min="2"
                            max={item.max_installments || 12}
                            value={numInstallments}
                            onChange={(e) => {
                              const newNum = Math.max(2, Math.min(parseInt(e.target.value) || 2, item.max_installments || 12));
                              if (!service.payment_option) return;
                              const updatedOption: PaymentOption = {
                                ...service.payment_option,
                                installments: newNum,
                              };
                              const newSchedule = calculatePaymentSchedule(serviceTotal, updatedOption);
                              onUpdateService(index, {
                                payment_option: updatedOption,
                                payment_schedule: newSchedule,
                              });
                            }}
                            className="stepper-input"
                          />
                          <button
                            type="button"
                            className="stepper-button"
                            onClick={() => {
                              const maxInstallments = item.max_installments || 12;
                              const newNum = Math.min(maxInstallments, numInstallments + 1);
                              if (!service.payment_option) return;
                              const updatedOption: PaymentOption = {
                                ...service.payment_option,
                                installments: newNum,
                              };
                              const newSchedule = calculatePaymentSchedule(serviceTotal, updatedOption);
                              onUpdateService(index, {
                                payment_option: updatedOption,
                                payment_schedule: newSchedule,
                              });
                            }}
                            disabled={numInstallments >= (item.max_installments || 12)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="installment-amount-display">
                            <span className="installment-amount-label">Importo per rata:</span>
                            <span className="installment-amount-value">
                          € {installmentAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mese
                            </span>
                          </div>
                      {item.min_installment_amount && installmentAmount < item.min_installment_amount && (
                        <span className="installment-warning">
                            Importo minimo per rata: € {item.min_installment_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                  )}
                </div>
              )}

              {/* Opzioni di Rinnovo - Mantenute ma semplificate */}
              {(() => {
                const renewalType = item.renewal_type;
                const renewalOptions = item.renewal_options || [];
                const activeRenewals = renewalOptions.filter(r => r.is_active !== false);
                
                if (activeRenewals.length === 0) {
                  return null;
                }
                
                // Rinnovo Obbligatorio con 1 sola opzione: mostra come read-only
                if (renewalType === 'obbligatorio' && activeRenewals.length === 1) {
                  const renewal = activeRenewals[0];
                  return (
                    <div className="renewal-section-minimal">
                      <div className="renewal-display-minimal">
                        <div className="renewal-label-minimal">
                          <RefreshCw size={16} />
                        <span>Rinnovo Obbligatorio</span>
                      </div>
                        <div className="renewal-info-minimal">
                          <span>{renewal.description || getDurationLabel(renewal.duration, renewal.duration_months)}</span>
                          <span className="renewal-price-minimal">
                            € {renewal.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })} / {getDurationLabel(renewal.duration, renewal.duration_months)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Rinnovo Obbligatorio con più opzioni: select obbligatorio
                if (renewalType === 'obbligatorio' && activeRenewals.length > 1) {
                  return (
                    <div className="renewal-section-minimal">
                      <label className="renewal-label-minimal">
                        <RefreshCw size={16} />
                        <span>Rinnovo Obbligatorio *</span>
                      </label>
                      <select
                        className="renewal-select-minimal"
                        value={service.selected_renewal?.id || ''}
                        onChange={(e) => {
                          const renewal = activeRenewals.find(r => r.id === e.target.value);
                          onUpdateService(index, { selected_renewal: renewal });
                        }}
                        required
                      >
                        <option value="">Seleziona un rinnovo...</option>
                        {activeRenewals.map((renewal) => (
                          <option key={renewal.id} value={renewal.id}>
                            {renewal.description || getDurationLabel(renewal.duration, renewal.duration_months)} - € {renewal.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                
                // Multi-Rinnovo: checkbox multiple (semplificato)
                if (renewalType === 'multi') {
                  const selectedRenewals = service.selected_renewals || [];
                  
                  return (
                    <div className="renewal-section-minimal">
                      <div className="renewal-label-minimal">
                        <RefreshCw size={16} />
                        <span>Multi-Rinnovo</span>
                      </div>
                      <div className="renewal-info-box">
                        <div className="renewal-info-icon">ℹ️</div>
                        <div className="renewal-info-content">
                          <div className="renewal-info-title">Come funziona il Multi-Rinnovo</div>
                          <div className="renewal-info-text">
                            Il cliente potrà scegliere di mese in mese quale formula applicare tra le opzioni selezionate.
                          </div>
                          <div className="renewal-info-note">
                            <strong>Nota sulle commissioni:</strong> Le commissioni vengono calcolate solo sul servizio venduto (anche se pagato a rate o con altri metodi di pagamento), esclusi eventuali rinnovi. I rinnovi non generano commissioni.
                          </div>
                        </div>
                      </div>
                      <div className="renewal-multi-list-minimal">
                        {activeRenewals.map((renewal) => {
                          const isSelected = selectedRenewals.some(r => r.id === renewal.id);
                          return (
                            <label
                              key={renewal.id}
                              className={`renewal-multi-checkbox-minimal ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  let newRenewals: RenewalOption[];
                                  if (e.target.checked) {
                                    newRenewals = [...selectedRenewals, renewal];
                                  } else {
                                    newRenewals = selectedRenewals.filter(r => r.id !== renewal.id);
                                  }
                                  onUpdateService(index, { selected_renewals: newRenewals });
                                }}
                              />
                              <span>{renewal.description || getDurationLabel(renewal.duration, renewal.duration_months)}</span>
                              <span className="renewal-price-minimal">
                                € {renewal.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Rinnovo Facoltativo
                return (
                  <div className="renewal-section-minimal">
                    <label className="renewal-label-minimal">
                      <RefreshCw size={16} />
                      <span>Rinnovo (Opzionale)</span>
                    </label>
                  <select
                      className="renewal-select-minimal"
                    value={service.selected_renewal?.id || ''}
                    onChange={(e) => {
                        const renewal = activeRenewals.find(r => r.id === e.target.value);
                      onUpdateService(index, { selected_renewal: renewal });
                    }}
                  >
                    <option value="">Nessun rinnovo</option>
                      {activeRenewals.map((renewal) => (
                        <option key={renewal.id} value={renewal.id}>
                          {renewal.description || getDurationLabel(renewal.duration, renewal.duration_months)} - € {renewal.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                  </select>
                </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuoteStep2Configuration;

