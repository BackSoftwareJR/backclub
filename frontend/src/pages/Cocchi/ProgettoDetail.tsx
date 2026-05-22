import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users as UsersIcon, Calendar as CalendarIcon } from 'lucide-react';
import './ProgettoDetail.css';

const ProgettoDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock data
    const progetto = {
        id,
        name: 'Progetto Alpha',
        cliente: 'Cliente XYZ',
        dataInizio: '2024-01-15',
        dataFine: '2024-12-31',
        totaleEntrate: 30000,
        totaleUscite: 15000,
        saldo: 15000,
        rateDaIncassare: [
            { id: 1, descrizione: 'Saldo finale 50%', importo: 15000, scadenza: '2025-01-15', stato: 'in_attesa' }
        ],
        teamMembers: [
            { id: 1, nome: 'Mario Rossi', ruolo: 'Developer', cocchiGuadagnati: 8000, cocchiPrevisti: 12000 },
            { id: 2, nome: 'Laura Verdi', ruolo: 'Designer', cocchiGuadagnati: 5000, cocchiPrevisti: 8000 },
        ],
        transazioni: [
            { id: 1, tipo: 'entrata', importo: 15000, data: '2024-12-20', descrizione: 'Acconto 50%' },
            { id: 2, tipo: 'uscita', importo: 3500, data: '2024-12-18', descrizione: 'Licenze software' },
        ]
    };

    const formatCocchi = (amount: number) => amount.toLocaleString('it-IT');

    return (
        <div className="progetto-detail">
            {/* Back Button */}
            <button className="btn-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
                Indietro
            </button>

            {/* Header */}
            <div className="detail-header">
                <div>
                    <h1>{progetto.name}</h1>
                    <p className="detail-subtitle">{progetto.cliente}</p>
                </div>
                <div className="detail-dates">
                    <CalendarIcon size={16} />
                    {new Date(progetto.dataInizio).toLocaleDateString('it-IT')} - {new Date(progetto.dataFine).toLocaleDateString('it-IT')}
                </div>
            </div>

            {/* Financial Summary */}
            <div className="financial-summary">
                <div className="financial-card">
                    <div className="financial-label">Entrate Totali</div>
                    <div className="financial-value positive">+{formatCocchi(progetto.totaleEntrate)}</div>
                </div>
                <div className="financial-card">
                    <div className="financial-label">Uscite Totali</div>
                    <div className="financial-value negative">−{formatCocchi(progetto.totaleUscite)}</div>
                </div>
                <div className="financial-card">
                    <div className="financial-label">Saldo</div>
                    <div className={`financial-value ${progetto.saldo >= 0 ? 'positive' : 'negative'}`}>
                        {formatCocchi(progetto.saldo)}
                    </div>
                </div>
            </div>

            {/* Rate da Incassare */}
            <div className="section-box">
                <h2 className="box-title">Rate da Incassare</h2>
                <div className="rate-list">
                    {progetto.rateDaIncassare.map(rata => (
                        <div key={rata.id} className="rata-item">
                            <div className="rata-left">
                                <div className="rata-desc">{rata.descrizione}</div>
                                <div className="rata-meta">
                                    Scadenza: {new Date(rata.scadenza).toLocaleDateString('it-IT')}
                                </div>
                            </div>
                            <div className="rata-importo">+{formatCocchi(rata.importo)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Team Members */}
            <div className="section-box">
                <h2 className="box-title">
                    <UsersIcon size={18} />
                    Team
                </h2>
                <div className="team-grid">
                    {progetto.teamMembers.map(member => (
                        <div key={member.id} className="member-card">
                            <div className="member-name">{member.nome}</div>
                            <div className="member-role">{member.ruolo}</div>
                            <div className="member-stats">
                                <div className="member-stat">
                                    <span className="stat-label-tiny">Guadagnati</span>
                                    <span className="stat-value-tiny">{formatCocchi(member.cocchiGuadagnati)}</span>
                                </div>
                                <div className="member-stat">
                                    <span className="stat-label-tiny">Previsti</span>
                                    <span className="stat-value-tiny">{formatCocchi(member.cocchiPrevisti)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transazioni Progetto */}
            <div className="section-box">
                <h2 className="box-title">Transazioni</h2>
                <div className="transactions-detail-list">
                    {progetto.transazioni.map(t => (
                        <div
                            key={t.id}
                            className="transaction-detail-row"
                            onClick={() => navigate(`/cocchi/transazione/${t.id}`)}
                        >
                            <div className="transaction-detail-left">
                                <div className="transaction-detail-desc">{t.descrizione}</div>
                                <div className="transaction-detail-meta">
                                    {new Date(t.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div className={`transaction-detail-amount ${t.tipo}`}>
                                {t.tipo === 'entrata' ? '+' : '−'}{formatCocchi(t.importo)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgettoDetail;
