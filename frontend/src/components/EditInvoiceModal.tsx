import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import type { Invoice } from '../api/invoices';
import './InvoiceIssueModal.css';

const BOLLO_AMOUNT = 2.00;

interface EditInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
  const [issueDate, setIssueDate] = useState((invoice.issue_date || '').toString().slice(0, 10));
  const [dueDate, setDueDate] = useState((invoice.due_date || '').toString().slice(0, 10));
  const [amount, setAmount] = useState(String(invoice.total_cocchi ?? 0));
  const [invoiceLink, setInvoiceLink] = useState(invoice.invoice_link || '');
  const [notes, setNotes] = useState(invoice.notes || '');

  useEffect(() => {
    setInvoiceNumber(invoice.invoice_number);
    setIssueDate((invoice.issue_date || '').toString().slice(0, 10));
    setDueDate((invoice.due_date || '').toString().slice(0, 10));
    setAmount(String(invoice.total_cocchi ?? 0));
    setInvoiceLink(invoice.invoice_link || '');
    setNotes(invoice.notes || '');
  }, [invoice]);

  const amountNum = parseFloat(amount) || 0;
  const amountBeforeBollo = Math.max(0, amountNum - BOLLO_AMOUNT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amountNum < BOLLO_AMOUNT) {
      setError(`L'importo deve essere almeno ${BOLLO_AMOUNT}€ (bollo)`);
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Il numero fattura è obbligatorio');
      return;
    }
    try {
      setLoading(true);
      await invoicesApi.update(invoice.id, {
        invoice_number: invoiceNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate,
        amount: amountNum,
        invoice_link: invoiceLink.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat()[0]
        : null;
      setError(firstError || data?.message || 'Errore nell\'aggiornamento della fattura');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);

  const motionOverlay = {
    className: "modal-overlay",
    onClick: onClose,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  } as const;
  const motionModal = {
    className: "modal-invoice-issue",
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    initial: { opacity: 0, scale: 0.96 as number, y: 8 as number },
    animate: { opacity: 1, scale: 1 as number, y: 0 as number },
    exit: { opacity: 0, scale: 0.96 as number, y: 8 as number },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  };

  if (invoice.status === 'paid') {
    return (
      <motion.div {...motionOverlay}>
        <motion.div {...motionModal}>
          <div className="modal-header">
            <h2>Modifica Fattura</h2>
            <button type="button" className="btn-close-modal" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <p className="modal-error">Non è possibile modificare una fattura già saldata.</p>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>Chiudi</button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionOverlay}>
      <motion.div {...motionModal}>
        <div className="modal-header">
          <h2>Modifica Fattura</h2>
          <button type="button" className="btn-close-modal" onClick={onClose}>
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
          <div className="form-section">
            <h3 className="form-section-title">Dettagli Fattura</h3>
            <div className="form-group">
              <label>Numero Fattura *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Data Emissione *</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Data Scadenza *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Importo Totale (incluso bollo) *</label>
              <input
                type="number"
                step="0.01"
                min={BOLLO_AMOUNT + 0.01}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
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
                <span className="calculation-value">{formatCurrency(amountNum)}</span>
              </div>
            </div>
            <div className="form-group">
              <label>Link Fattura PDF</label>
              <input
                type="url"
                value={invoiceLink}
                onChange={e => setInvoiceLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>Note</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditInvoiceModal;
