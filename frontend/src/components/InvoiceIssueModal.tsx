import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import { serbatoiApi, type Serbatoio } from '../api/serbatoi';
import type { InvoiceToIssue } from '../api/invoices';
import './InvoiceIssueModal.css';

interface InvoiceIssueModalProps {
  toIssue: InvoiceToIssue;
  onClose: () => void;
}

const InvoiceIssueModal: React.FC<InvoiceIssueModalProps> = ({ toIssue, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serbatoi, setSerbatoi] = useState<Serbatoio[]>([]);
  
  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceLink, setInvoiceLink] = useState('');
  const [amount, setAmount] = useState(toIssue.amount);
  const [reserveAllocations, setReserveAllocations] = useState<Array<{
    serbatoio_id: number;
    amount: number;
    percentage?: number;
  }>>([]);

  const BOLLO_AMOUNT = 2.00;
  const amountBeforeBollo = amount - BOLLO_AMOUNT;

  useEffect(() => {
    loadLastInvoiceNumber();
    loadSerbatoi();
  }, []);

  useEffect(() => {
    // Calcola distribuzione automatica se ci sono serbatoi con auto-distribuzione
    if (serbatoi.length > 0 && reserveAllocations.length === 0) {
      const autoSerbatoi = serbatoi.filter(s => s.auto_distribution_enabled && s.is_active);
      if (autoSerbatoi.length > 0) {
        const totalPercentage = autoSerbatoi.reduce((sum, s) => sum + s.auto_distribution_percentage, 0);
        if (totalPercentage > 0) {
          const allocations = autoSerbatoi.map(s => ({
            serbatoio_id: s.id,
            amount: (amountBeforeBollo * s.auto_distribution_percentage) / 100,
            percentage: s.auto_distribution_percentage,
          }));
          setReserveAllocations(allocations);
        }
      }
    }
  }, [serbatoi, amountBeforeBollo]);

  const loadLastInvoiceNumber = async () => {
    try {
      const response = await invoicesApi.getLastNumber();
      setInvoiceNumber(response.data.next_number);
    } catch (error) {
      console.error('Errore nel caricamento ultimo numero:', error);
    }
  };

  const loadSerbatoi = async () => {
    try {
      const response = await serbatoiApi.getAll({ active_only: true });
      setSerbatoi(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento serbatoi:', error);
    }
  };

  const handleAllocationChange = (serbatoioId: number, value: number) => {
    setReserveAllocations(prev => {
      const existing = prev.find(a => a.serbatoio_id === serbatoioId);
      if (existing) {
        return prev.map(a => 
          a.serbatoio_id === serbatoioId 
            ? { ...a, amount: value, percentage: (value / amountBeforeBollo) * 100 }
            : a
        );
      } else {
        return [...prev, {
          serbatoio_id: serbatoioId,
          amount: value,
          percentage: (value / amountBeforeBollo) * 100,
        }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazione
    if (!invoiceNumber.trim()) {
      setError('Il numero fattura è obbligatorio');
      return;
    }

    if (amount <= BOLLO_AMOUNT) {
      setError(`L'importo deve essere maggiore di ${BOLLO_AMOUNT}€ (bollo)`);
      return;
    }

    const totalAllocated = reserveAllocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(totalAllocated - amountBeforeBollo) > 0.01) {
      setError(`La somma delle allocazioni (${totalAllocated.toFixed(2)}€) deve essere uguale all'importo netto (${amountBeforeBollo.toFixed(2)}€)`);
      return;
    }

    try {
      setLoading(true);
      const payload = reserveAllocations.map((a) => {
        const pct = amountBeforeBollo > 0
          ? Math.min(100, Math.max(0, (a.amount / amountBeforeBollo) * 100))
          : 0;
        return {
          serbatoio_id: a.serbatoio_id,
          amount: Math.round(a.amount * 100) / 100,
          percentage: Math.round(pct * 100) / 100,
        };
      });
      await invoicesApi.issue({
        installment_id: toIssue.installment_id,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        invoice_link: invoiceLink,
        amount: amount,
        reserve_allocations: payload,
      });
      onClose();
    } catch (error: any) {
      const data = error.response?.data;
      const firstError = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat()[0]
        : null;
      setError(firstError || data?.message || 'Errore nell\'emissione della fattura');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="invoice-issue-modal-overlay" onClick={onClose}>
      <div className="invoice-issue-modal" onClick={(e) => e.stopPropagation()}>
        <header className="invoice-issue-modal-header">
          <h2>Emetti Fattura</h2>
          <button type="button" className="invoice-issue-modal-close" onClick={onClose} aria-label="Chiudi">
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        {error && (
          <div className="invoice-issue-modal-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="invoice-issue-modal-form">
          <div className="invoice-issue-modal-body">
          {/* Cliente Info */}
          <div className="form-section">
            <h3 className="form-section-title">Dati Cliente</h3>
            <div className="client-info-box">
              <div className="info-row">
                <span className="info-label">Ragione Sociale:</span>
                <span className="info-value">{toIssue.client?.company_name}</span>
              </div>
              {toIssue.client?.vat_number && (
                <div className="info-row">
                  <span className="info-label">P.IVA:</span>
                  <span className="info-value">{toIssue.client.vat_number}</span>
                </div>
              )}
              {toIssue.client?.email && (
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{toIssue.client.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fattura Details */}
          <div className="form-section">
            <h3 className="form-section-title">Dettagli Fattura</h3>
            <div className="form-group">
              <label>Numero Fattura *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Data Emissione *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Link Fattura PDF</label>
              <input
                type="url"
                value={invoiceLink}
                onChange={(e) => setInvoiceLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>Importo Totale (incluso bollo) *</label>
              <input
                type="number"
                step="0.01"
                min={BOLLO_AMOUNT + 0.01}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            {/* Bollo Calculation */}
            <div className="bollo-calculation">
              <div className="calculation-row">
                <span>Importo Netto:</span>
                <span className="calculation-value">{formatCurrency(amountBeforeBollo)}</span>
              </div>
              <div className="calculation-row">
                <span>Bollo:</span>
                <span className="calculation-value">{formatCurrency(BOLLO_AMOUNT)}</span>
              </div>
              <div className="calculation-row total">
                <span>Totale:</span>
                <span className="calculation-value">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Reserve Allocations */}
          <div className="form-section">
            <h3 className="form-section-title">Distribuzione Riserve</h3>
            <div className="reserve-allocations">
              {serbatoi
                .filter(s => s.is_active && s.id !== 9) // Escludi Riserva Bollo
                .map(serbatoio => {
                  const allocation = reserveAllocations.find(a => a.serbatoio_id === serbatoio.id);
                  return (
                    <div key={serbatoio.id} className="reserve-allocation-item">
                      <div className="reserve-info">
                        <span className="reserve-name">{serbatoio.name}</span>
                        {serbatoio.auto_distribution_enabled && (
                          <span className="reserve-auto">
                            Auto: {serbatoio.auto_distribution_percentage}%
                          </span>
                        )}
                      </div>
                      <div className="reserve-input-group">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={amountBeforeBollo}
                          value={allocation?.amount || 0}
                          onChange={(e) => handleAllocationChange(serbatoio.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                        <span className="reserve-percentage">
                          {allocation?.percentage ? `${allocation.percentage.toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="allocation-summary">
              <div className="summary-row">
                <span>Totale Allocato:</span>
                <span className={Math.abs(reserveAllocations.reduce((sum, a) => sum + a.amount, 0) - amountBeforeBollo) < 0.01 ? 'success' : 'error'}>
                  {formatCurrency(reserveAllocations.reduce((sum, a) => sum + a.amount, 0))}
                </span>
              </div>
              <div className="summary-row">
                <span>Importo Netto:</span>
                <span>{formatCurrency(amountBeforeBollo)}</span>
              </div>
              <div className="summary-row">
                <span>Differenza:</span>
                <span className={Math.abs(reserveAllocations.reduce((sum, a) => sum + a.amount, 0) - amountBeforeBollo) < 0.01 ? 'success' : 'error'}>
                  {formatCurrency(reserveAllocations.reduce((sum, a) => sum + a.amount, 0) - amountBeforeBollo)}
                </span>
              </div>
            </div>
          </div>
          </div>

          <footer className="invoice-issue-modal-footer">
            <button type="button" className="invoice-issue-btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="invoice-issue-btn-primary" disabled={loading}>
              {loading ? 'Emissione...' : 'Emetti Fattura'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default InvoiceIssueModal;

