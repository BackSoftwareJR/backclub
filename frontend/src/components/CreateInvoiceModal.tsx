import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import { getClients } from '../api/clients';
import type { Client } from '../api/clients';
import { crmProjectsApi } from '../api/crmProjects';
import type { CrmProject } from '../api/crmProjects';
import { serbatoiApi, type Serbatoio } from '../api/serbatoi';
import './InvoiceIssueModal.css';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BOLLO_AMOUNT = 2.00;

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [serbatoi, setSerbatoi] = useState<Serbatoio[]>([]);

  const [clientId, setClientId] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [notes, setNotes] = useState('');
  const [reserveAllocations, setReserveAllocations] = useState<Array<{ serbatoio_id: number; amount: number; percentage?: number }>>([]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadProjects(Number(clientId));
    } else {
      setProjects([]);
      setProjectId('');
    }
  }, [clientId]);

  const loadInitial = async () => {
    try {
      const [clientsRes, lastNumRes, serbatoiRes] = await Promise.all([
        getClients({ active_only: true }).catch(() => []),
        invoicesApi.getLastNumber().catch(() => ({ data: { next_number: '' } })),
        serbatoiApi.getAll({ active_only: true }).then(r => r.data || []),
      ]);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setInvoiceNumber((lastNumRes as any)?.data?.next_number || '');
      setSerbatoi(Array.isArray(serbatoiRes) ? serbatoiRes : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async (cid: number) => {
    try {
      const res = await crmProjectsApi.getAll({ client_id: cid });
      setProjects(res.data || []);
    } catch {
      setProjects([]);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const amountBeforeBollo = Math.max(0, amountNum - BOLLO_AMOUNT);

  const handleAllocationChange = (serbatoioId: number, value: number) => {
    setReserveAllocations(prev => {
      const existing = prev.find(a => a.serbatoio_id === serbatoioId);
      const newAlloc = {
        serbatoio_id: serbatoioId,
        amount: value,
        percentage: amountBeforeBollo > 0 ? (value / amountBeforeBollo) * 100 : 0,
      };
      if (existing) {
        return prev.map(a => (a.serbatoio_id === serbatoioId ? newAlloc : a));
      }
      return [...prev, newAlloc];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Seleziona un cliente');
      return;
    }
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal < BOLLO_AMOUNT) {
      setError(`L'importo deve essere almeno ${BOLLO_AMOUNT}€ (bollo)`);
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Il numero fattura è obbligatorio');
      return;
    }

    const totalAllocated = reserveAllocations.reduce((s, a) => s + a.amount, 0);
    if (reserveAllocations.length > 0 && Math.abs(totalAllocated - amountBeforeBollo) > 0.01) {
      setError(`La somma delle allocazioni (${totalAllocated.toFixed(2)}€) deve essere uguale all'importo netto (${amountBeforeBollo.toFixed(2)}€)`);
      return;
    }

    try {
      setLoading(true);
      const payloadAllocations =
        reserveAllocations.length > 0
          ? reserveAllocations.map((a) => {
              const pct =
                amountBeforeBollo > 0
                  ? Math.min(100, Math.max(0, (a.amount / amountBeforeBollo) * 100))
                  : 0;
              return {
                serbatoio_id: a.serbatoio_id,
                amount: Math.round(a.amount * 100) / 100,
                percentage: Math.round(pct * 100) / 100,
              };
            })
          : undefined;
      await invoicesApi.create({
        client_id: Number(clientId),
        project_id: projectId ? Number(projectId) : undefined,
        invoice_number: invoiceNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate,
        amount: amountVal,
        invoice_link: invoiceLink.trim() || undefined,
        notes: notes.trim() || undefined,
        reserve_allocations: payloadAllocations,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat()[0]
        : null;
      setError(firstError || data?.message || 'Errore nella creazione della fattura');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-invoice-issue" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crea Fattura al volo</h2>
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
            <h3 className="form-section-title">Cliente e progetto</h3>
            <div className="form-group">
              <label>Cliente *</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Seleziona cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Progetto (opzionale)</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')}
                disabled={!clientId}
              >
                <option value="">Nessun progetto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              <label>Importo Totale (incluso bollo 2€) *</label>
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
                placeholder="Note interne (opzionale)"
              />
            </div>
          </div>

          {serbatoi.length > 0 && (
            <div className="form-section">
              <h3 className="form-section-title">Distribuzione Riserve (opzionale)</h3>
              <div className="reserve-allocations">
                {serbatoi
                  .filter(s => s.is_active && s.id !== 9)
                  .map(serbatoio => {
                    const allocation = reserveAllocations.find(a => a.serbatoio_id === serbatoio.id);
                    return (
                      <div key={serbatoio.id} className="reserve-allocation-item">
                        <div className="reserve-info">
                          <span className="reserve-name">{serbatoio.name}</span>
                        </div>
                        <div className="reserve-input-group">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={amountBeforeBollo}
                            value={allocation?.amount || 0}
                            onChange={e => handleAllocationChange(serbatoio.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                          <span className="reserve-percentage">
                            {allocation?.percentage != null ? `${allocation.percentage.toFixed(1)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {reserveAllocations.length > 0 && (
                <div className="allocation-summary">
                  <div className="summary-row">
                    <span>Totale Allocato:</span>
                    <span className={Math.abs(reserveAllocations.reduce((s, a) => s + a.amount, 0) - amountBeforeBollo) < 0.01 ? 'success' : 'error'}>
                      {formatCurrency(reserveAllocations.reduce((s, a) => s + a.amount, 0))}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Importo Netto:</span>
                    <span>{formatCurrency(amountBeforeBollo)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Fattura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
