import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import type { Invoice } from '../api/invoices';
import './CreditNoteModal.css';

interface CreditNoteModalProps {
  invoice: Invoice;
  onClose: () => void;
}

const CreditNoteModal: React.FC<CreditNoteModalProps> = ({ invoice, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLink, setInvoiceLink] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(invoice.total_cocchi);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invoiceLink.trim()) {
      setError('Il link della nota di credito è obbligatorio');
      return;
    }

    if (!reason.trim()) {
      setError('Il motivo è obbligatorio');
      return;
    }

    if (amount <= 0) {
      setError('L\'importo deve essere maggiore di 0');
      return;
    }

    try {
      setLoading(true);
      await invoicesApi.creditNote(invoice.id, {
        invoice_link: invoiceLink,
        issue_date: issueDate,
        amount: amount,
        reason: reason,
      });
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Errore nell\'emissione della nota di credito');
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
        className="modal-credit-note"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
      >
        <div className="modal-header">
          <h2>Emetti Nota di Credito</h2>
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
          {/* Original Invoice Info */}
          <div className="form-section">
            <h3 className="form-section-title">Fattura Originale</h3>
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
                <span className="info-label">Importo Originale:</span>
                <span className="info-value">{formatCurrency(invoice.total_cocchi)}</span>
              </div>
            </div>
          </div>

          {/* Credit Note Details */}
          <div className="form-section">
            <h3 className="form-section-title">Dettagli Nota di Credito</h3>
            <div className="form-group">
              <label>Link Nota di Credito PDF *</label>
              <input
                type="url"
                value={invoiceLink}
                onChange={(e) => setInvoiceLink(e.target.value)}
                placeholder="https://..."
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
              <label>Importo *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.total_cocchi}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
              <small className="form-hint">
                Massimo: {formatCurrency(invoice.total_cocchi)}
              </small>
            </div>
            <div className="form-group">
              <label>Motivo *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Inserisci il motivo della nota di credito..."
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Emissione...' : 'Emetti Nota di Credito'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreditNoteModal;

