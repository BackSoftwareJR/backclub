import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Search, Grid, List, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import contractsApi from '../../api/contracts';
import type { Contract } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import GuideTour from '../../components/Guide/GuideTour';
import { contrattiTourSteps, completeTourSteps } from '../../config/guideTours';
import SellerContractsMobile from './SellerContractsMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerContractsPage.css';

const SellerContractsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    loadContracts();
  }, [statusFilter, user?.seller_id]);

  const loadContracts = async () => {
    if (!user?.seller_id) return;

    const cached = sellerCache.contracts.get(user.seller_id, statusFilter) as Contract[] | null;
    if (cached) {
      setContracts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = { per_page: 50, seller_id: user.seller_id };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await contractsApi.getAll(params);
      setContracts(response.data);
      sellerCache.contracts.set(user.seller_id, statusFilter, response.data);
    } catch (error) {
      console.error('Errore nel caricamento contratti:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.title?.toLowerCase().includes(searchLower) ||
      contract.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; badgeClass: string }> = {
      draft: { label: 'Bozza', badgeClass: 'seller-badge seller-badge-draft' },
      requested: { label: 'Richiesta', badgeClass: 'seller-badge seller-badge-primary' },
      pending_signature: { label: 'In Attesa di Firma', badgeClass: 'seller-badge seller-badge-pending' },
      active: { label: 'Attivo', badgeClass: 'seller-badge seller-badge-active' },
      suspended: { label: 'Sospeso', badgeClass: 'seller-badge seller-badge-cancelled' },
      completed: { label: 'Completato', badgeClass: 'seller-badge seller-badge-active' },
      terminated: { label: 'Terminato', badgeClass: 'seller-badge seller-badge-cancelled' },
    };
    return badges[status] || { label: status, badgeClass: 'seller-badge seller-badge-secondary' };
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDownloadContract = async (contract: Contract, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!contract.contract_file) {
      alert('Contratto non ancora disponibile');
      return;
    }

    try {
      const blob = await contractsApi.downloadFile(contract.id, 'contract');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contratto_${contract.contract_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download del contratto:', error);
      alert('Errore nel download del contratto: ' + (error.response?.data?.error || error.message || 'Errore sconosciuto'));
    }
  };

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerContractsMobile />;
  }

  if (loading) {
    return (
      <div className="seller-contracts-page">
        <div className="seller-contracts-header">
          <SkeletonLoader type="page-header" className="skeleton-header-no-btn" />
        </div>
        <div className="seller-contracts-toolbar">
          <SkeletonLoader type="toolbar" />
        </div>
        <div className="seller-contracts-skeleton-list">
          <SkeletonLoader type="list" count={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="seller-contracts-page">
      <GuideTour steps={contrattiTourSteps} tourId="contratti-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      {/* Header */}
      <div className="seller-contracts-header">
        <div>
          <h1 className="seller-contracts-title">{t('contracts.title')}</h1>
        </div>
      </div>

      {/* Unified Toolbar */}
      <div className="seller-contracts-toolbar">
        <div className="seller-contracts-search">
          <Search size={18} className="seller-contracts-search-icon" />
          <input
            type="text"
            className="seller-contracts-search-input"
            placeholder={t('contracts.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="seller-contracts-filter-pill">
          <select
            className="seller-contracts-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tutti</option>
            <option value="requested">Richiesta</option>
            <option value="pending_signature">In Attesa di Firma</option>
            <option value="active">Attivo</option>
            <option value="draft">Bozza</option>
            <option value="suspended">Sospeso</option>
            <option value="completed">Completato</option>
            <option value="terminated">Terminato</option>
          </select>
        </div>
        <div className="seller-contracts-view-toggle">
          <button
            className={`seller-contracts-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vista lista"
          >
            <List size={16} />
          </button>
          <button
            className={`seller-contracts-view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
            title="Vista card"
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* List Container - Finder Style */}
      {filteredContracts.length === 0 ? (
        <div className="seller-contracts-empty-state">
          <h3>{t('contracts.no_contracts')}</h3>
          <p>{t('contracts.no_contracts_desc', 'I tuoi contratti appariranno qui')}</p>
        </div>
      ) : viewMode === 'list' ? (
        <motion.div
          className="seller-contracts-list"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {filteredContracts.map((contract, idx) => {
            const statusBadge = getStatusBadge(contract.status);
            const clientInitials = getInitials(contract.client?.company_name || 'Cliente');
            
            return (
              <motion.div
                key={contract.id}
                className="seller-contracts-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
                onMouseEnter={() => setHoveredRow(contract.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Column 1: Identity */}
                <div className="seller-contracts-col-identity">
                  <div className="seller-contracts-row-title">
                    {contract.title || 'Senza titolo'}
                  </div>
                  <div className="seller-contracts-row-number">
                    {contract.contract_number}
                  </div>
                </div>

                {/* Column 2: Client */}
                <div className="seller-contracts-col-client">
                  <div className="seller-contracts-client-avatar">
                    {clientInitials}
                  </div>
                  <span className="seller-contracts-client-name">
                    {contract.client?.company_name || '-'}
                  </span>
                </div>

                {/* Column 3: Value */}
                <div className="seller-contracts-col-value">
                  {contract.total_value 
                    ? `€ ${contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                    : '-'
                  }
                </div>

                {/* Column 4: Status */}
                <div className="seller-contracts-col-status">
                  <span className={statusBadge.badgeClass}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Column 5: Dates */}
                <div className="seller-contracts-col-dates">
                  <div className="seller-contracts-date-range">
                    {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                  </div>
                </div>

                {/* Column 6: Actions */}
                <div className="seller-contracts-col-actions">
                  <div className="seller-contracts-actions">
                    {hoveredRow === contract.id && (
                      <>
                        <button
                          className="seller-contracts-action-btn"
                          onClick={() => navigate(`/seller/contratti/${contract.id}`)}
                          title="Visualizza"
                        >
                          <Eye size={16} />
                        </button>
                        {contract.contract_file && (
                          <button
                            className="seller-contracts-action-btn"
                            onClick={(e) => handleDownloadContract(contract, e)}
                            title="Scarica PDF"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="seller-contracts-card-grid">
          {filteredContracts.map((contract) => {
            const statusBadge = getStatusBadge(contract.status);
            return (
              <div key={contract.id} className="seller-contracts-card">
                <div className="seller-contracts-card-header">
                  <div>
                    <div className="seller-contracts-card-number">{contract.contract_number}</div>
                    <div className="seller-contracts-card-title">{contract.title || 'Senza titolo'}</div>
                  </div>
                  <span className={statusBadge.badgeClass}>
                    {statusBadge.label}
                  </span>
                </div>
                <div className="seller-contracts-card-body">
                  <div className="seller-contracts-card-info">
                    <div className="seller-contracts-card-info-item">
                      <span className="seller-contracts-card-info-label">Cliente:</span>
                      <span className="seller-contracts-card-info-value">{contract.client?.company_name || '-'}</span>
                    </div>
                    {contract.total_value && (
                      <div className="seller-contracts-card-info-item">
                        <span className="seller-contracts-card-info-label">Valore:</span>
                        <span className="seller-contracts-card-info-value">
                          € {contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="seller-contracts-card-actions">
                  {contract.contract_file && (
                    <button
                      className="seller-contracts-card-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadContract(contract, e);
                      }}
                    >
                      <Download size={14} />
                      Scarica
                    </button>
                  )}
                  <button
                    className="seller-contracts-card-btn"
                    onClick={() => navigate(`/seller/contratti/${contract.id}`)}
                  >
                    Visualizza dettagli
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerContractsPage;
