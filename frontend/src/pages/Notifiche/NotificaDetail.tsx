import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Archive, Trash2, AlertCircle, Clock } from 'lucide-react';
import './NotificaDetail.css';

const NotificaDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock data
    const notifica = {
        id: Number(id),
        tipo: 'pagamento',
        avatar: 'LV',
        titolo: 'Laura Verdi',
        messaggio: 'ha richiesto approvazione budget per Progetto Alpha',
        tempo: '5 ore fa',
        data: '2025-01-15T11:00:00',
        dettaglio: 'Laura Verdi ha inviato una richiesta di approvazione per un budget aggiuntivo di 5.000 cocchi per il Progetto Alpha. La richiesta include costi per licenze software e consulenze esterne.',
        letta: false,
        urgente: true,
        azioni: [
            { label: 'Approva Budget', url: '/cocchi/approva/123' },
            { label: 'Vedi Progetto', url: '/progetti/alpha' }
        ]
    };

    return (
        <div className="notifica-detail-page">
            {/* Header */}
            <button className="btn-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
                Indietro
            </button>

            {/* Main Card */}
            <div className="notifica-detail-card">
                {/* Header with Avatar */}
                <div className="detail-header-notifica">
                    {notifica.avatar && (
                        <div className="detail-avatar">{notifica.avatar}</div>
                    )}
                    <div className="detail-header-text">
                        <h1 className="detail-titolo">{notifica.titolo}</h1>
                        <div className="detail-meta">
                            <Clock size={14} />
                            {notifica.tempo}
                        </div>
                    </div>
                    {notifica.urgente && (
                        <div className="urgent-badge-large">
                            <AlertCircle size={14} />
                            Urgente
                        </div>
                    )}
                </div>

                {/* Message */}
                <div className="detail-message-section">
                    <p className="detail-message">{notifica.messaggio}</p>
                    {notifica.dettaglio && (
                        <div className="detail-description">
                            <h3>Dettagli</h3>
                            <p>{notifica.dettaglio}</p>
                        </div>
                    )}
                </div>

                {/* Actions Links */}
                {notifica.azioni && notifica.azioni.length > 0 && (
                    <div className="detail-actions-section">
                        <h3>Azioni</h3>
                        <div className="action-buttons">
                            {notifica.azioni.map((azione, index) => (
                                <button
                                    key={index}
                                    className="action-button"
                                    onClick={() => navigate(azione.url)}
                                >
                                    {azione.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-bar">
                <button className="quick-action-btn read">
                    <Check size={18} />
                    Segna come letta
                </button>
                <button className="quick-action-btn archive">
                    <Archive size={18} />
                    Archivia
                </button>
                <button className="quick-action-btn delete">
                    <Trash2 size={18} />
                    Elimina
                </button>
            </div>
        </div>
    );
};

export default NotificaDetail;
