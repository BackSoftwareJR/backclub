import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usciteCocchiApi, type CrmExpenseSummary } from '../../api/usciteCocchi';
import {
    Briefcase,
    TrendingUp,
    Calendar,
    Loader,
    ArrowLeft,
    DollarSign
} from 'lucide-react';
import './UsciteCocchiCrmDashboard.css';

const UsciteCocchiCrmDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [crmList, setCrmList] = useState<CrmExpenseSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCrmData();
    }, []);

    const loadCrmData = async () => {
        try {
            setLoading(true);
            const response = await usciteCocchiApi.getCrmList();
            // Ensure data is an array
            const data = Array.isArray(response.data) ? response.data : [];
            setCrmList(data);
        } catch (err: any) {
            console.error('Errore caricamento CRM:', err);
            setError(err.message || 'Errore nel caricamento dati');
        } finally {
            setLoading(false);
        }
    };

    const getCrmColor = (code: string) => {
        const colors: { [key: string]: string } = {
            'CASA_FAMIGLIA': '#FF6B6B',
            'SITI_WEB': '#4ECDC4',
            'CRM_PM': '#45B7D1',
            'GESTIONE_CLIENTI': '#96CEB4',
            'CRM_GESTIONALI': '#FFEAA7',
            'DIGITALIZZAZIONE': '#DFE6E9',
            'RISORSE_UMANE': '#74B9FF',
            'VIDEO_GRAFICA': '#A29BFE',
            'SMART_WORKING': '#FD79A8',
            'ADS_CENTER': '#FDCB6E',
            'SEGRETERIA': '#55EFC4',
        };
        return colors[code] || '#0A84FF';
    };

    if (loading) {
        return (
            <div className="uscite-crm-dashboard">
                <div className="loading-container">
                    <Loader className="spinner" size={40} />
                    <p>Caricamento CRM...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="uscite-crm-dashboard">
                <div className="error-container">
                    <p>Errore: {error}</p>
                    <button onClick={loadCrmData}>Riprova</button>
                </div>
            </div>
        );
    }

    // Empty state
    if (!loading && !error && crmList.length === 0) {
        return (
            <div className="uscite-crm-dashboard">
                <div className="uscite-crm-header">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                        Indietro
                    </button>
                    <h1>Spese per CRM</h1>
                </div>
                <div className="error-container">
                    <Briefcase size={48} style={{ opacity: 0.3 }} />
                    <p>Nessun CRM con spese trovato</p>
                    <p style={{ fontSize: '14px', opacity: 0.7 }}>
                        Aggiungi delle spese con un codice CRM per vederle qui
                    </p>
                </div>
            </div>
        );
    }

    // Safe reduce with default values
    const totalAmount = crmList.reduce((sum, crm) => sum + (crm.total_amount || 0), 0);
    const totalPending = crmList.reduce((sum, crm) => sum + (crm.pending_amount || 0), 0);
    const totalPaid = crmList.reduce((sum, crm) => sum + (crm.paid_amount || 0), 0);

    return (
        <div className="uscite-crm-dashboard">
            {/* Header */}
            <div className="uscite-crm-header">
                <button className="btn-back" onClick={() => navigate('/uscite-cocchi-detail')}>
                    <ArrowLeft size={18} />
                    Indietro
                </button>
                <h1>Spese per CRM</h1>
            </div>

            {/* Summary KPIs */}
            <div className="uscite-crm-kpis">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Totale Spese</p>
                        <h3 className="kpi-value">€ {totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Pending</p>
                        <h3 className="kpi-value">€ {totalPending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                        <Briefcase size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Pagato</p>
                        <h3 className="kpi-value">€ {totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            {/* CRM Grid */}
            <div className="uscite-crm-grid">
                {crmList.map((crm) => (
                    <div
                        key={crm.code}
                        className="uscite-crm-card"
                        onClick={() => navigate(`/uscite-cocchi/crm/${crm.code}`)}
                        style={{ borderColor: getCrmColor(crm.code) }}
                    >
                        <div
                            className="crm-card-header"
                            style={{
                                background: `linear-gradient(135deg, ${getCrmColor(crm.code)}20 0%, ${getCrmColor(crm.code)}10 100%)`
                            }}
                        >
                            <div className="crm-icon" style={{ background: getCrmColor(crm.code) }}>
                                <Briefcase size={24} color="#fff" />
                            </div>
                            <h3 className="crm-name">{crm.name}</h3>
                        </div>

                        <div className="crm-card-body">
                            <div className="crm-stat-row">
                                <span className="stat-label">Totale:</span>
                                <span className="stat-value">€ {crm.total_amount.toLocaleString('it-IT')}</span>
                            </div>
                            <div className="crm-stat-row">
                                <span className="stat-label">Pending:</span>
                                <span className="stat-value pending">€ {crm.pending_amount.toLocaleString('it-IT')}</span>
                            </div>
                            <div className="crm-stat-row">
                                <span className="stat-label">Pagato:</span>
                                <span className="stat-value paid">€ {crm.paid_amount.toLocaleString('it-IT')}</span>
                            </div>
                            <div className="crm-stat-row">
                                <span className="stat-label">Transazioni:</span>
                                <span className="stat-value">{crm.count}</span>
                            </div>

                            {crm.next_payment_date && (
                                <div className="next-payment">
                                    <Calendar size={14} />
                                    <span>
                                        Prossimo: {new Date(crm.next_payment_date).toLocaleDateString('it-IT')}
                                        {' - '}€ {crm.next_payment_amount?.toLocaleString('it-IT')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UsciteCocchiCrmDashboard;
