import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Minus, Plus, DollarSign } from 'lucide-react';
import type { QuoteWizardData, QuoteCalculation, PaymentSchedule } from '../../../types/quotes';
import sellersApi from '../../../api/sellers';
import type { Seller } from '../../../types/sellers';
import './QuoteStep7SummaryMobile.css';

interface QuoteStep7SummaryMobileProps {
  wizardData: QuoteWizardData;
  onUpdate: (updates: Partial<QuoteWizardData>) => void;
}

// Funzione per calcolare le date di pagamento (stessa logica del componente desktop)
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
      if (!installments || installments <= 1) {
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

const QuoteStep7SummaryMobile: React.FC<QuoteStep7SummaryMobileProps> = ({
  wizardData,
  onUpdate,
}) => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Carica dati venditore
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

  // Ricalcola payment schedule
  useEffect(() => {
    const servicesWithSchedule = wizardData.selectedServices.map((service) => {
      const serviceTotal = service.total * service.quantity;
      
      if (service.payment_option && service.payment_option.type) {
        const normalizedPaymentOption = {
          ...service.payment_option,
          type: service.payment_option.type === 'rate' ? 'installments' : service.payment_option.type,
        };
        
        const schedule = calculatePaymentSchedule(
          serviceTotal,
          normalizedPaymentOption
        );
        
        return {
          ...service,
          payment_option: normalizedPaymentOption,
          payment_schedule: schedule,
        };
      }
      
      const schedule = calculatePaymentSchedule(serviceTotal, null);
      return {
        ...service,
        payment_schedule: schedule,
      };
    });
    
    const hasChanges = servicesWithSchedule.some((service, index) => {
      const original = wizardData.selectedServices[index];
      const originalSchedule = original.payment_schedule || [];
      const newSchedule = service.payment_schedule || [];
      
      if (originalSchedule.length !== newSchedule.length) {
        return true;
      }
      
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
    wizardData.selectedServices.map(s => 
      `${s.payment_option?.type || 'none'}-${s.payment_option?.installments || 0}-${s.total * s.quantity}`
    ).join(',')
  ]);

  const calculation = useMemo<QuoteCalculation>(() => {
    const servicesSubtotal = wizardData.selectedServices.reduce((sum, service) => {
      const total = service.total * service.quantity;
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const additionalItemsSubtotal = wizardData.additionalItems.reduce((sum, item) => {
      const total = item.quantity * item.unit_price * (1 - (item.discount / 100));
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const subtotal = servicesSubtotal + additionalItemsSubtotal;
    const totalAmount = subtotal;

    const commissionRate = parseFloat(String(seller?.commission_rate || 0)) || 0;
    const allPayments: PaymentSchedule[] = [];
    
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
    
    allPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const totalCommission = allPayments.reduce((sum, payment) => sum + payment.commission, 0);

    const totalRenewals = wizardData.selectedServices.reduce((sum, service) => {
      if (service.selected_renewal) {
        return sum + (service.selected_renewal.price || 0);
      }
      if (service.selected_renewals && service.selected_renewals.length > 0) {
        return sum + service.selected_renewals.reduce((s, r) => s + (r.price || 0), 0);
      }
      return sum;
    }, 0);

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
      discount_amount: 0,
      tax_amount: 0,
      total_amount: totalAmount,
      seller_commission: totalCommission,
      seller_commission_percentage: commissionRate,
      available_margin: availableMargin,
      used_margin: usedMargin,
      payment_schedule: allPayments,
      total_renewals: totalRenewals,
    };
  }, [wizardData, seller]);

  // Listen for validation error event
  useEffect(() => {
    const handleValidationError = () => {
      if (!wizardData.title || !wizardData.title.trim()) {
        setTitleError(true);
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

  // Handle margin adjustment
  const handleMarginAdjustment = (delta: number) => {
    const updatedServices = wizardData.selectedServices.map((service) => {
      const basePrice = parseFloat(String(service.price_list_item.base_price || 0)) || 0;
      const margin = parseFloat(String(service.price_list_item.margin_percentage || 0)) || 0;
      const currentAdjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
      
      let newAdjustment = currentAdjustment + delta;
      const maxDecrease = -margin;
      newAdjustment = Math.max(maxDecrease, newAdjustment);
      
      const marginMultiplier = 1 + (margin + newAdjustment) / 100;
      const newPrice = basePrice * marginMultiplier;
      
      if (isNaN(newPrice) || newPrice <= 0) {
        return service;
      }
      
      const discountMultiplier = 1 - service.discount / 100;
      const newTotal = newPrice * service.quantity * discountMultiplier;
      
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="summary-mobile-ios">
      {/* Title and Date Section */}
      <div className="summary-mobile-header-section">
        <div className="summary-mobile-input-group">
          <label className="summary-mobile-label">
            TITOLO PREVENTIVO <span className="summary-mobile-required">*</span>
          </label>
          <input
            ref={titleInputRef}
            type="text"
            required
            className={`summary-mobile-input ${titleError ? 'summary-mobile-input-error' : ''}`}
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
            <span className="summary-mobile-error-message">
              Inserisci un titolo per proseguire
            </span>
          )}
        </div>
        <div className="summary-mobile-input-group">
          <label className="summary-mobile-label">VALIDO FINO A</label>
          <input
            type="date"
            className="summary-mobile-input"
            value={wizardData.valid_until || ''}
            onChange={(e) => onUpdate({ valid_until: e.target.value })}
          />
        </div>
      </div>

      {/* Commission Hero Card */}
      {calculation.seller_commission > 0 && (
        <div className="summary-mobile-commission-hero">
          <div className="summary-mobile-commission-icon">
            <DollarSign size={24} />
          </div>
          <div className="summary-mobile-commission-content">
            <div className="summary-mobile-commission-label">
              LA TUA PROVVIGIONE ({Number(calculation.seller_commission_percentage).toFixed(1)}%)
            </div>
            <div className="summary-mobile-commission-value">
              {formatCurrency(calculation.seller_commission)}
            </div>
            <div className="summary-mobile-commission-hint">
              Guadagno netto su questa vendita
            </div>
          </div>
        </div>
      )}

      {/* Services List - Inset Grouped */}
      <div className="summary-mobile-services-section">
        <div className="summary-mobile-section-header">SERVIZI</div>
        <div className="ios-inset-grouped-list">
          {wizardData.selectedServices.map((service, index) => {
            const total = parseFloat(String(service.total * service.quantity || 0)) || 0;
            const departmentName = service.price_list_item.department?.name || '';
            
            return (
              <div key={index} className="ios-inset-grouped-cell summary-mobile-service-item">
                <div className="summary-mobile-service-info">
                  <div className="summary-mobile-service-name">{service.price_list_item.name}</div>
                  {departmentName && (
                    <div className="summary-mobile-service-category">{departmentName}</div>
                  )}
                </div>
                <div className="summary-mobile-service-price">
                  {formatCurrency(total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discount/Margin Controls */}
      <div className="summary-mobile-controls-section">
        <div className="summary-mobile-section-header">SCONTO / MARGINE</div>
        <div className="summary-mobile-controls-card">
          <button
            type="button"
            className="summary-mobile-control-btn summary-mobile-control-btn-discount"
            onClick={() => handleMarginAdjustment(-1)}
            disabled={wizardData.selectedServices.every(service => {
              const margin = parseFloat(String(service.price_list_item.margin_percentage || 0)) || 0;
              const currentAdjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
              return currentAdjustment <= -margin;
            })}
          >
            <Minus size={20} />
            <span>Sconto</span>
          </button>
          <div className="summary-mobile-control-display">
            {(() => {
              const avgAdjustment = wizardData.selectedServices.reduce((sum, service) => {
                const adjustment = parseFloat(String(service.margin_adjustment || 0)) || 0;
                return sum + adjustment;
              }, 0) / wizardData.selectedServices.length;
              
              if (avgAdjustment < 0) {
                return <span className="summary-mobile-control-value discount">{avgAdjustment.toFixed(1)}%</span>;
              } else if (avgAdjustment > 0) {
                return <span className="summary-mobile-control-value margin">+{avgAdjustment.toFixed(1)}%</span>;
              } else {
                return <span className="summary-mobile-control-value neutral">0%</span>;
              }
            })()}
          </div>
          <button
            type="button"
            className="summary-mobile-control-btn summary-mobile-control-btn-margin"
            onClick={() => handleMarginAdjustment(1)}
          >
            <Plus size={20} />
            <span>Margine</span>
          </button>
        </div>
      </div>

      {/* Totals Section */}
      <div className="summary-mobile-totals-section">
        <div className="summary-mobile-section-header">RIEPILOGO</div>
        <div className="ios-inset-grouped-list">
          <div className="ios-inset-grouped-cell summary-mobile-total-row">
            <span className="summary-mobile-total-label">Subtotale</span>
            <span className="summary-mobile-total-value">
              {formatCurrency(calculation.subtotal)}
            </span>
          </div>
          <div className="ios-inset-grouped-cell summary-mobile-total-row-final">
            <span className="summary-mobile-total-label-final">Totale</span>
            <span className="summary-mobile-total-value-final">
              {formatCurrency(calculation.total_amount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteStep7SummaryMobile;
