import React, { useState, useEffect } from 'react';
import { Search, DollarSign, User, CheckCircle, Clock, TrendingUp, FileText } from 'lucide-react';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { SellerCommissionSummary, SellerCommission } from '../../types/sellerCommissions';
import './SegreteriaSellerCommissionsPage.css';

interface CollectModalData {
  commission: SellerCommission | null;
  receipt_link: string;
  collected_at: string;
  notes: string;
}

const SegreteriaSellerCommissionsPage: React.FC = () => {
  const [sellersSummary, setSellersSummary] = useState<SellerCommissionSummary[]>([]);
  const [commissions, setCommissions] = useState<SellerCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending_collection');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectModalData, setCollectModalData] = useState<CollectModalData>({
    commission: null,
    receipt_link: '',
    collected_at: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadSellersSummary();
  }, []);

  useEffect(() => {
    if (selectedSellerId) {
      loadCommissions();
    } else {
      setCommissions([]);
    }
  }, [selectedSellerId, statusFilter]);

  const loadSellersSummary = async () => {
    try {
      setLoading(true);
      const response = await sellerCommissionsApi.getSellersSummary();
      console.log('Response getSellersSummary:', response);
      setSellersSummary(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento riepilogo venditori:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    if (!selectedSellerId) return;
    
    try {
      const response = await sellerCommissionsApi.getAllForSecreteria({
        seller_id: selectedSellerId,
        status: statusFilter as any,
        per_page: 100
      });
      setCommissions(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento commissioni:', error);
    }
  };

  const handleCollect = (commission: SellerCommission) => {
    setCollectModalData({
      commission,
      receipt_link: '',
      collected_at: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowCollectModal(true);
  };

  const handleCollectSubmit = async () => {
    if (!collectModalData.commission || !collectModalData.receipt_link || !collectModalData.collected_at) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      await sellerCommissionsApi.collectCommission(collectModalData.commission.id, {
        receipt_link: collectModalData.receipt_link,
        collected_at: collectModalData.collected_at,
        notes: collectModalData.notes || undefined
      });
      alert('Commissione saldata con successo!');
      setShowCollectModal(false);
      loadSellersSummary();
      if (selectedSellerId) {
        loadCommissions();
      }
    } catch (error: any) {
      console.error('Errore nel saldare commissione:', error);
      alert(error.response?.data?.message || 'Errore nel saldare la commissione');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const filteredSellers = sellersSummary.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.seller?.user?.name.toLowerCase().includes(searchLower) ||
      item.seller?.user?.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading && !selectedSellerId) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="segreteria-seller-commissions-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Commissioni Venditori</h1>
          <p className="venditori-page-subtitle">Gestisci le commissioni da saldare ai venditori</p>
        </div>
      </div>

      <div className="commissions-layout">
        {/* Lista Venditori */}
        <div className="venditori-content-card">
          <div className="venditori-actions-bar">
            <div className="venditori-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="venditori-search-input"
                placeholder="Cerca venditore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredSellers.length === 0 ? (
            <div className="venditori-empty-state">
              <User size={64} />
              <h3>Nessun venditore trovato</h3>
            </div>
          ) : (
            <div className="sellers-list">
              {filteredSellers.map((item) => {
                const seller = item.seller;
                const isSelected = selectedSellerId === seller?.id;
                
                return (
                  <div
                    key={seller?.id}
                    className={`seller-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSellerId(seller?.id || null)}
                  >
                    <div className="seller-item-main">
                      <div className="seller-avatar">
                        {seller?.user?.name.charAt(0).toUpperCase() || 'V'}
                      </div>
                      <div className="seller-info">
                        <h4 className="seller-name">{seller?.user?.name || 'Venditore'}</h4>
                        <p className="seller-email">{seller?.user?.email || ''}</p>
                      </div>
                    </div>
                    <div className="seller-commissions-summary">
                      <div className="summary-item">
                        <Clock size={14} />
                        <span>{formatCurrency(item.pending_amount)}</span>
                      </div>
                      <div className="summary-item highlight">
                        <TrendingUp size={14} />
                        <span>{formatCurrency(item.pending_collection_amount)}</span>
                      </div>
                      <div className="summary-item">
                        <CheckCircle size={14} />
                        <span>{formatCurrency(item.collected_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista Commissioni */}
        {selectedSellerId && (
          <div className="venditori-content-card">
            <div className="section-header">
              <h2 className="section-title">Commissioni da Saldare</h2>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pending_collection">In Attesa di Riscossione</option>
                <option value="pending">In Attesa</option>
                <option value="collected">Riscosse</option>
                <option value="all">Tutte</option>
              </select>
            </div>

            {commissions.length === 0 ? (
              <div className="venditori-empty-state">
                <DollarSign size={48} />
                <p>Nessuna commissione trovata</p>
              </div>
            ) : (
              <div className="commissions-table-wrapper">
                <table className="venditori-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Contratto</th>
                      <th>Cliente</th>
                      <th>Fattura</th>
                      <th>Importo</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => (
                      <tr key={commission.id}>
                        <td>#{commission.id}</td>
                        <td>{commission.contract?.contract_number || '-'}</td>
                        <td>{commission.contract?.client?.company_name || '-'}</td>
                        <td>
                          {commission.invoice ? (
                            <span className="invoice-number">{commission.invoice.invoice_number}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className="amount-value">{formatCurrency(commission.amount)}</span>
                        </td>
                        <td>
                          <span className={`status-badge status-${commission.status}`}>
                            {commission.status === 'pending' && 'In Attesa'}
                            {commission.status === 'pending_collection' && 'Da Riscuotere'}
                            {commission.status === 'collected' && 'Riscossa'}
                          </span>
                        </td>
                        <td>
                          {commission.status === 'pending_collection' && (
                            <button
                              className="btn-primary btn-small"
                              onClick={() => handleCollect(commission)}
                            >
                              Saldare
                            </button>
                          )}
                          {commission.status === 'collected' && commission.receipt_link && (
                            <a
                              href={commission.receipt_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-link"
                            >
                              <FileText size={14} />
                              Ricevuta
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Salda Commissione */}
      {showCollectModal && collectModalData.commission && (
        <div className="modal-overlay" onClick={() => setShowCollectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Saldare Commissione</h2>
              <button className="btn-close" onClick={() => setShowCollectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Importo Commissione</label>
                <input
                  type="text"
                  value={formatCurrency(collectModalData.commission!.amount)}
                  disabled
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Link Ricevuta Pagamento *</label>
                <input
                  type="text"
                  value={collectModalData.receipt_link}
                  onChange={(e) => setCollectModalData({ ...collectModalData, receipt_link: e.target.value })}
                  placeholder="https://..."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Data Pagamento *</label>
                <input
                  type="date"
                  value={collectModalData.collected_at}
                  onChange={(e) => setCollectModalData({ ...collectModalData, collected_at: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Note</label>
                <textarea
                  value={collectModalData.notes}
                  onChange={(e) => setCollectModalData({ ...collectModalData, notes: e.target.value })}
                  placeholder="Note opzionali..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCollectModal(false)}>
                Annulla
              </button>
              <button className="btn-primary" onClick={handleCollectSubmit}>
                Conferma Saldo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegreteriaSellerCommissionsPage;
