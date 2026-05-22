import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import './UsciteCocchiAnalytics.css';

const UsciteCocchiAnalytics: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="uscite-analytics-page">
            <div className="analytics-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Indietro
                </button>
                <h1>Dashboard Analitica</h1>
            </div>

            <div className="analytics-content">
                <div className="icon-wrapper">
                    <BarChart3 size={80} />
                </div>
                <h2>Analytics Dashboard</h2>
                <p>Questa sezione è in fase di sviluppo.</p>
                <p>Funzionalità previste:</p>
                <ul>
                    <li>KPI cards (Totale, Media, Trend)</li>
                    <li>Grafici temporali (settimanale, mensile, custom)</li>
                    <li>Pie chart per tipologie spese</li>
                    <li>Bar chart per CRM e Utenti</li>
                    <li>Tabelle breakdown dettagliate</li>
                    <li>Export dati (CSV/PDF)</li>
                </ul>
            </div>
        </div>
    );
};

export default UsciteCocchiAnalytics;
