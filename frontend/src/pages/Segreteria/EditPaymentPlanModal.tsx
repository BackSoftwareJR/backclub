import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { paymentPlansApi } from '../../api/paymentPlans';
import type { PaymentPlan, PaymentPlanInstallment } from '../../api/paymentPlans';
import './EditPaymentPlanModal.css';

interface EditPaymentPlanModalProps {
  plan: PaymentPlan;
  onClose: () => void;
  onSave: () => void;
}

const EditPaymentPlanModal: React.FC<EditPaymentPlanModalProps> = ({ plan, onClose, onSave }) => {
  const [installments, setInstallments] = useState<PaymentPlanInstallment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan.installments) {
      setInstallments([...plan.installments]);
    }
  }, [plan]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toISOString().split('T')[0];
  };

  const handleUpdateInstallment = (index: number, field: string, value: any) => {
    const updated = [...installments];
    const installment = { ...updated[index] };
    
    if (field === 'due_date') {
      installment.due_date = value;
    } else if (field === 'amount') {
      const numValue = parseFloat(value) || 0;
      installment.amount = numValue;
      if (!installment.original_amount) {
        installment.original_amount = numValue;
      }
    } else if (field === 'original_amount') {
      const numValue = parseFloat(value) || 0;
      installment.original_amount = numValue;
      // Ricalcola amount se c'è uno sconto
      if (installment.discount_amount) {
        installment.amount = numValue - (installment.discount_amount || 0);
      }
    } else if (field === 'discount_amount') {
      const numValue = parseFloat(value) || 0;
      installment.discount_amount = numValue;
      if (installment.original_amount) {
        installment.amount = installment.original_amount - numValue;
      }
    } else if (field === 'discount_reason') {
      installment.discount_reason = value;
    } else if (field === 'description') {
      installment.description = value;
    }
    
    updated[index] = installment;
    setInstallments(updated);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const installmentsToSave = installments.map(inst => ({
        id: inst.id,
        due_date: inst.due_date,
        amount: inst.amount,
        original_amount: inst.original_amount || inst.amount,
        discount_amount: inst.discount_amount || 0,
        discount_reason: inst.discount_reason || undefined,
        description: inst.description || undefined,
      }));

      await paymentPlansApi.updateInstallments(plan.id, installmentsToSave);
      alert('Rate aggiornate con successo!');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert(error.response?.data?.message || 'Errore nel salvataggio delle rate');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInstallment = (index: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa rata?')) {
      return;
    }
    const updated = installments.filter((_, i) => i !== index);
    setInstallments(updated);
  };

  const handleAddInstallment = () => {
    const lastInstallment = installments[installments.length - 1];
    const newDate = lastInstallment 
      ? new Date(new Date(lastInstallment.due_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date();
    
    const newInstallment: PaymentPlanInstallment = {
      id: 0,
      payment_plan_id: plan.id,
      installment_number: installments.length + 1,
      due_date: newDate.toISOString().split('T')[0],
      amount: 0,
      original_amount: 0,
      discount_amount: 0,
      status: 'pending',
      payment_type: 'installment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setInstallments([...installments, newInstallment]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-payment-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifica Piano di Pagamento</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="plan-info-header">
            <div className="plan-info-item">
              <span className="info-label">Contratto:</span>
              <span className="info-value">{plan.contract?.contract_number || '-'}</span>
            </div>
            <div className="plan-info-item">
              <span className="info-label">Cliente:</span>
              <span className="info-value">{plan.client?.company_name || '-'}</span>
            </div>
            <div className="plan-info-item">
              <span className="info-label">Totale:</span>
              <span className="info-value">{formatCurrency(plan.total_amount)}</span>
            </div>
          </div>

          <div className="installments-table-container">
            <div className="table-header">
              <h3>Rate</h3>
              <button className="btn-add-installment" onClick={handleAddInstallment}>
                <Plus size={16} />
                Aggiungi Rata
              </button>
            </div>

            <table className="installments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data Scadenza</th>
                  <th>Importo Originale</th>
                  <th>Sconto</th>
                  <th>Motivazione Sconto</th>
                  <th>Importo Finale</th>
                  <th>Descrizione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment, index) => (
                  <tr key={installment.id || index}>
                    <td>{installment.installment_number}</td>
                    <td>
                      <input
                        type="date"
                        value={formatDate(installment.due_date)}
                        onChange={(e) => handleUpdateInstallment(index, 'due_date', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={installment.original_amount || installment.amount}
                        onChange={(e) => handleUpdateInstallment(index, 'original_amount', e.target.value)}
                        className="table-input"
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={installment.discount_amount || 0}
                        onChange={(e) => handleUpdateInstallment(index, 'discount_amount', e.target.value)}
                        className="table-input"
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={installment.discount_reason || ''}
                        onChange={(e) => handleUpdateInstallment(index, 'discount_reason', e.target.value)}
                        className="table-input"
                        placeholder="Motivazione sconto..."
                      />
                    </td>
                    <td className="final-amount-cell">
                      {formatCurrency(installment.amount)}
                      {installment.discount_amount && installment.discount_amount > 0 && (
                        <span className="discount-badge">
                          -{formatCurrency(installment.discount_amount)}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={installment.description || ''}
                        onChange={(e) => handleUpdateInstallment(index, 'description', e.target.value)}
                        className="table-input"
                        placeholder="Descrizione..."
                      />
                    </td>
                    <td>
                      <button
                        className="btn-delete-installment"
                        onClick={() => handleDeleteInstallment(index)}
                        title="Elimina rata"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Annulla
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            <Save size={16} />
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPaymentPlanModal;

