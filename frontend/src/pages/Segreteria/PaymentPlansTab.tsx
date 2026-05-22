import React, { useState, useEffect } from 'react';
import { Edit, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paymentPlansApi } from '../../api/paymentPlans';
import type { PaymentPlan } from '../../api/paymentPlans';
import './PaymentPlansTab.css';

interface PendingContract {
  contract_id: number;
  contract_number: string;
  client: any;
  quote: any;
  project: any;
  total_value: number;
  payment_terms?: string;
  has_pending_plan: boolean;
}

const PaymentPlansTab: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [pendingContracts, setPendingContracts] = useState<PendingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Mostra solo piani attivi di default

  useEffect(() => {
    loadPendingContracts();
    loadPaymentPlans();
  }, [statusFilter]);

  const loadPendingContracts = async () => {
    try {
      setLoadingPending(true);
      const response = await paymentPlansApi.getPending();
      setPendingContracts(response.data?.data || []);
    } catch (error) {
      console.error('Errore nel caricamento contratti in attesa:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadPaymentPlans = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await paymentPlansApi.getAll(params);
      setPlans(response.data?.data || []);
    } catch (error) {
      console.error('Errore nel caricamento piani di pagamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentPlan = (contractId: number) => {
    navigate(`/segreteria/contratti/${contractId}?action=create_payment_plan`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      pending: { label: 'In Attesa', class: 'warning' },
      active: { label: 'Attivo', class: 'success' },
      suspended: { label: 'Sospeso', class: 'info' },
      completed: { label: 'Completato', class: 'success' },
      cancelled: { label: 'Annullato', class: 'danger' },
    };
    return badges[status] || { label: status, class: '' };
  };

  return (
    <div className="payment-plans-tab">
      {/* Sezione Contratti in Attesa */}
      {pendingContracts.length > 0 && (
        <div className="venditori-content-card" style={{ marginBottom: 'var(--spacing-4)' }}>
          <div className="payment-plans-header">
            <h2 className="payment-plans-title">
              <span style={{ color: 'var(--color-warning)' }}>⚠️</span> Piani in Attesa di Avvio
            </h2>
            <span className="pending-count-badge">{pendingContracts.length}</span>
          </div>

          {loadingPending ? (
            <div className="segreteria-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="payment-plans-list">
              {pendingContracts.map((contract) => (
                <div key={contract.contract_id} className="payment-plan-card">
                  <div className="payment-plan-header">
                    <div className="payment-plan-info">
                      <h3 className="payment-plan-title">
                        Contratto: {contract.contract_number}
                      </h3>
                      <div className="payment-plan-meta">
                        <span className="payment-plan-client">
                          {contract.client?.company_name}
                        </span>
                        {contract.project?.name && (
                          <span className="payment-plan-project">
                            • Progetto: {contract.project.name}
                          </span>
                        )}
                        {contract.quote?.quote_number && (
                          <span className="payment-plan-project">
                            • Preventivo: {contract.quote.quote_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="payment-plan-status">
                      <span className="payment-plan-badge payment-plan-badge-warning">
                        In Attesa
                      </span>
                    </div>
                  </div>

                  <div className="payment-plan-body">
                    <div className="payment-plan-stats">
                      <div className="payment-plan-stat">
                        <span className="stat-label">Valore Totale</span>
                        <span className="stat-value">{formatCurrency(contract.total_value)}</span>
                      </div>
                      {contract.payment_terms && (
                        <div className="payment-plan-stat">
                          <span className="stat-label">Condizioni Pagamento</span>
                          <span className="stat-value">{contract.payment_terms}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="payment-plan-actions">
                    <button
                      className="payment-plan-action-btn primary"
                      onClick={() => handleCreatePaymentPlan(contract.contract_id)}
                    >
                      <Plus size={16} />
                      Crea Piano di Pagamento
                    </button>
                    <button
                      className="payment-plan-action-btn"
                      onClick={() => navigate(`/segreteria/contratti/${contract.contract_id}`)}
                    >
                      <FileText size={16} />
                      Vedi Dettaglio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sezione Piani di Pagamento Esistenti */}
      <div className="venditori-content-card">
        <div className="payment-plans-header">
          <h2 className="payment-plans-title">Piani di Pagamento</h2>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tutti</option>
            <option value="pending">In Attesa</option>
            <option value="active">Attivi</option>
            <option value="suspended">Sospesi</option>
            <option value="completed">Completati</option>
            <option value="cancelled">Annullati</option>
          </select>
        </div>

        {loading ? (
          <div className="segreteria-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
        {plans.length === 0 ? (
          <div className="fatture-empty-state">
            <FileText size={48} />
            <p>Nessun piano di pagamento trovato</p>
          </div>
        ) : (
              <div className="payment-plans-grid-simple">
            {plans.map((plan) => {
              const statusBadge = getStatusBadge(plan.status);

              return (
                    <div key={plan.id} className="payment-plan-box-simple">
                      <div className="payment-plan-box-header">
                        <div className="payment-plan-box-info">
                          <h3 className="payment-plan-box-client">
                            {plan.client?.company_name || 'Cliente non specificato'}
                      </h3>
                          <p className="payment-plan-box-project">
                            {plan.project?.name || 'Progetto non specificato'}
                          </p>
                      </div>
                        <span className={`payment-plan-box-badge payment-plan-box-badge-${statusBadge.class}`}>
                        {statusBadge.label}
                        </span>
                      </div>
                      <div className="payment-plan-box-actions">
                      <button
                          className="payment-plan-box-btn primary"
                          onClick={() => navigate(`/segreteria/piani-pagamento/${plan.id}/modifica`)}
                    >
                      <Edit size={16} />
                      Modifica
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentPlansTab;

