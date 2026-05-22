import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseDashboardApi, type ExpenseKPIs, type CRMBox } from '../../api/expenses';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Clock,
    CreditCard,
    Calendar,
    Loader,
    Home,
    ChevronRight
} from 'lucide-react';
import './ExpenseDashboard.css';

const ExpenseDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<ExpenseKPIs | null>(null);
    const [crmBoxes, setCrmBoxes] = useState<CRMBox[]>([]);
    const [adminBox, setAdminBox] = useState<any>(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const [overviewRes, crmRes] = await Promise.all([
                expenseDashboardApi.getOverview(),
                expenseDashboardApi.getCRMBoxes(),
            ]);

            setKpis(overviewRes.data.kpis);
            setCrmBoxes(overviewRes.data.expenses_by_crm || crmRes.data);
            setAdminBox(overviewRes.data.administrative_expenses);
        } catch (err) {
            console.error('Errore caricamento dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="expense-dashboard">
                <div className="loading-container">
                    <Loader className="spinner" size={40} />
                    <p>Caricamento dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="expense-dashboard">
            {/* Header */}
            <div className="expense-dashboard-header">
                <h1>Gestione Spese Enterprise</h1>
                <p>Dashboard completa per admin e segreteria</p>
                <div className="header-actions">
                    <button className="btn-primary" onClick={() => navigate('/expenses/create')}>
                        <DollarSign size={18} />
                        Nuova Spesa
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {kpis && (
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <DollarSign size={24} />
                        </div>
                        <div className="kpi-content">
                            <p className="kpi-label">Totale Spese Mese</p>
                            <h3 className="kpi-value">€ {kpis.total_expenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                            <div className="kpi-trend">
                                {kpis.trend_percentage >= 0 ? (
                                    <TrendingUp size={16} color="#FF453A" />
                                ) : (
                                    <TrendingDown size={16} color="#34C759" />
                                )}
                                <span className={kpis.trend_percentage >= 0 ? 'trend-up' : 'trend-down'}>
                                    {Math.abs(kpis.trend_percentage)}% vs mese scorso
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)' }}>
                            <Clock size={24} />
                        </div>
                        <div className="kpi-content">
                            <p className="kpi-label">Pending</p>
                            <h3 className="kpi-value">€ {kpis.pending_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                            <span className="kpi-subtitle">{kpis.pending_count} transazioni</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #FF453A 0%, #FF2D55 100%)' }}>
                            <AlertCircle size={24} />
                        </div>
                        <div className="kpi-content">
                            <p className="kpi-label">Scaduti</p>
                            <h3 className="kpi-value">{kpis.overdue_count}</h3>
                            <span className="kpi-subtitle">€ {kpis.overdue_amount.toLocaleString('it-IT')}</span>
                        </div>
                    </div>

                    <div className="kpi-card" onClick={() => navigate('/expenses/reimbursements')} style={{ cursor: 'pointer' }}>
                        <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                            <DollarSign size={24} />
                        </div>
                        <div className="kpi-content">
                            <p className="kpi-label">Rimborsi da Approvare</p>
                            <h3 className="kpi-value">{kpis.reimbursements_pending}</h3>
                            <span className="kpi-subtitle">€ {kpis.reimbursements_amount.toLocaleString('it-IT')}</span>
                        </div>
                    </div>

                    <div className="kpi-card" onClick={() => navigate('/expenses/subscriptions')} style={{ cursor: 'pointer' }}>
                        <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #5AC8FA 100%)' }}>
                            <CreditCard size={24} />
                        </div>
                        <div className="kpi-content">
                            <p className="kpi-label">Abbonamenti Attivi</p>
                            <h3 className="kpi-value">{kpis.subscriptions_active}</h3>
                            <span className="kpi-subtitle">€ {kpis.subscriptions_monthly_cost.toLocaleString('it-IT')}/mese</span>
                        </div>
                    </div>
                </div>
            )}

            {/* CRM Boxes Section */}
            <div className="section-header">
                <h2>Spese per CRM</h2>
                <p>Visualizza e gestisci le spese per ogni dipartimento</p>
            </div>

            <div className="crm-boxes-grid">
                {crmBoxes.map((crm) => (
                    <div
                        key={crm.code}
                        className="crm-box"
                        onClick={() => navigate(`/uscite-cocchi/crm/${crm.code}`)}
                        style={{ 
                            borderLeft: `4px solid ${crm.color}`,
                            cursor: 'pointer'
                        }}
                    >
                        <div className="crm-box-header">
                            <div className="crm-icon" style={{ background: crm.color }}>
                                {crm.code[0]}
                            </div>
                            <h3>{crm.name}</h3>
                        </div>

                        <div className="crm-box-stats">
                            <div className="stat-row">
                                <span className="stat-label">Totale:</span>
                                <span className="stat-value">€ {crm.total_amount.toLocaleString('it-IT')}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Pending:</span>
                                <span className="stat-value pending">
                                    € {crm.pending_amount.toLocaleString('it-IT')}
                                    <span className="count">({crm.pending_count})</span>
                                </span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Pagato:</span>
                                <span className="stat-value paid">€ {crm.paid_amount.toLocaleString('it-IT')}</span>
                            </div>

                            {crm.next_payment_date && (
                                <div className="next-payment">
                                    <Calendar size={14} />
                                    <span>
                                        Prossima: {new Date(crm.next_payment_date).toLocaleDateString('it-IT')}
                                        {' - '}€ {crm.next_payment_amount?.toLocaleString('it-IT')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="crm-box-footer">
                            <span>Dettagli</span>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                ))}

                {/* Administrative Box */}
                {adminBox && (
                    <div
                        className="crm-box admin-box"
                        onClick={() => navigate('/expenses/administrative')}
                        style={{ 
                            borderLeft: '4px solid #8E8E93',
                            cursor: 'pointer'
                        }}
                    >
                        <div className="crm-box-header">
                            <div className="crm-icon" style={{ background: '#8E8E93' }}>
                                <Home size={20} color="#fff" />
                            </div>
                            <h3>Spese Amministrative</h3>
                        </div>

                        <div className="crm-box-stats">
                            <div className="stat-row">
                                <span className="stat-label">Totale:</span>
                                <span className="stat-value">€ {adminBox.total_amount.toLocaleString('it-IT')}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Pending:</span>
                                <span className="stat-value pending">
                                    € {adminBox.pending_amount.toLocaleString('it-IT')}
                                    <span className="count">({adminBox.pending_count})</span>
                                </span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Pagato:</span>
                                <span className="stat-value paid">€ {adminBox.paid_amount.toLocaleString('it-IT')}</span>
                            </div>
                        </div>

                        <div className="crm-box-footer">
                            <span>Affitti, utenze, abbonamenti aziendali</span>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <div className="quick-action-card" onClick={() => navigate('/expenses/reimbursements/pending')}>
                    <AlertCircle size={32} color="#FF9F0A" />
                    <h3>Approvazioni</h3>
                    <p>{kpis?.reimbursements_pending || 0} rimborsi in attesa</p>
                </div>

                <div className="quick-action-card" onClick={() => navigate('/expenses/subscriptions/expiring')}>
                    <Calendar size={32} color="#0A84FF" />
                    <h3>Rinnovi</h3>
                    <p>Abbonamenti in scadenza</p>
                </div>

                <div className="quick-action-card" onClick={() => navigate('/expenses/analytics')}>
                    <TrendingUp size={32} color="#34C759" />
                    <h3>Analytics</h3>
                    <p>Report e grafici</p>
                </div>
            </div>
        </div>
    );
};

export default ExpenseDashboard;

