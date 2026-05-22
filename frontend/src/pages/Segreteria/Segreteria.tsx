import React, { useState } from 'react';
import { Plus, Download, Calendar, FileText, Euro, TrendingUp, TrendingDown } from 'lucide-react';
import './Segreteria.css';

interface Fattura {
    id: number;
    numero: string;
    cliente: string;
    importo: number;
    data: string;
    scadenza: string;
    stato: 'pagata' | 'pending' | 'scaduta';
    tipo: 'entrata' | 'uscita';
}

interface Pagamento {
    id: number;
    descrizione: string;
    importo: number;
    data: string;
    metodo: 'bonifico' | 'carta' | 'contanti' | 'assegno';
    stato: 'completato' | 'pending';
}

interface Appuntamento {
    id: number;
    titolo: string;
    cliente: string;
    data: string;
    ora: string;
    tipo: 'riunione' | 'consulenza' | 'firma' | 'altro';
}

const Segreteria: React.FC = () => {
    const [filterFatture, setFilterFatture] = useState<'tutte' | 'entrata' | 'uscita'>('tutte');
    const [filterStato, setFilterStato] = useState<'tutte' | 'pagata' | 'pending' | 'scaduta'>('tutte');

    // Mock data
    const fatture: Fattura[] = [
        { id: 1, numero: 'FATT-2025-001', cliente: 'Tech Solutions SRL', importo: 15000, data: '2025-01-15', scadenza: '2025-02-15', stato: 'pending', tipo: 'entrata' },
        { id: 2, numero: 'FATT-2025-002', cliente: 'Startup Innovativa', importo: 8500, data: '2025-01-10', scadenza: '2025-02-10', stato: 'pagata', tipo: 'entrata' },
        { id: 3, numero: 'SPESA-2025-001', cliente: 'Fornitore Software', importo: 3500, data: '2025-01-12', scadenza: '2025-01-27', stato: 'scaduta', tipo: 'uscita' },
    ];

    const pagamenti: Pagamento[] = [
        { id: 1, descrizione: 'Pagamento FATT-2025-002', importo: 8500, data: '2025-01-20', metodo: 'bonifico', stato: 'completato' },
        { id: 2, descrizione: 'Acconto progetto Alpha', importo: 5000, data: '2025-01-22', metodo: 'bonifico', stato: 'pending' },
    ];

    const appuntamenti: Appuntamento[] = [
        { id: 1, titolo: 'Riunione progetto Beta', cliente: 'Enterprise Group', data: '2025-01-25', ora: '10:00', tipo: 'riunione' },
        { id: 2, titolo: 'Firma contratto', cliente: 'Nuovo Cliente SRL', data: '2025-01-26', ora: '15:30', tipo: 'firma' },
        { id: 3, titolo: 'Consulenza tecnica', cliente: 'Tech Solutions', data: '2025-01-27', ora: '14:00', tipo: 'consulenza' },
    ];

    const filteredFatture = fatture.filter(f => {
        if (filterFatture !== 'tutte' && f.tipo !== filterFatture) return false;
        if (filterStato !== 'tutte' && f.stato !== filterStato) return false;
        return true;
    });

    const totaleEntrate = fatture.filter(f => f.tipo === 'entrata').reduce((sum, f) => sum + f.importo, 0);
    const totaleUscite = fatture.filter(f => f.tipo === 'uscita').reduce((sum, f) => sum + f.importo, 0);
    const saldo = totaleEntrate - totaleUscite;
    const pagamentiPending = pagamenti.filter(p => p.stato === 'pending').reduce((sum, p) => sum + p.importo, 0);

    const formatCurrency = (amount: number) => `${amount.toLocaleString('it-IT')} cocchi`;

    const getStatoColor = (stato: string) => {
        switch (stato) {
            case 'pagata':
            case 'completato':
                return 'success';
            case 'pending':
                return 'warning';
            case 'scaduta':
                return 'danger';
            default:
                return '';
        }
    };

    return (
        <div className="segreteria-page">

            {/* Header */}
            <div className="segreteria-header">
                <div>
                    <h1>Segreteria</h1>
                    <p className="subtitle">Gestione completa entrate, spese, fatture e appuntamenti</p>
                </div>
                <div className="header-actions-seg">
                    <button className="btn-secondary-seg">
                        <Download size={18} />
                        Esporta
                    </button>
                    <button className="btn-add">
                        <Plus size={18} />
                        Nuova Fattura
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="overview-grid">
                <div className="overview-card entrate">
                    <div className="card-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="card-content">
                        <div className="card-label">Entrate Totali</div>
                        <div className="card-value">{formatCurrency(totaleEntrate)}</div>
                    </div>
                </div>

                <div className="overview-card uscite">
                    <div className="card-icon">
                        <TrendingDown size={24} />
                    </div>
                    <div className="card-content">
                        <div className="card-label">Uscite Totali</div>
                        <div className="card-value">{formatCurrency(totaleUscite)}</div>
                    </div>
                </div>

                <div className="overview-card saldo">
                    <div className="card-icon">
                        <Euro size={24} />
                    </div>
                    <div className="card-content">
                        <div className="card-label">Saldo</div>
                        <div className={`card-value ${saldo >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(saldo)}
                        </div>
                    </div>
                </div>

                <div className="overview-card pending">
                    <div className="card-icon">
                        <FileText size={24} />
                    </div>
                    <div className="card-content">
                        <div className="card-label">Pagamenti Pending</div>
                        <div className="card-value">{formatCurrency(pagamentiPending)}</div>
                    </div>
                </div>
            </div>

            {/* Fatture Section */}
            <div className="section-container">
                <div className="section-header">
                    <h2>Fatture</h2>
                    <div className="filters-seg">
                        <select
                            value={filterFatture}
                            onChange={(e) => setFilterFatture(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="tutte">Tutte</option>
                            <option value="entrate">Entrate</option>
                            <option value="uscite">Uscite</option>
                        </select>
                        <select
                            value={filterStato}
                            onChange={(e) => setFilterStato(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="tutte">Tutti gli stati</option>
                            <option value="pagata">Pagate</option>
                            <option value="pending">Pending</option>
                            <option value="scaduta">Scadute</option>
                        </select>
                    </div>
                </div>

                <div className="fatture-list">
                    {filteredFatture.map(fattura => (
                        <div key={fattura.id} className={`fattura-card ${fattura.tipo}`}>
                            <div className="fattura-main">
                                <div className="fattura-numero">{fattura.numero}</div>
                                <div className="fattura-cliente">{fattura.cliente}</div>
                            </div>
                            <div className="fattura-details">
                                <div className="detail-item">
                                    <span className="label">Importo:</span>
                                    <span className={`value ${fattura.tipo}`}>{formatCurrency(fattura.importo)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Emissione:</span>
                                    <span className="value">{new Date(fattura.data).toLocaleDateString('it-IT')}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Scadenza:</span>
                                    <span className="value">{new Date(fattura.scadenza).toLocaleDateString('it-IT')}</span>
                                </div>
                            </div>
                            <div className={`stato-badge ${getStatoColor(fattura.stato)}`}>
                                {fattura.stato}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Two Column: Pagamenti + Appuntamenti */}
            <div className="two-col-seg">
                {/* Pagamenti */}
                <div className="section-container">
                    <div className="section-header">
                        <h3>Pagamenti Recenti</h3>
                    </div>
                    <div className="pagamenti-list">
                        {pagamenti.map(pag => (
                            <div key={pag.id} className="pagamento-item">
                                <div className="pag-info">
                                    <div className="pag-desc">{pag.descrizione}</div>
                                    <div className="pag-meta">
                                        {pag.metodo} • {new Date(pag.data).toLocaleDateString('it-IT')}
                                    </div>
                                </div>
                                <div className="pag-right">
                                    <div className="pag-amount">{formatCurrency(pag.importo)}</div>
                                    <div className={`pag-stato ${getStatoColor(pag.stato)}`}>{pag.stato}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Appuntamenti */}
                <div className="section-container">
                    <div className="section-header">
                        <h3>Prossimi Appuntamenti</h3>
                        <button className="btn-icon-seg">
                            <Calendar size={18} />
                        </button>
                    </div>
                    <div className="appuntamenti-list">
                        {appuntamenti.map(app => (
                            <div key={app.id} className="appuntamento-item">
                                <div className="app-date">
                                    <div className="date-day">{new Date(app.data).getDate()}</div>
                                    <div className="date-month">
                                        {new Date(app.data).toLocaleDateString('it-IT', { month: 'short' })}
                                    </div>
                                </div>
                                <div className="app-info">
                                    <div className="app-title">{app.titolo}</div>
                                    <div className="app-meta">
                                        {app.cliente} • {app.ora}
                                    </div>
                                </div>
                                <div className="app-tipo">{app.tipo}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Segreteria;
