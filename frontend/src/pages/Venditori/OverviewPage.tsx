import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  DollarSign, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import sellersApi from '../../api/sellers';
import './OverviewPage.css';

interface SalesTrendData {
  date: string;
  revenue: number;
  count: number;
}

interface SectorDistributionData {
  department_id: number;
  department_name: string;
  department_code: string;
  count: number;
  total: number;
}

interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  time_ago: string;
  icon: string;
}

interface OverviewStats {
  total_revenue: number;
  active_contracts: number;
  pending_quotes: number;
  active_sellers: number;
  revenue_change: number;
  contracts_change: number;
  quotes_change: number;
  sales_trend: SalesTrendData[];
  sector_distribution: SectorDistributionData[];
  recent_activities: RecentActivity[];
}

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState<string>('30');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await sellersApi.getOverviewStats(salesPeriod);
        setStats(data);
      } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        // Fallback a dati di default in caso di errore
        setStats({
          total_revenue: 0,
          active_contracts: 0,
          pending_quotes: 0,
          active_sellers: 0,
          revenue_change: 0,
          contracts_change: 0,
          quotes_change: 0,
          sales_trend: [],
          sector_distribution: [],
          recent_activities: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [salesPeriod]);

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const kpiCards = [
    {
      id: 'revenue',
      label: 'Fatturato Totale',
      value: `€ ${stats?.total_revenue.toLocaleString('it-IT') || '0'}`,
      change: stats?.revenue_change || 0,
      icon: DollarSign,
      color: '#0A84FF',
    },
    {
      id: 'contracts',
      label: 'Contratti Attivi',
      value: stats?.active_contracts || 0,
      change: stats?.contracts_change || 0,
      icon: FileText,
      color: '#34C759',
    },
    {
      id: 'quotes',
      label: 'Preventivi Pending',
      value: stats?.pending_quotes || 0,
      change: stats?.quotes_change || 0,
      icon: AlertCircle,
      color: '#FF9F0A',
    },
    {
      id: 'sellers',
      label: 'Venditori Attivi',
      value: stats?.active_sellers || 0,
      change: 0,
      icon: Users,
      color: '#5856D6',
    },
  ];

  return (
    <div className="overview-page">
      <div className="venditori-page-header">
        <h1 className="venditori-page-title">Overview</h1>
        <p className="venditori-page-subtitle">Panoramica generale del sistema venditori</p>
      </div>

      <div className="overview-kpi-grid">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          
          return (
            <div key={kpi.id} className="overview-kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-icon-wrapper" style={{ backgroundColor: `${kpi.color}15` }}>
                  <Icon size={20} style={{ color: kpi.color }} />
                </div>
                {kpi.change !== 0 && (
                  <div className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    <span>{Math.abs(kpi.change)}%</span>
                  </div>
                )}
              </div>
              <div className="kpi-card-body">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overview-charts-section">
        <div className="overview-chart-card">
          <div className="chart-card-header">
            <h3>Andamento Vendite</h3>
            <select 
              className="chart-period-select"
              value={salesPeriod}
              onChange={(e) => setSalesPeriod(e.target.value)}
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 3 mesi</option>
              <option value="365">Ultimo anno</option>
            </select>
          </div>
          <div className="chart-container">
            {stats?.sales_trend && stats.sales_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.sales_trend}>
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-text-tertiary)"
                    style={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-tertiary)"
                    style={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 12,
                    }}
                    formatter={(value: number | undefined) => [
                      value !== undefined ? `€${value.toLocaleString('it-IT')}` : '€0',
                      'Fatturato'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-accent-blue)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <TrendingUp size={48} />
                <p>Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="overview-chart-card">
          <div className="chart-card-header">
            <h3>Distribuzione per Settore</h3>
          </div>
          <div className="chart-container">
            {stats?.sector_distribution && stats.sector_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.sector_distribution.slice(0, 6) as any}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }: { percent?: number }) => 
                      percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {stats.sector_distribution.slice(0, 6).map((_, index) => {
                      const colors = ['#0A84FF', '#34C759', '#FF9F0A', '#5856D6', '#FF3B30', '#AF52DE'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 12,
                    }}
                    formatter={(value: number | undefined, _name: string | undefined, props: any) => [
                      value !== undefined ? `€${value.toLocaleString('it-IT')}` : '€0',
                      props.payload?.department_name || ''
                    ]}
                  />
                  <Legend 
                    formatter={(_value: string, entry: any) => 
                      `${entry.payload?.department_name || ''} (€${entry.payload?.total?.toLocaleString('it-IT') || '0'})`
                    }
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <FileText size={48} />
                <p>Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overview-recent-activity">
        <h3>Attività Recenti</h3>
        <div className="activity-list">
          {stats?.recent_activities && stats.recent_activities.length > 0 ? (
            stats.recent_activities.map((activity, index) => {
              const IconComponent = activity.icon === 'FileText' ? FileText : 
                                   activity.icon === 'TrendingUp' ? TrendingUp : 
                                   activity.icon === 'Users' ? Users : FileText;
              
              return (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <IconComponent size={16} />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta">{activity.description} • {activity.time_ago}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="activity-empty">
              <p>Nessuna attività recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;

