import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Receipt, 
  Clock, 
  ArrowRight,
  Mail,
  Calendar
} from 'lucide-react';
import { expenseDashboardApi } from '../../api/expenses';
import { quotesApi } from '../../api/quotes';
import './DashboardPage.css';

interface DashboardKPIs {
  monthlyTurnover: number;
  outstandingInvoices: number;
  pendingExpenses: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: number;
  type: 'invoice' | 'quote' | 'expense' | 'email';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    monthlyTurnover: 0,
    outstandingInvoices: 0,
    pendingExpenses: 0,
    recentActivity: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load KPIs from expense dashboard
      const expenseKPIs = await expenseDashboardApi.getKPIs({
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      // Load recent quotes
      const recentQuotes = await quotesApi.getAll({ 
        per_page: 5,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      // Load recent clients activity (we'll simulate this for now)
      // TODO: Create API endpoint for recent activity feed

      // Transform data
      const activityItems: ActivityItem[] = [];
      
      if (recentQuotes.data) {
        recentQuotes.data.forEach((quote: any) => {
          activityItems.push({
            id: quote.id,
            type: 'quote',
            title: `Preventivo ${quote.quote_number}`,
            description: quote.client?.company_name || 'Cliente',
            date: quote.created_at,
            status: quote.status,
            amount: quote.total_amount
          });
        });
      }

      setKpis({
        monthlyTurnover: expenseKPIs.data?.total_expenses || 0,
        outstandingInvoices: expenseKPIs.data?.pending_amount || 0,
        pendingExpenses: expenseKPIs.data?.pending_count || 0,
        recentActivity: activityItems.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Receipt size={16} />;
      case 'quote':
        return <FileText size={16} />;
      case 'expense':
        return <TrendingDown size={16} />;
      case 'email':
        return <Mail size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return '';
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
      case 'accepted':
        return 'status-success';
      case 'pending':
      case 'sent':
        return 'status-warning';
      case 'overdue':
      case 'rejected':
        return 'status-danger';
      default:
        return 'status-info';
    }
  };

  if (loading) {
    return (
      <div className="segreteria-dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="segreteria-dashboard">
      {/* Page Header */}
      <div className="segreteria-dashboard-header">
        <div>
          <h1 className="segreteria-dashboard-title">Dashboard</h1>
          <p className="segreteria-dashboard-subtitle">Panoramica generale della segreteria</p>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="segreteria-kpi-grid">
        <div className="segreteria-kpi-card">
          <div className="segreteria-kpi-icon" style={{ background: 'rgba(52, 199, 89, 0.15)', color: 'var(--color-success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="segreteria-kpi-content">
            <div className="segreteria-kpi-label">Fatturato Mese</div>
            <div className="segreteria-kpi-value">{formatCurrency(kpis.monthlyTurnover)}</div>
            <div className="segreteria-kpi-trend">
              <span className="trend-positive">+12.5%</span> vs mese scorso
            </div>
          </div>
        </div>

        <div className="segreteria-kpi-card">
          <div className="segreteria-kpi-icon" style={{ background: 'rgba(255, 69, 58, 0.15)', color: 'var(--color-error)' }}>
            <Receipt size={24} />
          </div>
          <div className="segreteria-kpi-content">
            <div className="segreteria-kpi-label">Fatture da Incassare</div>
            <div className="segreteria-kpi-value">{formatCurrency(kpis.outstandingInvoices)}</div>
            <div className="segreteria-kpi-trend">
              <span className="trend-neutral">{kpis.pendingExpenses} documenti</span>
            </div>
          </div>
        </div>

        <div className="segreteria-kpi-card">
          <div className="segreteria-kpi-icon" style={{ background: 'rgba(255, 159, 10, 0.15)', color: 'var(--color-warning)' }}>
            <Clock size={24} />
          </div>
          <div className="segreteria-kpi-content">
            <div className="segreteria-kpi-label">Scadenze Prossime</div>
            <div className="segreteria-kpi-value">5</div>
            <div className="segreteria-kpi-trend">
              <span className="trend-warning">Nei prossimi 7 giorni</span>
            </div>
          </div>
        </div>

        <div className="segreteria-kpi-card">
          <div className="segreteria-kpi-icon" style={{ background: 'rgba(10, 132, 255, 0.15)', color: 'var(--color-info)' }}>
            <Mail size={24} />
          </div>
          <div className="segreteria-kpi-content">
            <div className="segreteria-kpi-label">Email Non Lette</div>
            <div className="segreteria-kpi-value">12</div>
            <div className="segreteria-kpi-trend">
              <span className="trend-info">Richiedono attenzione</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="segreteria-dashboard-section">
        <div className="segreteria-section-header">
          <h2 className="segreteria-section-title">Attività Recente</h2>
          <button 
            className="segreteria-section-link"
            onClick={() => navigate('/segreteria/fatture')}
          >
            Vedi tutto <ArrowRight size={16} />
          </button>
        </div>

        <div className="segreteria-activity-feed">
          {kpis.recentActivity.length === 0 ? (
            <div className="segreteria-empty-state">
              <Clock size={48} className="segreteria-empty-icon" />
              <h3>Nessuna attività recente</h3>
              <p>Le attività recenti appariranno qui</p>
            </div>
          ) : (
            kpis.recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="segreteria-activity-item"
                onClick={() => {
                  if (activity.type === 'quote') {
                    navigate(`/segreteria/preventivi/${activity.id}`);
                  } else if (activity.type === 'invoice') {
                    navigate(`/segreteria/fatture/${activity.id}`);
                  }
                }}
              >
                <div className="segreteria-activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="segreteria-activity-content">
                  <div className="segreteria-activity-title">{activity.title}</div>
                  <div className="segreteria-activity-description">{activity.description}</div>
                  <div className="segreteria-activity-meta">
                    <span className="segreteria-activity-date">
                      <Calendar size={12} />
                      {formatDate(activity.date)}
                    </span>
                    {activity.status && (
                      <span className={`segreteria-activity-status ${getStatusBadgeClass(activity.status)}`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                </div>
                {activity.amount && (
                  <div className="segreteria-activity-amount">
                    {formatCurrency(activity.amount)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="segreteria-dashboard-section">
        <h2 className="segreteria-section-title">Azioni Rapide</h2>
        <div className="segreteria-quick-actions-grid">
          <button 
            className="segreteria-quick-action-card"
            onClick={() => navigate('/segreteria/fatture/nuova')}
          >
            <Receipt size={32} />
            <span>Nuova Fattura</span>
          </button>
          <button 
            className="segreteria-quick-action-card"
            onClick={() => navigate('/segreteria/contatti/nuovo')}
          >
            <FileText size={32} />
            <span>Nuovo Contatto</span>
          </button>
          <button 
            className="segreteria-quick-action-card"
            onClick={() => navigate('/segreteria/spese/nuova')}
          >
            <TrendingDown size={32} />
            <span>Nuova Spesa</span>
          </button>
          <button 
            className="segreteria-quick-action-card"
            onClick={() => navigate('/segreteria/email')}
          >
            <Mail size={32} />
            <span>Gestisci Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

