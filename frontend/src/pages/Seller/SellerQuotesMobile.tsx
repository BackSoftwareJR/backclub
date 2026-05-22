import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  HandCoins,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quotesApi } from '../../api/quotes';
import type { Quote } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import { POLICY_DRIVE_URL } from '../../data/supportData';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerQuotesMobile.css';

const SellerQuotesMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    loadQuotes();
  }, [statusFilter, user?.seller_id, authLoading]);

  const loadQuotes = async () => {
    if (!user?.seller_id) {
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

  const filteredQuotes = quotes.filter((quote) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quote_number?.toLowerCase().includes(searchLower) ||
      quote.title?.toLowerCase().includes(searchLower) ||
      quote.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusPill = (status: string) => {
    const statusMap: Record<string, { label: string; bgColor: string; color: string }> = {
      pending: {
        label: t('status.pending').toUpperCase(),
        bgColor: 'rgba(255, 214, 10, 0.15)',
        color: '#FFD60A',
      },
      approved: {
        label: t('status.approved').toUpperCase(),
        bgColor: 'rgba(48, 209, 88, 0.15)',
        color: '#30D158',
      },
      rejected: {
        label: t('status.rejected').toUpperCase(),
        bgColor: 'rgba(255, 69, 58, 0.15)',
        color: '#FF453A',
      },
      started: {
        label: t('status.active').toUpperCase(),
        bgColor: 'rgba(10, 132, 255, 0.15)',
        color: '#0A84FF',
      },
      completed: {
        label: t('status.active').toUpperCase(),
        bgColor: 'rgba(48, 209, 88, 0.15)',
        color: '#30D158',
      },
      contract_requested: {
        label: t('status.contract_requested').toUpperCase(),
        bgColor: 'rgba(10, 132, 255, 0.15)',
        color: '#0A84FF',
      },
    };
    return (
      statusMap[status] || {
        label: (t(`status.${status}`) || status).toUpperCase(),
        bgColor: 'rgba(142, 142, 147, 0.15)',
        color: '#8E8E93',
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDelete = async (quoteId: number) => {
    if (!confirm(t('quotes.delete_confirm'))) return;

    try {
      await quotesApi.delete(quoteId);
      sellerCache.quotes.invalidate(user!.seller_id!);
      sellerCache.dashboard.invalidate(user!.seller_id!);
      sellerCache.detail.quote.invalidate(quoteId);
      alert(t('quotes.delete_success'));
      loadQuotes();
    } catch (error: any) {
      console.error('Errore nell\'eliminazione:', error);
      alert(error.response?.data?.error || t('quotes.delete_error'));
    }
  };


  const activeFiltersCount = statusFilter !== 'all' ? 1 : 0;

  if (user && !user.seller_id) {
    return (
      <div className="quotes-empty-state">
        <FileText size={64} className="quotes-empty-icon" />
        <h3 className="quotes-empty-title">{t('quotes.account_not_configured')}</h3>
        <p className="quotes-empty-subtitle">
          {t('quotes.account_not_configured_desc')}
        </p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadQuotes}>
      <div className="quotes-mobile-ios">
        {/* Header - Large Title */}
        <div className="quotes-header">
          <div className="quotes-header-top">
            <h1 className="ios-large-title">{t('quotes.title')}</h1>
            <button
              onClick={() => {
                hapticButtonPress();
                navigate('/seller/preventivi/nuovo');
              }}
              className="quotes-add-button"
              aria-label={t('quotes.new')}
            >
              <Plus size={22} style={{ color: 'var(--ios-system-blue)' }} />
            </button>
          </div>
          <p className="quotes-subtitle">{filteredQuotes.length} {t('quotes.count')}</p>
        </div>

        {/* Avviso GDPR – privacy policy prima del preventivo */}
        <div className="quotes-mobile-gdpr-alert" role="alert">
          <ShieldAlert size={18} className="quotes-mobile-gdpr-alert-icon" aria-hidden />
          <div className="quotes-mobile-gdpr-alert-content">
            <strong>GDPR:</strong> il cliente deve firmare la privacy policy prima del preventivo.{' '}
            <button
              type="button"
              className="quotes-mobile-gdpr-alert-link"
              onClick={() => navigate('/seller/supporto/contrattualistica')}
            >
              Contrattualistica
            </button>
            {' · '}
            <a
              href={POLICY_DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="quotes-mobile-gdpr-alert-link"
            >
              Policy (Drive)
              <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </div>

        {/* Search Bar - iOS Style */}
        <div className="quotes-search-container">
          <div className="quotes-search-bar">
            <Search size={18} className="quotes-search-icon" />
            <input
              type="text"
              className="quotes-search-input"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setShowFilters(true)}
                className="quotes-filter-badge"
              >
                <Filter size={14} />
                <span>{activeFiltersCount}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="quotes-list-container">
            <SkeletonLoader type="card" count={5} />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="quotes-empty-state">
            <FileText size={64} className="quotes-empty-icon" />
            <h3 className="quotes-empty-title">{t('quotes.no_quotes')}</h3>
            <p className="quotes-empty-subtitle">
              {searchTerm || activeFiltersCount > 0
                ? t('quotes.try_modify_search')
                : t('quotes.create_first')}
            </p>
            {!searchTerm && activeFiltersCount === 0 && (
              <button
                onClick={() => {
                  hapticButtonPress();
                  navigate('/seller/preventivi/nuovo');
                }}
                className="ios-button-primary ios-button-full-width"
                style={{ marginTop: '24px' }}
              >
                {t('quotes.new')}
              </button>
            )}
          </div>
        ) : (
          <div className="quotes-list-container">
            {filteredQuotes.map((quote) => {
              const statusPill = getStatusPill(quote.status);

              return (
                <div key={quote.id} className="quote-card">
                  <div className="quote-card-content">
                    {/* Left Side - Info */}
                    <div className="quote-info">
                      <div className="quote-client-name">
                        {quote.client?.company_name || t('quotes.client_not_specified')}
                      </div>
                      <div className="quote-title">
                        {quote.title || t('quotes.no_title')}
                      </div>
                      <div className="quote-meta">
                        {quote.quote_number && `#${quote.quote_number}`}
                        {quote.quote_number && quote.created_at && ' • '}
                        {quote.created_at && formatDate(quote.created_at)}
                      </div>
                    </div>

                    {/* Right Side - Value & Status */}
                    <div className="quote-right">
                      <div className="quote-amount">
                        {formatCurrency(quote.total_amount || 0)}
                      </div>
                      <div
                        className="quote-status-pill"
                        style={{
                          backgroundColor: statusPill.bgColor,
                          color: statusPill.color,
                        }}
                      >
                        {statusPill.label}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="quote-actions-row">
                    <button
                      onClick={() => {
                        hapticButtonPress();
                        navigate(`/seller/preventivi/${quote.id}`);
                      }}
                      className="quote-action-btn quote-action-btn-primary"
                      title={t('quotes.view')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => {
                        hapticButtonPress();
                        navigate(`/seller/preventivi/${quote.id}/edit`);
                      }}
                      className="quote-action-btn quote-action-btn-secondary"
                      title={t('quotes.edit')}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        hapticButtonPress();
                        navigate(`/seller/preventivi/${quote.id}/commissione`);
                      }}
                      className="quote-action-btn quote-action-btn-commission"
                      title="Commissione"
                    >
                      <HandCoins size={18} />
                    </button>
                    <button
                      onClick={() => {
                        hapticButtonPress();
                        handleDelete(quote.id);
                      }}
                      className="quote-action-btn quote-action-btn-danger"
                      title={t('quotes.delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters Bottom Sheet */}
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtri"
          snapPoints={[60]}
        >
          <div style={{ padding: '16px', paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ marginBottom: '24px' }}>
              <label
                className="ios-body-bold"
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: 'var(--ios-label)',
                }}
              >
                Stato
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                {[
                  { value: 'all', label: t('quotes.status.all') },
                  { value: 'pending', label: t('quotes.status.pending') },
                  { value: 'approved', label: t('quotes.status.approved') },
                  { value: 'rejected', label: t('quotes.status.rejected') },
                  { value: 'contract_requested', label: t('status.contract_requested') },
                  { value: 'started', label: t('status.active') },
                  { value: 'completed', label: t('status.active') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: statusFilter === option.value
                        ? 'none'
                        : `1px solid var(--ios-opaque-separator)`,
                      fontSize: '14px',
                      fontFamily: 'var(--ios-font-family)',
                      fontWeight: 500,
                      transition: 'opacity 0.1s ease',
                      backgroundColor: statusFilter === option.value
                        ? 'var(--ios-system-blue)'
                        : 'var(--ios-secondary-system-grouped-background)',
                      color: statusFilter === option.value
                        ? '#FFFFFF'
                        : 'var(--ios-label)',
                      cursor: 'pointer',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowFilters(false);
                loadQuotes();
              }}
              className="ios-button-primary"
              style={{
                width: '100%',
                margin: 0,
              }}
            >
              {t('common.apply')}
            </button>
          </div>
        </BottomSheet>

      </div>
    </PullToRefresh>
  );
};

export default SellerQuotesMobile;
