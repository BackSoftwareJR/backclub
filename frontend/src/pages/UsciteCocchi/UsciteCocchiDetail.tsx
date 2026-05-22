import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usciteCocchiApi } from '../../api/usciteCocchi';
import {
    Briefcase,
    Users,
    TrendingUp,
    ArrowRight,
    Loader
} from 'lucide-react';
import './UsciteCocchiDetail.css';

const UsciteCocchiDetail: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const response = await usciteCocchiApi.getQuickStats();
            setStats(response.data);
        } catch (err: any) {
            console.error('Errore caricamento stats:', err);
            // Use fallback data if API not available
            setStats({
                total_pending: 0,
                total_paid: 0,
                count_pending: 0,
                count_paid: 0,
                total: 0,
                count_total: 0
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="uscite-detail-page">
                <div className="loading-container">
                    <Loader className="spinner" size={40} />
                    <p>Caricamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="uscite-detail-page">
            {/* Header */}
            <div className="uscite-detail-header">
                <h1>Gestione Uscite Cocchi Avanzata</h1>
                <p>Analisi completa delle spese per CRM e Utenti</p>
            </div>

            {/* Quick Stats */}
            {stats && stats.total > 0 && (
                <div className="uscite-quick-stats">
                    <div className="quick-stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Totale Spese</p>
                            <h3 className="stat-value">€ {stats.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    <div className="quick-stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Pending</p>
                            <h3 className="stat-value">€ {stats.total_pending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                            <span className="stat-count">{stats.count_pending} transazioni</span>
                        </div>
                    </div>

                    <div className="quick-stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Pagato</p>
                            <h3 className="stat-value">€ {stats.total_paid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                            <span className="stat-count">{stats.count_paid} transazioni</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Sections */}
            <div className="uscite-main-sections">
                {/* Spese CRM Box */}
                <div
                    className="section-box crm-section"
                    onClick={() => navigate('/uscite-cocchi/crm')}
                >
                    <div className="section-icon">
                        <Briefcase size={48} />
                    </div>
                    <div className="section-content">
                        <h2>Spese CRM</h2>
                        <p>Visualizza e gestisci le spese per ogni dipartimento CRM</p>
                        <ul className="section-features">
                            <li>Dashboard completa per CRM</li>
                            <li>Calendario pagamenti</li>
                            <li>Spese ricorrenti</li>
                            <li>Analisi dettagliate</li>
                        </ul>
                    </div>
                    <div className="section-arrow">
                        <ArrowRight size={32} />
                    </div>
                </div>

                {/* Utenti Box */}
                <div
                    className="section-box users-section"
                    onClick={() => navigate('/uscite-cocchi/users')}
                >
                    <div className="section-icon">
                        <Users size={48} />
                    </div>
                    <div className="section-content">
                        <h2>Utenti</h2>
                        <p>Monitora i pagamenti e le spese per ogni utente</p>
                        <ul className="section-features">
                            <li>Profili utente completi</li>
                            <li>Ricerca AJAX veloce</li>
                            <li>Storico pagamenti</li>
                            <li>Statistiche personali</li>
                        </ul>
                    </div>
                    <div className="section-arrow">
                        <ArrowRight size={32} />
                    </div>
                </div>
            </div>

            <div className="analytics-banner" onClick={() => navigate('/uscite-cocchi/analytics')}>
                <div className="analytics-content">
                    <h3>Dashboard Analitica</h3>
                    <p>Visualizza grafici, KPI e statistiche avanzate</p>
                </div>
                <ArrowRight size={24} />
            </div>
        </div>
    );
};

export default UsciteCocchiDetail;
