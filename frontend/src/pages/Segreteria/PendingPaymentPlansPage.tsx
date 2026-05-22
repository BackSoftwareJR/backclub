import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, AlertCircle } from 'lucide-react';
import { paymentPlansApi } from '../../api/paymentPlans';
import './PendingPaymentPlansPage.css';

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

const PendingPaymentPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [pendingContracts, setPendingContracts] = useState<PendingContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingContracts();
  }, []);

  const loadPendingContracts = async () => {
    try {
      setLoading(true);
      const response = await paymentPlansApi.getPending();
      console.log('Contratti in attesa ricevuti:', response);
      // La risposta è già {success: true, data: Array}
      const contracts = response.data || [];
      console.log('Numero contratti in attesa:', contracts.length);
      console.log('Dettagli contratti:', contracts);
      setPendingContracts(contracts);
    } catch (error) {
      console.error('Errore nel caricamento contratti in attesa:', error);
      alert('Errore nel caricamento dei contratti in attesa. Controlla la console per i dettagli.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="pending-payment-plans-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Piani di Pagamento in Attesa</h1>
          <p className="venditori-page-subtitle">
            Contratti avviati in attesa di configurazione del piano di pagamento
          </p>
        </div>
      </div>

      <div className="venditori-content-card">
        {pendingContracts.length === 0 ? (
          <div className="fatture-empty-state">
            <FileText size={48} />
            <p>Nessun contratto in attesa di piano di pagamento</p>
          </div>
        ) : (
          <div className="pending-contracts-grid">
            {pendingContracts.map((contract) => (
              <div key={contract.contract_id} className="pending-contract-card">
                <div className="pending-contract-header">
                  <div className="pending-contract-icon">
                    <AlertCircle size={24} />
                  </div>
                  <div className="pending-contract-info">
                    <h3 className="pending-contract-project-name">
                      {contract.project?.name || 'Progetto senza nome'}
                    </h3>
                    <p className="pending-contract-client">
                      {contract.client?.company_name || 'Cliente non specificato'}
                    </p>
                  </div>
                </div>

                <div className="pending-contract-details">
                  <div className="pending-contract-detail-item">
                    <span className="detail-label">Contratto:</span>
                    <span className="detail-value">{contract.contract_number}</span>
                  </div>
                  {contract.quote?.quote_number && (
                    <div className="pending-contract-detail-item">
                      <span className="detail-label">Preventivo:</span>
                      <span className="detail-value">{contract.quote.quote_number}</span>
                    </div>
                  )}
                  <div className="pending-contract-detail-item highlight">
                    <span className="detail-label">Valore Totale:</span>
                    <span className="detail-value">{formatCurrency(contract.total_value)}</span>
                  </div>
                </div>

                <button
                  className="pending-contract-action-btn"
                  onClick={() => navigate(`/segreteria/piani-pagamento/crea/${contract.contract_id}`)}
                >
                  <Eye size={16} />
                  Visualizza Dettaglio
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingPaymentPlansPage;

