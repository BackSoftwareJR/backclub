import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Clock, CheckCircle2, Percent, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { SellerCommissionContract } from '../../types/sellerCommissions';
import { sellerCache } from '../../utils/sellerCache';
import GuideTour from '../../components/Guide/GuideTour';
import { commissioniTourSteps, completeTourSteps } from '../../config/guideTours';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerCommissionsPage.css';

const SellerCommissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<SellerCommissionContract[]>([]);
  const [summary, setSummary] = useState<{
    commission_rate: number;
    total_pending: number;
    total_pending_collection: number;
    total_collected: number;
    total_expected?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadContracts();
  }, [user?.seller_id]);

  const loadContracts = async () => {
    if (!user?.seller_id) return;

    const cached = sellerCache.commissions.get<{ contracts: SellerCommissionContract[]; summary: typeof summary }>(user.seller_id);
    if (cached) {
      setContracts(cached.contracts);
      setSummary(cached.summary);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const response = await sellerCommissionsApi.getContracts();
      if (response.data) {
        let contractsList: SellerCommissionContract[] = [];
        let summaryData = null;
        if (response.data.data && Array.isArray(response.data.data)) {
          contractsList = response.data.data;
          summaryData = response.data.summary || null;
        } else if (Array.isArray(response.data)) {
          contractsList = response.data;
        }
        setContracts(contractsList);
        setSummary(summaryData);
        sellerCache.commissions.set(user.seller_id, { contracts: contractsList, summary: summaryData });
      }
    } catch (error) {
      console.error('Errore nel caricamento commissioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.contract.contract_number.toLowerCase().includes(searchLower) ||
      item.contract.title?.toLowerCase().includes(searchLower) ||
      item.contract.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const toggleRow = (contractId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId);
    } else {
      newExpanded.add(contractId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (item: SellerCommissionContract) => {
    if (item.total_pending_collection > 0) {
      return { label: 'Liquidabile', class: 'status-liquidabile', color: 'emerald' };
    }
    if (item.total_pending > 0 || (item.total_expected_commissions && item.total_expected_commissions > 0)) {
      return { label: 'In Maturazione', class: 'status-maturazione', color: 'gray' };
    }
    return { label: 'Completato', class: 'status-completato', color: 'gray' };
  };

  const getTotalContractAmount = (item: SellerCommissionContract) => {
    return item.total_paid + item.total_remaining;
  };

  if (loading) {
    return (
      <div className="commissions-page-fintech">
        <div className="commissions-skeleton-premium skeleton-bg" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
          <div className="skeleton-line skeleton-pulse-fill w-1/3 short" style={{ height: 12, marginBottom: 12 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 36, marginBottom: 12 }} />
          <div className="skeleton-line skeleton-pulse-fill w-2/3 short" style={{ height: 14 }} />
        </div>
        <div className="commissions-skeleton-inset">
          <SkeletonLoader type="action-row" count={3} />
        </div>
        <div className="commissions-skeleton-table">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="commissions-page-fintech">
      <GuideTour steps={commissioniTourSteps} tourId="commissioni-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      {/* Hero Card - Card Finanziaria Premium (Apple Card style) */}
      {summary && (
        <>
          <div className="commissions-premium-card">
            <span className="premium-card-label">SALDO DISPONIBILE</span>
            <div className="premium-card-amount">
              {formatCurrency(summary.total_pending_collection)}
            </div>
            <div className="premium-card-mini-stats">
              <span className="mini-stat maturate">
                Maturate {formatCurrency(summary.total_collected)}
              </span>
              <span className="mini-stat-divider" aria-hidden="true" />
              <span className="mini-stat pending">
                In Attesa {formatCurrency(summary.total_pending)}
              </span>
            </div>
          </div>

          {/* Inset Grouped List - Dettaglio tecnico */}
          <div className="commissions-inset-group">
            <div className="inset-group-item">
              <span className="inset-icon-wrap collected">
                <CheckCircle2 size={20} className="inset-icon collected" aria-hidden />
              </span>
              <span className="inset-label">Maturate</span>
              <span className="inset-value collected">{formatCurrency(summary.total_collected)}</span>
            </div>
            <div className="inset-group-item">
              <span className="inset-icon-wrap pending">
                <Clock size={20} className="inset-icon pending" aria-hidden />
              </span>
              <span className="inset-label">In Attesa</span>
              <span className="inset-value pending">{formatCurrency(summary.total_pending)}</span>
            </div>
            <div className="inset-group-item">
              <span className="inset-icon-wrap rate">
                <Percent size={20} className="inset-icon rate" aria-hidden />
              </span>
              <span className="inset-label">La tua Fee</span>
              <span className="inset-value rate">{summary.commission_rate}%</span>
            </div>
          </div>
        </>
      )}

      {/* Sezione Movimenti / Contratti */}
      <div className="commissions-movimenti-section">
        <h2 className="movimenti-section-title">Movimenti</h2>
        <div className="commissions-search-bar commissions-search-ios">
          <Search size={18} className="search-icon" aria-hidden />
          <input
            type="text"
            className="commissions-search-input"
            placeholder="Cerca contratto, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredContracts.length === 0 ? (
          <div className="commissions-empty-state">
            <Wallet size={64} className="empty-state-icon" strokeWidth={1.25} aria-hidden />
            <h3 className="empty-state-title">Nessuna commissione</h3>
            <p className="empty-state-subtitle">
              Le tue provvigioni appariranno qui appena chiuderai dei contratti.
            </p>
          </div>
        ) : (
          <ul className="commissions-movimenti-list" role="list">
            {filteredContracts.map((item) => {
              const contract = item.contract;
              const isExpanded = expandedRows.has(contract.id);
              const statusBadge = getStatusBadge(item);
              const totalAmount = getTotalContractAmount(item);
              const commissionAmount = item.total_commissions + (item.total_expected_commissions || 0);

              return (
                <li key={contract.id} className="movimenti-list-item">
                  <button
                    type="button"
                    className={`movimenti-item-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleRow(contract.id)}
                  >
                    <div className="movimenti-item-left">
                      <span className="movimenti-client-name">
                        {contract.client?.company_name || 'Cliente non specificato'}
                      </span>
                      <span className="movimenti-contract-name">
                        {contract.title || contract.contract_number}
                      </span>
                    </div>
                    <div className="movimenti-item-right">
                      <span className={`movimenti-amount ${commissionAmount > 0 ? 'positive' : ''}`}>
                        {formatCurrency(commissionAmount)}
                      </span>
                      <span
                        className={`movimenti-status-badge ${statusBadge.class}`}
                        title={statusBadge.label}
                      >
                        <span className={`movimenti-status-dot ${statusBadge.class}`} aria-hidden />
                        <span>{statusBadge.label}</span>
                      </span>
                    </div>
                    <ChevronRight size={20} className={`movimenti-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden />
                  </button>
                  {isExpanded && (
                    <div className="movimenti-item-details">
                      <div className="details-section">
                        <h4 className="details-title">Calcolo Provvigione</h4>
                        <div className="details-calculation">
                          <span className="calc-text">
                            Totale € {totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="calc-operator">×</span>
                          <span className="calc-text">{summary?.commission_rate || 0}%</span>
                          <span className="calc-operator">=</span>
                          <span className="calc-result">
                            € {(totalAmount * (summary?.commission_rate || 0) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="details-section">
                        <h4 className="details-title">Timeline Pagamenti</h4>
                        <div className="details-timeline">
                          <div className="timeline-item">
                            <span className="timeline-label">Riscosse:</span>
                            <span className="timeline-value collected">{formatCurrency(item.total_collected)}</span>
                          </div>
                          <div className="timeline-item">
                            <span className="timeline-label">Da Riscuotere:</span>
                            <span className="timeline-value liquidabile">{formatCurrency(item.total_pending_collection)}</span>
                          </div>
                          <div className="timeline-item">
                            <span className="timeline-label">In Attesa:</span>
                            <span className="timeline-value pending">{formatCurrency(item.total_pending)}</span>
                          </div>
                          {item.total_expected_commissions && item.total_expected_commissions > 0 && (
                            <div className="timeline-item">
                              <span className="timeline-label">Previste:</span>
                              <span className="timeline-value expected">{formatCurrency(item.total_expected_commissions)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="details-actions">
                        <button
                          type="button"
                          className="btn-details"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/seller/commissioni/${contract.id}`);
                          }}
                        >
                          Vedi Dettaglio Completo
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SellerCommissionsPage;
