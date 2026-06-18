import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Clock, CheckCircle2, Percent, Wallet, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { SellerCommissionContract } from '../../types/sellerCommissions';
import { sellerCache } from '../../utils/sellerCache';
import GuideTour from '../../components/Guide/GuideTour';
import { commissioniTourSteps, completeTourSteps } from '../../config/guideTours';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerCommissionsPage.css';

const kpiContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const kpiItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const listVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const, delay: 0.28 },
  },
};

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
      maximumFractionDigits: 2,
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
      return { label: 'Liquidabile', class: 'status-liquidabile' };
    }
    if (item.total_pending > 0 || (item.total_expected_commissions && item.total_expected_commissions > 0)) {
      return { label: 'In Maturazione', class: 'status-maturazione' };
    }
    return { label: 'Completato', class: 'status-completato' };
  };

  const getTotalContractAmount = (item: SellerCommissionContract) => {
    return item.total_paid + item.total_remaining;
  };

  if (loading) {
    return (
      <div className="commissions-page-fintech">
        <div className="commissions-kpi-grid commissions-kpi-grid-skeleton">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="commissions-kpi-card seller-card commissions-kpi-skeleton" />
          ))}
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

      {/* KPI Grid — 4 cards, Apple-style, numeri in evidenza */}
      {summary && (
        <motion.div
          className="commissions-kpi-grid"
          variants={kpiContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Saldo Disponibile — hero KPI */}
          <motion.div variants={kpiItem} className="commissions-kpi-card commissions-kpi-hero seller-card">
            <span className="kpi-label">Saldo Disponibile</span>
            <div className="kpi-value kpi-value-hero">{formatCurrency(summary.total_pending_collection)}</div>
            <span className="kpi-badge kpi-badge-success">
              <ArrowUpRight size={11} aria-hidden />
              Pronto da riscuotere
            </span>
          </motion.div>

          {/* Commissioni Maturate */}
          <motion.div variants={kpiItem} className="commissions-kpi-card seller-card">
            <div className="kpi-icon-row">
              <CheckCircle2 size={16} className="kpi-icon kpi-icon-success" aria-hidden />
              <span className="kpi-label">Maturate</span>
            </div>
            <div className="kpi-value kpi-value-success">{formatCurrency(summary.total_collected)}</div>
          </motion.div>

          {/* In Attesa */}
          <motion.div variants={kpiItem} className="commissions-kpi-card seller-card">
            <div className="kpi-icon-row">
              <Clock size={16} className="kpi-icon kpi-icon-warning" aria-hidden />
              <span className="kpi-label">In Attesa</span>
            </div>
            <div className="kpi-value kpi-value-warning">{formatCurrency(summary.total_pending)}</div>
          </motion.div>

          {/* Fee */}
          <motion.div variants={kpiItem} className="commissions-kpi-card seller-card">
            <div className="kpi-icon-row">
              <Percent size={16} className="kpi-icon kpi-icon-muted" aria-hidden />
              <span className="kpi-label">La tua Fee</span>
            </div>
            <div className="kpi-value kpi-value-rate">
              {summary.commission_rate}
              <span className="kpi-value-unit">%</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Sezione Movimenti / Contratti */}
      <motion.div
        className="commissions-movimenti-section"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="commissions-movimenti-header">
          <h2 className="movimenti-section-title">Movimenti</h2>
          {summary && (
            <span className="movimenti-section-count">
              {filteredContracts.length} {filteredContracts.length === 1 ? 'contratto' : 'contratti'}
            </span>
          )}
        </div>

        <div className="commissions-search-bar commissions-search-ios">
          <Search size={18} className="search-icon" aria-hidden />
          <input
            type="text"
            className="commissions-search-input"
            placeholder="Cerca contratto, cliente…"
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
            {filteredContracts.map((item, index) => {
              const contract = item.contract;
              const isExpanded = expandedRows.has(contract.id);
              const statusBadge = getStatusBadge(item);
              const totalAmount = getTotalContractAmount(item);
              const commissionAmount = item.total_commissions + (item.total_expected_commissions || 0);

              return (
                <motion.li
                  key={contract.id}
                  className="movimenti-list-item"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.32 + index * 0.04, ease: [0.22, 1, 0.36, 1] as const }}
                >
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

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="movimenti-item-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="movimenti-item-details-inner">
                          <div className="details-section">
                            <h4 className="details-title">Calcolo Provvigione</h4>
                            <div className="details-calculation">
                              <span className="calc-text">
                                Totale €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="calc-operator">×</span>
                              <span className="calc-text">{summary?.commission_rate || 0}%</span>
                              <span className="calc-operator">=</span>
                              <span className="calc-result">
                                €{(totalAmount * (summary?.commission_rate || 0) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="details-section">
                            <h4 className="details-title">Timeline Pagamenti</h4>
                            <div className="details-timeline">
                              <div className="timeline-item">
                                <span className="timeline-label">Riscosse</span>
                                <span className="timeline-value collected">{formatCurrency(item.total_collected)}</span>
                              </div>
                              <div className="timeline-item">
                                <span className="timeline-label">Da Riscuotere</span>
                                <span className="timeline-value liquidabile">{formatCurrency(item.total_pending_collection)}</span>
                              </div>
                              <div className="timeline-item">
                                <span className="timeline-label">In Attesa</span>
                                <span className="timeline-value pending">{formatCurrency(item.total_pending)}</span>
                              </div>
                              {item.total_expected_commissions && item.total_expected_commissions > 0 && (
                                <div className="timeline-item">
                                  <span className="timeline-label">Previste</span>
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
                              <TrendingUp size={15} aria-hidden />
                              Vedi Dettaglio Completo
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
};

export default SellerCommissionsPage;
