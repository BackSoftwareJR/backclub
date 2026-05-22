import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Briefcase,
  Phone,
  DollarSign,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
// GuideTour temporaneamente disabilitato per risolvere problemi di scroll
// import { useGuide } from '../../context/GuideContext';
import { sellersApi } from '../../api/sellers';
import { sellerCache } from '../../utils/sellerCache';
// import GuideTour from '../../components/Guide/GuideTour';
// import { useMobileTourSteps } from '../../config/mobileGuideTours';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import './SellerDashboardMobile.css';

interface DashboardStats {
  pending_quotes: number;
  active_contracts: number;
  total_clients: number;
  leads_to_contact: number;
  total_revenue: number;
  current_month_revenue: number;
  revenue_change: number;
  quotes_change: number;
  contracts_change: number;
  conversion_rate: number;
  active_projects: number;
  new_clients_this_month: number;
  sales_trend: Array<{ date: string; revenue: number; count: number }>;
  urgent_leads: Array<{
    id: number;
    company_name: string;
    contact_person: string;
    status: string;
    next_followup_date: string | null;
    priority: string;
  }>;
  recent_quotes: Array<{
    id: number;
    client_name: string;
    total_amount: number;
    status: string;
    created_at: string;
    quote_number?: string;
  }>;
  recent_activities: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    time_ago: string;
    icon: string;
    amount?: number;
    status?: string;
  }>;
}

const SellerDashboardMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // GuideTour temporaneamente disabilitato
  // const { startTour } = useGuide();
  // const { getMobileCompleteTourSteps } = useMobileTourSteps();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // GuideTour temporaneamente disabilitato
  // Get mobile-specific tour steps
  // const mobileTourSteps = getMobileCompleteTourSteps();
  
  // Debug: log tour steps
  // useEffect(() => {
  //   if (mobileTourSteps.length > 0) {
  //     console.log('SellerDashboardMobile: Mobile tour steps loaded:', mobileTourSteps.length);
  //   }
  // }, [mobileTourSteps.length]);

  const loadStats = async () => {
    if (!user?.seller_id) return;

    const period = '30';
    const cached = sellerCache.dashboard.get<DashboardStats>(user.seller_id, period);
    if (cached) {
      setStats(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await sellersApi.getSellerDashboardStats(user.seller_id, period);
      setStats(data);
      sellerCache.dashboard.set(user.seller_id, period, data);
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche:', error);
      if (!cached) {
        setStats({
          pending_quotes: 0,
          active_contracts: 0,
          total_clients: 0,
          leads_to_contact: 0,
          total_revenue: 0,
          current_month_revenue: 0,
          revenue_change: 0,
          quotes_change: 0,
          contracts_change: 0,
          conversion_rate: 0,
          active_projects: 0,
          new_clients_this_month: 0,
          sales_trend: [],
          urgent_leads: [],
          recent_quotes: [],
          recent_activities: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.seller_id]);

  // Auto-start tour if user chose to start it during onboarding
  // GuideTour temporaneamente disabilitato
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   
  //   const shouldStartTour = sessionStorage.getItem('startOnboardingTour') === 'true';
  //   if (shouldStartTour && !loading && stats) {
  //     console.log('SellerDashboardMobile: Auto-starting mobile tour from onboarding');
  //     // Clear the flag
  //     sessionStorage.removeItem('startOnboardingTour');
  //     // Wait a bit for the page to fully render
  //     setTimeout(() => {
  //       startTour('mobile-complete-tour');
  //     }, 800);
  //   }
  // }, [loading, stats, startTour]);

  const kpiTiles = [
    {
      id: 'quotes',
      label: t('dashboard.kpi.pending_quotes'),
      value: stats?.pending_quotes || 0,
      icon: FileText,
      color: '#FF9F0A', // iOS Orange
      action: () => {
        hapticButtonPress();
        navigate('/seller/preventivi?status=pending');
      },
    },
    {
      id: 'contracts',
      label: t('dashboard.kpi.active_contracts'),
      value: stats?.active_contracts || 0,
      icon: Briefcase,
      color: '#30D158', // iOS Green
      action: () => {
        hapticButtonPress();
        navigate('/seller/contratti?status=active');
      },
    },
    {
      id: 'leads',
      label: t('dashboard.kpi.leads_to_contact'),
      value: stats?.leads_to_contact || 0,
      icon: Phone,
      color: '#FF453A', // iOS Red
      action: () => {
        hapticButtonPress();
        navigate('/seller/contatti?status=new');
      },
    },
    {
      id: 'revenue',
      label: t('dashboard.kpi.revenue'),
      value: stats?.current_month_revenue || 0,
      icon: DollarSign,
      color: '#0A84FF', // iOS Blue
      action: () => {
        hapticButtonPress();
        navigate('/seller/commissioni');
      },
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusPill = (status: string) => {
    if (status === 'pending') {
      return {
        label: t('status.pending'),
        backgroundColor: 'rgba(255, 204, 0, 0.15)',
        color: '#FFD60A',
      };
    }
    if (status === 'approved') {
      return {
        label: t('status.approved'),
        backgroundColor: 'rgba(48, 209, 88, 0.15)',
        color: '#30D158',
      };
    }
    if (status === 'rejected') {
      return {
        label: t('status.rejected'),
        backgroundColor: 'rgba(255, 69, 58, 0.15)',
        color: '#FF453A',
      };
    }
    return {
      label: t(`status.${status}`) || status,
      backgroundColor: 'rgba(142, 142, 147, 0.15)',
      color: '#8E8E93',
    };
  };

  return (
    <>
      {/* GuideTour temporaneamente disabilitato per risolvere problemi di scroll */}
      {/* <GuideTour steps={mobileTourSteps} tourId="mobile-complete-tour" /> */}
      <PullToRefresh onRefresh={loadStats}>
      <div className="dashboard-mobile-health">
        {/* Large Title - iOS Style */}
        <div className="dashboard-header">
          <h1 className="ios-large-title">{t('dashboard.title')}</h1>
        </div>

        {loading ? (
          <div className="dashboard-content">
            <div className="dashboard-skeleton">
              <div className="skeleton-stats-grid">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonLoader key={i} type="kpi-tile" />
                ))}
              </div>
              <div className="skeleton-quick-actions">
                <SkeletonLoader type="action-row" />
                <SkeletonLoader type="action-row" />
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-content">
            {/* Statistics - Bento Grid Layout (2x2) */}
            <div className="stats-grid">
              {kpiTiles.map((tile) => {
                const Icon = tile.icon;

                return (
                  <button
                    key={tile.id}
                    onClick={tile.action}
                    className="stat-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      className="stat-card-content"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        gap: '8px',
                        alignItems: 'flex-start',
                        textAlign: 'left',
                      }}
                    >
                      {/* Riga superiore: Icona + Numero affiancati */}
                      <div
                        className="stat-card-top-row"
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          size={20}
                          style={{
                            color: tile.color,
                            margin: 0,
                            flexShrink: 0,
                            alignSelf: 'center',
                          }}
                        />
                        <div
                          className="stat-value"
                          style={{
                            textAlign: 'left',
                            margin: 0,
                            flexShrink: 0,
                          }}
                        >
                          {tile.id === 'revenue'
                            ? formatCurrency(tile.value)
                            : tile.value}
                        </div>
                      </div>
                      {/* Etichetta sotto il numero */}
                      <div
                        className="stat-label"
                        style={{
                          textAlign: 'left',
                          margin: 0,
                          marginTop: '2px',
                          alignSelf: 'flex-start',
                        }}
                      >
                        {tile.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions - Wide Buttons */}
            <div className="quick-actions">
              <button
                onClick={() => {
                  hapticButtonPress();
                  navigate('/seller/preventivi/nuovo');
                }}
                className="action-button"
              >
                <FileText size={20} style={{ color: '#0A84FF' }} />
                <span className="action-button-text">{t('dashboard.quick_actions.new_quote')}</span>
                <ChevronRight size={20} style={{ color: '#8E8E93' }} />
              </button>
              <button
                onClick={() => {
                  hapticButtonPress();
                  navigate('/seller/contatti?action=new');
                }}
                className="action-button"
              >
                <UserPlus size={20} style={{ color: '#0A84FF' }} />
                <span className="action-button-text">{t('dashboard.quick_actions.new_contact')}</span>
                <ChevronRight size={20} style={{ color: '#8E8E93' }} />
              </button>
            </div>

            {/* Recent Quotes - Clean List */}
            {stats && stats.recent_quotes.length > 0 && (
              <div className="recent-quotes">
                <div className="section-header">{t('dashboard.recent_quotes').toUpperCase()}</div>
                <div className="quotes-list">
                  {stats.recent_quotes.slice(0, 3).map((quote, index) => {
                    const isLast = index === stats.recent_quotes.slice(0, 3).length - 1;
                    const statusPill = getStatusPill(quote.status);

                    return (
                      <button
                        key={quote.id}
                        onClick={() => {
                          hapticButtonPress();
                          navigate(`/seller/preventivi/${quote.id}`);
                        }}
                        className={`quote-item ${isLast ? 'quote-item-last' : ''}`}
                      >
                        {/* Colonna Sinistra: Info Cliente */}
                        <div className="quote-content-left">
                          <div className="quote-client">{quote.client_name}</div>
                          <div className="quote-meta">
                            {quote.quote_number || `#${quote.id}`}
                            {quote.created_at && ` • ${new Date(quote.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`}
                          </div>
                        </div>
                        {/* Colonna Destra: Valore e Stato */}
                        <div className="quote-content-right">
                          <div className="quote-amount">{formatCurrency(quote.total_amount)}</div>
                          <div
                            className="quote-status-pill"
                            style={{
                              backgroundColor: statusPill.backgroundColor,
                              color: statusPill.color,
                            }}
                          >
                            {statusPill.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
    </>
  );
};

export default SellerDashboardMobile;
