import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, FileText, Search, Trash2, Copy, MoreVertical, Edit, FileCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { quotesApi } from '../../api/quotes';
import type { Quote } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import { POLICY_DRIVE_URL } from '../../data/supportData';
import GuideTour from '../../components/Guide/GuideTour';
import { preventiviTourSteps, completeTourSteps } from '../../config/guideTours';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SellerQuotesMobile from './SellerQuotesMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerQuotesPage.css';

const SellerQuotesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [expandedActions, setExpandedActions] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    loadQuotes();
  }, [statusFilter, user?.seller_id, authLoading]);

  const loadQuotes = async () => {
    if (!user) return;
    if (!user.seller_id) {
      setLoading(false);
      setQuotes([]);
      return;
    }

    const cached = sellerCache.quotes.get(user.seller_id, statusFilter) as Quote[] | null;
    if (cached) {
      setQuotes(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = { per_page: 100, seller_id: user.seller_id };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await quotesApi.getAll(params);
      const data = response.data || [];
      setQuotes(data);
      sellerCache.quotes.set(user.seller_id, statusFilter, data);
    } catch (error: any) {
      console.error('Errore nel caricamento preventivi:', error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quote_number?.toLowerCase().includes(searchLower) ||
      quote.title?.toLowerCase().includes(searchLower) ||
      quote.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (quoteId: number) => {
    if (!confirm(t('quotes.delete_confirm'))) {
      return;
    }

    try {
      await quotesApi.delete(quoteId);
      sellerCache.quotes.invalidate(user!.seller_id!);
      sellerCache.dashboard.invalidate(user!.seller_id!);
      sellerCache.detail.quote.invalidate(quoteId);
      alert(t('quotes.delete_success'));
      loadQuotes();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.has_contract) {
        const confirmMessage = 
          `${t('quotes.delete_with_contract.title')}\n\n${t('quotes.delete_with_contract.message')}`;
        
        if (confirm(confirmMessage)) {
          if (confirm(t('quotes.delete_with_contract.final_confirm'))) {
            try {
              await quotesApi.delete(quoteId, true);
              sellerCache.quotes.invalidate(user!.seller_id!);
              sellerCache.dashboard.invalidate(user!.seller_id!);
              sellerCache.detail.quote.invalidate(quoteId);
              alert(t('quotes.delete_with_contract.success'));
              loadQuotes();
            } catch (deleteError: any) {
              console.error('Errore nell\'eliminazione completa:', deleteError);
              const errorMessage = deleteError.response?.data?.error || t('quotes.delete_error');
              alert(errorMessage);
            }
          }
        }
      } else {
        console.error('Errore nell\'eliminazione del preventivo:', error);
        const errorMessage = error.response?.data?.error || t('quotes.delete_error');
        alert(errorMessage);
      }
    }
  };

  const handleDuplicate = async (quoteId: number) => {
    try {
      await quotesApi.duplicate(quoteId);
      sellerCache.quotes.invalidate(user!.seller_id!);
      sellerCache.dashboard.invalidate(user!.seller_id!);
      alert(t('quotes.copy_success'));
      loadQuotes();
    } catch (error: any) {
      console.error('Errore nella duplicazione:', error);
      const errorMessage = error.response?.data?.error || 'Errore nella duplicazione';
      alert(errorMessage);
    }
  };

  const handleRequestContract = async (quoteId: number) => {
    if (!confirm(t('quotes.request_contract_confirm'))) {
      return;
    }

    try {
      await quotesApi.requestContract(quoteId);
      sellerCache.quotes.invalidate(user!.seller_id!);
      sellerCache.dashboard.invalidate(user!.seller_id!);
      sellerCache.detail.quote.invalidate(quoteId);
      alert(t('quotes.request_contract_success'));
      loadQuotes();
    } catch (error: any) {
      console.error('Errore nella richiesta contratto:', error);
      const errorMessage = error.response?.data?.error || t('quotes.request_contract_error');
      alert(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; dot: string }> = {
      pending: { label: t('status.pending'), color: '#f59e0b', dot: '🟡' },
      approved: { label: t('status.approved'), color: '#10b981', dot: '🟢' },
      rejected: { label: t('status.rejected'), color: '#ef4444', dot: '🔴' },
      started: { label: t('status.active'), color: '#3b82f6', dot: '🔵' },
      completed: { label: t('status.active'), color: '#10b981', dot: '🟢' },
      contract_requested: { label: t('status.contract_requested'), color: '#3b82f6', dot: '🔵' },
    };
    return badges[status] || { label: t(`status.${status}`) || status, color: '#6b7280', dot: '⚪' };
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerQuotesMobile />;
  }

  if (authLoading || loading) {
    return (
      <div className="seller-quotes-page">
        <div className="seller-quotes-header">
          <SkeletonLoader type="page-header" />
        </div>
        <div className="seller-quotes-toolbar">
          <SkeletonLoader type="toolbar" />
        </div>
        <div className="seller-quotes-skeleton-list">
          <SkeletonLoader type="list" count={10} />
        </div>
      </div>
    );
  }

  if (user && !user.seller_id) {
    return (
      <div className="seller-quotes-page">
        <div className="seller-quotes-header">
          <h1 className="seller-quotes-title">{t('quotes.title')}</h1>
        </div>
        <div className="seller-quotes-empty-state">
          <FileText size={64} className="seller-quotes-empty-icon" />
            <h3>{t('quotes.account_not_configured')}</h3>
            <p>{t('quotes.account_not_configured_desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-quotes-page">
      <GuideTour steps={preventiviTourSteps} tourId="preventivi-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      {/* Header */}
      <div className="seller-quotes-header">
        <div>
          <h1 className="seller-quotes-title">{t('quotes.title')}</h1>
        </div>
        <button 
          className="seller-quotes-new-btn"
          onClick={() => navigate('/seller/preventivi/nuovo')}
        >
          <Plus size={18} />
          {t('quotes.new')}
        </button>
      </div>

      {/* Avviso GDPR – privacy policy prima del preventivo */}
      <div className="seller-quotes-gdpr-alert" role="alert">
        <ShieldAlert size={20} className="seller-quotes-gdpr-alert-icon" aria-hidden />
        <div className="seller-quotes-gdpr-alert-content">
          <strong>Importante per il GDPR:</strong> prima di inviare il preventivo il cliente deve aver firmato la privacy policy e il consenso al trattamento dei dati. Consulta{' '}
          <button
            type="button"
            className="seller-quotes-gdpr-alert-link"
            onClick={() => navigate('/seller/supporto/contrattualistica')}
          >
            Supporto → Contrattualistica
          </button>
          {' '}per i dettagli. Policy e documenti:{' '}
          <a
            href={POLICY_DRIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="seller-quotes-gdpr-alert-link seller-quotes-gdpr-alert-link-external"
          >
            Policy clienti (Google Drive)
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </div>

      {/* Unified Toolbar */}
      <div className="seller-quotes-toolbar">
        <div className="seller-quotes-search">
          <Search size={18} className="seller-quotes-search-icon" />
            <input
              type="text"
            className="seller-quotes-search-input"
              placeholder={t('quotes.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        <div className="seller-quotes-filter-pill">
          <select
            className="seller-quotes-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('quotes.status.all')}</option>
            <option value="pending">{t('quotes.status.pending')}</option>
            <option value="approved">{t('quotes.status.approved')}</option>
            <option value="rejected">{t('quotes.status.rejected')}</option>
            <option value="contract_requested">{t('status.contract_requested')}</option>
            <option value="started">{t('status.active')}</option>
            <option value="completed">{t('status.active')}</option>
          </select>
        </div>
        </div>

      {/* List Container - Finder Style */}
        {filteredQuotes.length === 0 ? (
        <div className="seller-quotes-empty-state">
          <FileText size={64} className="seller-quotes-empty-icon" />
          <h3>{t('quotes.no_quotes')}</h3>
          <p>{t('quotes.create_first')}</p>
            <button 
            className="seller-quotes-empty-btn"
              onClick={() => {
                hapticButtonPress();
                navigate('/seller/preventivi/nuovo');
              }}
            >
              <Plus size={18} />
            {t('quotes.create_first_btn')}
            </button>
          </div>
        ) : (
        <div className="seller-quotes-list">
                {filteredQuotes.map((quote) => {
                  const statusBadge = getStatusBadge(quote.status);
            const clientInitials = getInitials(quote.client?.company_name || 'Cliente');
            
                  return (
              <div
                key={quote.id}
                className="seller-quotes-row"
                onMouseEnter={() => setHoveredRow(quote.id)}
                onMouseLeave={() => {
                  setHoveredRow(null);
                  setExpandedActions(null);
                }}
              >
                {/* Column 1: Identity */}
                <div className="seller-quotes-col-identity">
                  <div className="seller-quotes-row-title">
                    {quote.title || t('quotes.no_title')}
                  </div>
                  <div className="seller-quotes-row-number">
                    {quote.quote_number || '-'}
                  </div>
                </div>

                {/* Column 2: Client */}
                <div className="seller-quotes-col-client">
                  <div className="seller-quotes-client-avatar">
                    {clientInitials}
                  </div>
                  <span className="seller-quotes-client-name">
                    {quote.client?.company_name || '-'}
                  </span>
                </div>

                {/* Column 3: Status */}
                <div className="seller-quotes-col-status">
                  <span 
                    className="seller-quotes-status-badge"
                    style={{ color: statusBadge.color }}
                  >
                    <span className="seller-quotes-status-dot">{statusBadge.dot}</span>
                          {statusBadge.label}
                        </span>
                </div>

                {/* Column 4: Date */}
                <div className="seller-quotes-col-date">
                  {formatDate(quote.created_at)}
                </div>

                {/* Column 5: Total */}
                <div className="seller-quotes-col-total">
                  € {quote.total_amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
                </div>

                {/* Column 6: Actions */}
                <div className="seller-quotes-col-actions">
                  <div className="seller-quotes-actions">
                    {hoveredRow === quote.id && (
                      <>
                          <button
                          className="seller-quotes-action-btn"
                            title={t('quotes.view')}
                            onClick={() => {
                              hapticButtonPress();
                              navigate(`/seller/preventivi/${quote.id}`);
                            }}
                          >
                            <Eye size={16} />
                          </button>
                        {!quote.contract && quote.status !== 'approved' && quote.status !== 'contract_requested' && (
                            <button
                            className="seller-quotes-action-btn"
                            onClick={() => {
                              hapticButtonPress();
                              navigate(`/seller/preventivi/${quote.id}/edit`);
                            }}
                            title={t('quotes.edit')}
                            >
                            <Edit size={16} />
                            </button>
                          )}
                          {!quote.contract && quote.status !== 'rejected' && quote.status !== 'contract_requested' && (
                            <button
                            className="seller-quotes-action-btn seller-quotes-action-btn-primary"
                              onClick={() => {
                                hapticButtonPress();
                                handleRequestContract(quote.id);
                              }}
                              title={t('quotes.request_contract')}
                            >
                              <FileCheck size={16} />
                            </button>
                          )}
                            <button
                          className="seller-quotes-action-btn"
                          onClick={() => {
                            hapticButtonPress();
                            handleDuplicate(quote.id);
                          }}
                          title={t('quotes.duplicate')}
                            >
                          <Copy size={16} />
                            </button>
                          <button
                          className="seller-quotes-action-btn seller-quotes-action-btn-danger"
                            onClick={() => {
                              hapticButtonPress();
                              handleDelete(quote.id);
                            }}
                          title={t('quotes.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                      </>
                    )}
                    {hoveredRow !== quote.id && (
                      <button
                        className="seller-quotes-action-btn seller-quotes-action-btn-more"
                        onClick={() => setExpandedActions(expandedActions === quote.id ? null : quote.id)}
                        title={t('quotes.more_actions')}
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                </div>
                        </div>
                  );
                })}
          </div>
        )}
    </div>
  );
};

export default SellerQuotesPage;
