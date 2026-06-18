import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  UserCircle,
  Phone,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingUp,
  DollarSign,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useGuide } from '../../context/GuideContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { sellersApi } from '../../api/sellers';
import { sellerCache } from '../../utils/sellerCache';
import GuideTour from '../../components/Guide/GuideTour';
import { dashboardTourSteps, completeTourSteps } from '../../config/guideTours';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SellerDashboardMobile from './SellerDashboardMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerDashboardPage.css';

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
  urgent_leads: Array<{ id: number; company_name: string; contact_person: string; status: string; next_followup_date: string | null; priority: string }>;
  recent_quotes: Array<{ id: number; client_name: string; total_amount: number; status: string; created_at: string }>;
  recent_activities: Array<{ type: string; title: string; description: string; timestamp: string; time_ago: string; icon: string; amount?: number; status?: string }>;
}

const SellerDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { startTour } = useGuide();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<string>('30');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: { date: string; revenue: number; count: number } } | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/role-selection') return;

    const roleSelectionInProgress = sessionStorage.getItem('role_selection_in_progress') === 'true';
    if (roleSelectionInProgress) {
      console.log('Role selection in progress, skipping redirect');
      return;
    }

    const activeRole = user?.current_role || user?.role;
    const isSeller = user?.seller_id || activeRole === 'seller' || activeRole === 'venditori';

    if (!isSeller || !user?.seller_id) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const fetchStats = async () => {
      if (!user.seller_id) {
        setLoading(false);
        return;
      }

      const cached = sellerCache.dashboard.get<DashboardStats>(user.seller_id, salesPeriod);
      if (cached) {
        setStats(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const data = await sellersApi.getSellerDashboardStats(user.seller_id, salesPeriod);
        setStats(data);
        sellerCache.dashboard.set(user.seller_id, salesPeriod, data);
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

    fetchStats();
  }, [salesPeriod, user?.current_role, user?.role, user?.seller_id, navigate, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.period-dropdown-wrapper')) {
        setShowPeriodDropdown(false);
      }
    };

    if (showPeriodDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPeriodDropdown]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldStartTour = sessionStorage.getItem('startOnboardingTour') === 'true';
    if (shouldStartTour && !loading && stats) {
      console.log('SellerDashboardPage: Auto-starting tour from onboarding');
      sessionStorage.removeItem('startOnboardingTour');
      setTimeout(() => {
        startTour('complete-tour');
      }, 500);
    }
  }, [loading, stats, startTour]);

  if (isMobile) {
    return <SellerDashboardMobile />;
  }

  const kpiCards = [
    {
      id: 'quotes',
      label: t('dashboard.kpi.pending_quotes'),
      value: stats?.pending_quotes || 0,
      change: stats?.quotes_change || 0,
      icon: FileText,
      color: 'var(--seller-warning)',
      action: () => {
        hapticButtonPress();
        navigate('/seller/preventivi?status=pending');
      },
    },
    {
      id: 'contracts',
      label: t('dashboard.kpi.active_contracts'),
      value: stats?.active_contracts || 0,
      change: stats?.contracts_change || 0,
      icon: Briefcase,
      color: 'var(--seller-success)',
      action: () => {
        hapticButtonPress();
        navigate('/seller/contratti?status=active');
      },
    },
    {
      id: 'clients',
      label: t('dashboard.kpi.total_clients'),
      value: stats?.total_clients || 0,
      change: stats?.new_clients_this_month || 0,
      icon: UserCircle,
      color: 'var(--seller-accent)',
      action: () => {
        hapticButtonPress();
        navigate('/seller/clienti');
      },
    },
    {
      id: 'leads',
      label: t('dashboard.kpi.leads_to_contact'),
      value: stats?.leads_to_contact || 0,
      change: stats?.conversion_rate || 0,
      icon: Phone,
      color: 'var(--seller-danger)',
      action: () => {
        hapticButtonPress();
        navigate('/seller/contatti?status=new');
      },
    },
  ];

  const quickActions = [
    {
      id: 'new-quote',
      label: t('dashboard.quick_actions.new_quote'),
      icon: Plus,
      action: () => {
        hapticButtonPress();
        navigate('/seller/preventivi/nuovo');
      },
    },
    {
      id: 'new-lead',
      label: t('dashboard.quick_actions.new_contact'),
      icon: Phone,
      action: () => {
        hapticButtonPress();
        navigate('/seller/contatti?action=new');
      },
    },
    {
      id: 'view-agenda',
      label: t('dashboard.quick_actions.view_agenda'),
      icon: Calendar,
      action: () => {
        hapticButtonPress();
        navigate('/seller/agenda');
      },
    },
  ];

  if (loading) {
    return (
      <div className="overview-page">
        <div className="venditori-page-header">
          <SkeletonLoader type="page-header" />
        </div>
        <div className="dash-kpi-grid overview-skeleton-kpi">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} type="kpi-tile" className="overview-skeleton-kpi-item" />
          ))}
        </div>
        <div className="overview-section overview-skeleton-section">
          <div className="skeleton-section-title skeleton-pulse-fill" />
          <div className="quick-actions-bar overview-skeleton-actions">
            <SkeletonLoader type="action-row" />
            <SkeletonLoader type="action-row" />
            <SkeletonLoader type="action-row" />
          </div>
        </div>
        <div className="overview-grid overview-skeleton-grid">
          <SkeletonLoader type="chart-block" />
          <div className="skeleton-list-section">
            <div className="skeleton-section-title skeleton-pulse-fill skeleton-title-sm" />
            <SkeletonLoader type="list" count={3} />
          </div>
          <div className="skeleton-list-section">
            <div className="skeleton-section-title skeleton-pulse-fill skeleton-title-sm" />
            <SkeletonLoader type="list" count={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-page">
      <GuideTour steps={dashboardTourSteps} tourId="dashboard-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />

      {/* Page Header */}
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">{t('dashboard.title')}</h1>
          <p className="venditori-page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <button
          className="venditori-btn venditori-btn-primary"
          onClick={() => {
            hapticButtonPress();
            navigate('/seller/preventivi/nuovo');
          }}
        >
          <Plus size={18} />
          {t('dashboard.quick_actions.new_quote')}
        </button>
      </div>

      {/* KPI Cards — 4-col grid, Apple minimalist */}
      <div className="dash-kpi-grid">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          const isPositive = card.change >= 0;
          return (
            <motion.div
              key={card.id}
              className="dash-kpi-card seller-card"
              onClick={card.action}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="dash-kpi-top">
                <span className="dash-kpi-icon-wrap">
                  <Icon size={20} style={{ color: card.color }} />
                </span>
                {card.change !== 0 && (
                  <span className={`dash-kpi-delta ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {Math.abs(card.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="dash-kpi-value">{card.value}</div>
              <div className="dash-kpi-label">{card.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue highlight — subtle, no gradient */}
      {stats && stats.total_revenue > 0 && (
        <motion.div
          className="dash-revenue-card seller-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
        >
          <div className="dash-revenue-inner">
            <div className="dash-revenue-body">
              <span className="dash-revenue-label">Fatturato Totale</span>
              <div className="dash-revenue-value">
                € {stats.total_revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {stats.current_month_revenue > 0 && (
                <div className="dash-revenue-meta">
                  <span>Questo mese: € {stats.current_month_revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {stats.revenue_change !== 0 && (
                    <span className={`dash-kpi-delta ${stats.revenue_change >= 0 ? 'positive' : 'negative'}`}>
                      {stats.revenue_change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {Math.abs(stats.revenue_change).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
            <DollarSign size={28} className="dash-revenue-icon" />
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="overview-section">
        <h2 className="section-title">Azioni Rapide</h2>
        <div className="quick-actions-bar">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                className="quick-action-btn-minimal"
                onClick={action.action}
              >
                <Icon size={16} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main grid — chart + lists */}
      <div className="overview-grid">

        {/* Sales Trend Chart */}
        <div className={`sales-trend-card ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
          <div className="sales-trend-header">
            <div className="sales-trend-content">
              <h3 className="sales-trend-title">{t('dashboard.sales_trend.title')}</h3>
              {stats && stats.sales_trend.length > 0 && (
                <div className="sales-trend-main-value">
                  <span className="sales-trend-amount">
                    € {stats.sales_trend.reduce((sum, p) => sum + p.revenue, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {stats.sales_trend.length > 1 && (() => {
                    const firstValue = stats.sales_trend[0].revenue;
                    const lastValue = stats.sales_trend[stats.sales_trend.length - 1].revenue;
                    const change = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
                    const isPositive = change >= 0;
                    return (
                      <div className={`sales-trend-badge ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        <span>{Math.abs(change).toFixed(1)}%</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="period-dropdown-wrapper">
              <button
                className="period-dropdown-btn-minimal"
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              >
                <span>
                  {salesPeriod === '7' ? '7g' : salesPeriod === '30' ? '30g' : '90g'}
                </span>
                <ChevronDown size={12} className={showPeriodDropdown ? 'open' : ''} />
              </button>
              {showPeriodDropdown && (
                <div className={`period-dropdown-menu ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
                  <button
                    className={`period-dropdown-item ${salesPeriod === '7' ? 'active' : ''}`}
                    onClick={() => {
                      setSalesPeriod('7');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {t('dashboard.sales_trend.period_7')}
                  </button>
                  <button
                    className={`period-dropdown-item ${salesPeriod === '30' ? 'active' : ''}`}
                    onClick={() => {
                      hapticButtonPress();
                      setSalesPeriod('30');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {t('dashboard.sales_trend.period_30')}
                  </button>
                  <button
                    className={`period-dropdown-item ${salesPeriod === '90' ? 'active' : ''}`}
                    onClick={() => {
                      hapticButtonPress();
                      setSalesPeriod('90');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {t('dashboard.sales_trend.period_90')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="chart-container">
            {stats && stats.sales_trend.length > 0 ? (
              <div className="sales-area-chart">
                <svg
                  className="chart-svg"
                  viewBox={`0 0 ${stats.sales_trend.length * 40} 200`}
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--seller-accent)" stopOpacity="0.35" />
                      <stop offset="60%" stopColor="var(--seller-accent)" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="var(--seller-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {hoveredPoint && (() => {
                    const pointIndex = stats.sales_trend.findIndex(p => p.date === hoveredPoint.data.date);
                    if (pointIndex === -1) return null;
                    const x = pointIndex * 40 + 20;
                    return (
                      <line
                        x1={x} y1="0" x2={x} y2="200"
                        stroke="rgba(59,130,246,0.35)"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                        className="chart-hover-line"
                      />
                    );
                  })()}

                  <path
                    d={(() => {
                      const maxRevenue = Math.max(...stats.sales_trend.map(p => p.revenue));
                      if (maxRevenue === 0) return '';
                      const points = stats.sales_trend.map((point, index) => ({
                        x: index * 40 + 20,
                        y: 200 - (point.revenue / maxRevenue) * 180,
                      }));
                      if (points.length === 0) return '';
                      if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} 200 Z`;
                      let path = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 3;
                        const cp2x = points[i].x + (points[i + 1].x - points[i].x) * 2 / 3;
                        path += ` C ${cp1x} ${points[i].y}, ${cp2x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
                      }
                      const last = points[points.length - 1];
                      path += ` L ${last.x} 200 L ${points[0].x} 200 Z`;
                      return path;
                    })()}
                    fill="url(#chartGradient)"
                    className="chart-area"
                  />

                  <path
                    d={(() => {
                      const maxRevenue = Math.max(...stats.sales_trend.map(p => p.revenue));
                      if (maxRevenue === 0) return '';
                      const points = stats.sales_trend.map((point, index) => ({
                        x: index * 40 + 20,
                        y: 200 - (point.revenue / maxRevenue) * 180,
                      }));
                      if (points.length === 0) return '';
                      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                      let path = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 3;
                        const cp2x = points[i].x + (points[i + 1].x - points[i].x) * 2 / 3;
                        path += ` C ${cp1x} ${points[i].y}, ${cp2x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
                      }
                      return path;
                    })()}
                    fill="none"
                    stroke="var(--seller-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="chart-line"
                  />

                  {stats.sales_trend.map((point, index) => {
                    const maxRevenue = Math.max(...stats.sales_trend.map(p => p.revenue));
                    const x = index * 40 + 20;
                    const y = maxRevenue > 0 ? 200 - (point.revenue / maxRevenue) * 180 : 200;
                    return (
                      <g key={index}>
                        <circle
                          cx={x} cy={y} r="12"
                          fill="transparent"
                          className="chart-hit-area"
                          onMouseEnter={(e) => {
                            const svg = e.currentTarget.closest('.chart-svg') as SVGSVGElement;
                            const container = svg?.closest('.sales-area-chart') as HTMLElement;
                            if (svg && container) {
                              const svgRect = svg.getBoundingClientRect();
                              const containerRect = container.getBoundingClientRect();
                              setHoveredPoint({
                                x: containerRect.left + ((x / (stats.sales_trend.length * 40)) * svgRect.width),
                                y: containerRect.top + ((y / 200) * svgRect.height),
                                data: point,
                              });
                            }
                          }}
                        />
                        <circle
                          cx={x} cy={y} r="4.5"
                          fill="var(--seller-accent)"
                          stroke="var(--seller-bg-elevated)"
                          strokeWidth="2"
                          className="chart-point"
                        />
                      </g>
                    );
                  })}
                </svg>

                {hoveredPoint && (
                  <div
                    className={`chart-tooltip ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}
                    style={{ left: `${hoveredPoint.x}px`, top: '20px' }}
                  >
                    <div className="chart-tooltip-value">
                      € {hoveredPoint.data.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="chart-tooltip-date">
                      {(() => {
                        try {
                          const date = new Date(hoveredPoint.data.date);
                          if (isNaN(date.getTime())) {
                            const parts = hoveredPoint.data.date.split('-');
                            if (parts.length === 3) {
                              return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                                .toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                            }
                            return hoveredPoint.data.date;
                          }
                          return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                        } catch {
                          return hoveredPoint.data.date;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="chart-empty">
                <Activity size={40} />
                <p>{t('dashboard.no_data')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Urgent Leads */}
        <div className="overview-card">
          <div className="card-header">
            <h3>{t('dashboard.urgent_leads.title')}</h3>
            <button
              className="card-action-link"
              onClick={() => navigate('/seller/contatti?priority=high')}
            >
              Vedi tutti
            </button>
          </div>
          <div className="leads-list">
            {stats && stats.urgent_leads.length > 0 ? (
              stats.urgent_leads.map((lead) => (
                <div
                  key={lead.id}
                  className="lead-item"
                  onClick={() => navigate(`/seller/contatti/${lead.id}`)}
                >
                  <div className="lead-info">
                    <div className="lead-name">{lead.company_name}</div>
                    <div className="lead-contact">{lead.contact_person}</div>
                  </div>
                  <div className="lead-meta">
                    {lead.next_followup_date && (
                      <span className="lead-date">
                        <Calendar size={12} />
                        {new Date(lead.next_followup_date).toLocaleDateString('it-IT')}
                      </span>
                    )}
                    <span className={`venditori-badge venditori-badge-${lead.priority === 'high' ? 'danger' : lead.priority === 'medium' ? 'warning' : 'info'}`}>
                      {t(`status.${lead.priority}`)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="venditori-empty-state">
                <Phone size={32} />
                <p>{t('dashboard.urgent_leads.no_leads')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotes */}
        <div className="overview-card">
          <div className="card-header">
            <h3>{t('dashboard.recent_quotes')}</h3>
            <button
              className="card-action-link"
              onClick={() => {
                hapticButtonPress();
                navigate('/seller/preventivi');
              }}
            >
              {t('dashboard.view_all')}
            </button>
          </div>
          <div className="quotes-list">
            {stats && stats.recent_quotes.length > 0 ? (
              stats.recent_quotes.map((quote) => {
                const statusClassMap: Record<string, string> = {
                  pending: 'warning',
                  approved: 'success',
                  rejected: 'danger',
                  contract_requested: 'info',
                };
                const statusClass = statusClassMap[quote.status] || 'secondary';
                return (
                  <div
                    key={quote.id}
                    className="quote-item"
                    onClick={() => navigate(`/seller/preventivi/${quote.id}`)}
                  >
                    <div className="quote-info">
                      <div className="quote-client">{quote.client_name}</div>
                      <div className="quote-amount">
                        € {quote.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span className={`venditori-badge venditori-badge-${statusClass}`}>
                      {t(`status.${quote.status}`) || quote.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="venditori-empty-state">
                <FileText size={32} />
                <p>{t('dashboard.no_recent_quotes')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="overview-card">
          <div className="card-header">
            <h3>{t('dashboard.recent_activities')}</h3>
          </div>
          <div className="activities-list">
            {stats && stats.recent_activities.length > 0 ? (
              stats.recent_activities.map((activity, index) => {
                const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
                  FileText,
                  Briefcase,
                  TrendingUp,
                };
                const ActivityIcon = iconMap[activity.icon] ?? Activity;
                return (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <ActivityIcon size={16} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-description">{activity.description}</div>
                      {activity.amount && (
                        <div className="activity-amount">
                          € {activity.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div className="activity-time">{activity.time_ago}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="venditori-empty-state">
                <Activity size={32} />
                <p>{t('dashboard.no_recent_activities')}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerDashboardPage;
