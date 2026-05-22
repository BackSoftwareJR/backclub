import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, List, CreditCard, Wallet, CheckCircle, FileText } from 'lucide-react';
import { invoicesApi } from '../../api/invoices';
import InvoiceCalendarTab from './InvoiceCalendarTab';
import InvoiceListTab from './InvoiceListTab';
import PaymentPlansTab from './PaymentPlansTab';
import './FatturePage.css';

type TabType = 'calendario' | 'lista' | 'piani';

interface InvoiceStats {
  to_settle_count: number;
  to_settle_total: number;
  paid_count: number;
  paid_total: number;
  paid_this_month_count: number;
  paid_this_month_total: number;
  to_issue_count: number;
}

const FatturePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['calendario', 'lista', 'piani'].includes(tabParam) ? tabParam : 'calendario'
  );
  const [stats, setStats] = useState<InvoiceStats | null>(null);

  const loadStats = async () => {
    try {
      const res = await invoicesApi.getStats();
      setStats(res?.data ?? null);
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Aggiorna il tab quando cambia il parametro URL
  useEffect(() => {
    if (tabParam && ['calendario', 'lista', 'piani'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

  // Aggiorna l'URL quando cambia il tab
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'calendario' as TabType, label: 'Calendario', icon: Calendar },
    { id: 'lista' as TabType, label: 'Lista', icon: List },
    { id: 'piani' as TabType, label: 'Piani di Pagamento', icon: CreditCard },
  ];

  return (
    <div className="segreteria-fatture-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Fatture</h1>
          <p className="venditori-page-subtitle">Gestisci fatture, rate e piani di pagamento</p>
        </div>
      </div>

      {/* KPI Fatture */}
      {stats && (
        <div className="fatture-kpi-grid">
          <div className="fatture-kpi-card fatture-kpi-warning">
            <div className="fatture-kpi-icon">
              <Wallet size={22} />
            </div>
            <div className="fatture-kpi-content">
              <div className="fatture-kpi-label">Da incassare</div>
              <div className="fatture-kpi-value">{formatCurrency(stats.to_settle_total)}</div>
              <div className="fatture-kpi-sub">{stats.to_settle_count} fatture</div>
            </div>
          </div>
          <div className="fatture-kpi-card fatture-kpi-success">
            <div className="fatture-kpi-icon">
              <CheckCircle size={22} />
            </div>
            <div className="fatture-kpi-content">
              <div className="fatture-kpi-label">Incassate (totale)</div>
              <div className="fatture-kpi-value">{formatCurrency(stats.paid_total)}</div>
              <div className="fatture-kpi-sub">{stats.paid_count} fatture</div>
            </div>
          </div>
          <div className="fatture-kpi-card fatture-kpi-info">
            <div className="fatture-kpi-icon">
              <CheckCircle size={22} />
            </div>
            <div className="fatture-kpi-content">
              <div className="fatture-kpi-label">Incassate questo mese</div>
              <div className="fatture-kpi-value">{formatCurrency(stats.paid_this_month_total)}</div>
              <div className="fatture-kpi-sub">{stats.paid_this_month_count} fatture</div>
            </div>
          </div>
          <div className="fatture-kpi-card fatture-kpi-neutral">
            <div className="fatture-kpi-icon">
              <FileText size={22} />
            </div>
            <div className="fatture-kpi-content">
              <div className="fatture-kpi-label">Da emettere</div>
              <div className="fatture-kpi-value">{stats.to_issue_count}</div>
              <div className="fatture-kpi-sub">rate in attesa</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="fatture-tabs-navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`fatture-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="fatture-tab-content">
        {activeTab === 'calendario' && <InvoiceCalendarTab />}
        {activeTab === 'lista' && <InvoiceListTab onStatsRefresh={loadStats} />}
        {activeTab === 'piani' && <PaymentPlansTab />}
      </div>
    </div>
  );
};

export default FatturePage;
