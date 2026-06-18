import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import type { Invoice } from '../api/invoices';
import './InvoiceSettleModal.css';

interface InvoiceSettleModalProps {
  invoice: Invoice;
  onClose: () => void;
}

const InvoiceSettleModal: React.FC<InvoiceSettleModalProps> = ({ invoice, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!receiptLink.trim()) {
      setError('Il link della ricevuta è obbligatorio');
      return;
    }

    try {
      setLoading(true);
      await invoicesApi.settle(invoice.id, {
        receipt_link: receiptLink,
        paid_at: paidAt,
      });
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Errore nella saldatura della fattura');
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
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="modal-invoice-settle"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
      >
        <div className="modal-header">
          <h2>Segna come Saldato</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Invoice Info */}
          <div className="form-section">
            <h3 className="form-section-title">Dettagli Fattura</h3>
            <div className="invoice-info-box">
              <div className="info-row">
                <span className="info-label">Numero Fattura:</span>
                <span className="info-value">{invoice.invoice_number}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Cliente:</span>
                <span className="info-value">{invoice.client?.company_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Importo:</span>
                <span className="info-value">{formatCurrency(invoice.total_cocchi)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Bollo:</span>
                <span className="info-value">{formatCurrency(invoice.bollo_amount || 2.00)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="form-section">
            <h3 className="form-section-title">Dettagli Pagamento</h3>
            <div className="form-group">
              <label>Link Ricevuta di Pagamento *</label>
              <input
                type="url"
                value={receiptLink}
                onChange={(e) => setReceiptLink(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="form-group">
              <label>Data Pagamento *</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reserve Allocations Preview */}
          {invoice.reserve_allocations && invoice.reserve_allocations.length > 0 && (
            <div className="form-section">
              <h3 className="form-section-title">Distribuzione Riserve</h3>
              <div className="reserve-preview">
                {invoice.reserve_allocations.map((allocation) => (
                  <div key={allocation.id} className="reserve-preview-item">
                    <span className="reserve-name">{allocation.serbatoio?.name}</span>
                    <span className="reserve-amount">{formatCurrency(allocation.amount)}</span>
                    {allocation.percentage && (
                      <span className="reserve-percentage">({allocation.percentage.toFixed(1)}%)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Segna come Saldato'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default InvoiceSettleModal;

