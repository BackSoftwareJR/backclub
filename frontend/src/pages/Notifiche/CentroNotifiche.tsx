import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Check, Archive, Trash2, AlertCircle } from 'lucide-react';
import type { Notifica } from '../../types/notifica.ts';
import './CentroNotifiche.css';

const CentroNotifiche: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'tutte' | 'non_lette' | 'lette' | 'archiviate' | 'eliminate' | 'urgenti'>('tutte');
    const [swipedId, setSwipedId] = useState<number | null>(null);

    // Mock data
    const [notifiche, setNotifiche] = useState<Notifica[]>([
        {
            id: 1,
            tipo: 'task',
            avatar: 'MR',
            titolo: 'Mario Rossi',
            messaggio: 'ha completato il task "Design Homepage"',
            tempo: '2 ore fa',
            data: '2025-01-15T14:30:00',
            letta: false,
            archiviata: false,
            eliminata: false,
            urgente: false
        },
        {
            id: 2,
            tipo: 'pagamento',
            avatar: 'LV',
            titolo: 'Laura Verdi',
            messaggio: 'ha richiesto approvazione budget per Progetto Alpha',
            tempo: '5 ore fa',
            data: '2025-01-15T11:00:00',
            letta: false,
            archiviata: false,
            eliminata: false,
            urgente: true
        },
        {
            id: 3,
            tipo: 'team',
            avatar: 'GB',
            titolo: 'Giovanni Bianchi',
            messaggio: 'Nuovo cliente aggiunto al sistema',
            tempo: '1 giorno fa',
            data: '2025-01-14T09:00:00',
            letta: true,
            archiviata: false,
            eliminata: false,
            urgente: false
        },
        {
            id: 4,
            tipo: 'scadenza',
            avatar: undefined,
            titolo: 'Scadenza Progetto Beta',
            messaggio: 'Il progetto Beta scade tra 3 giorni',
            tempo: '2 giorni fa',
            data: '2025-01-13T10:00:00',
            letta: true,
            archiviata: true,
            eliminata: false,
            urgente: false
        },
    ]);

    const handleMarkAsRead = (id: number) => {
        setNotifiche(prev => prev.map(n =>
            n.id === id ? { ...n, letta: true } : n
        ));
        setSwipedId(null);
    };

    const handleArchive = (id: number) => {
        setNotifiche(prev => prev.map(n =>
            n.id === id ? { ...n, archiviata: true, letta: true } : n
        ));
        setSwipedId(null);
    };

    const handleDelete = (id: number) => {
        setNotifiche(prev => prev.map(n =>
            n.id === id ? { ...n, eliminata: true } : n
        ));
        setSwipedId(null);
    };

    const filteredNotifiche = notifiche.filter(n => {
        // Filter by status
        if (filterStatus === 'non_lette' && n.letta) return false;
        if (filterStatus === 'lette' && !n.letta) return false;
        if (filterStatus === 'archiviate' && !n.archiviata) return false;
        if (filterStatus === 'eliminate' && !n.eliminata) return false;
        if (filterStatus === 'urgenti' && !n.urgente) return false;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                n.titolo.toLowerCase().includes(query) ||
                n.messaggio.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const nonLetteCount = notifiche.filter(n => !n.letta && !n.eliminata).length;

    return (
        <div className="centro-notifiche">
            {/* Header */}
            <div className="centro-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Indietro
                </button>

                <div className="centro-title-section">
                    <h1>Centro Notifiche</h1>
                    {nonLetteCount > 0 && (
                        <span className="unread-count-badge">{nonLetteCount} non lette</span>
                    )}
                </div>
            </div>

            {/* Search & Filters */}
            <div className="centro-controls">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Cerca notifiche..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-tabs">
                    {[
                        { key: 'tutte', label: 'Tutte' },
                        { key: 'non_lette', label: 'Non lette' },
                        { key: 'lette', label: 'Lette' },
                        { key: 'urgenti', label: 'Urgenti' },
                        { key: 'archiviate', label: 'Archiviate' },
                        { key: 'eliminate', label: 'Eliminate' },
                    ].map(filter => (
                        <button
                            key={filter.key}
                            className={`filter-tab ${filterStatus === filter.key ? 'active' : ''}`}
                            onClick={() => setFilterStatus(filter.key as any)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List with Swipe */}
            <div className="notifiche-list-swipe">
                {filteredNotifiche.length === 0 ? (
                    <div className="empty-notifiche">
                        <p>Nessuna notifica trovata</p>
                    </div>
                ) : (
                    filteredNotifiche.map(notifica => (
                        <div
                            key={notifica.id}
                            className={`notifica-swipe-wrapper ${swipedId === notifica.id ? 'swiped' : ''}`}
                        >
                            {/* Swipe Actions */}
                            <div className="swipe-actions">
                                {!notifica.letta && (
                                    <button
                                        className="swipe-action read"
                                        onClick={() => handleMarkAsRead(notifica.id)}
                                    >
                                        <Check size={18} />
                                    </button>
                                )}
                                {!notifica.archiviata && (
                                    <button
                                        className="swipe-action archive"
                                        onClick={() => handleArchive(notifica.id)}
                                    >
                                        <Archive size={18} />
                                    </button>
                                )}
                                <button
                                    className="swipe-action delete"
                                    onClick={() => handleDelete(notifica.id)}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Notification Card */}
                            <div
                                className={`notifica-card-swipe ${!notifica.letta ? 'unread' : ''} ${notifica.urgente ? 'urgent' : ''} ${notifica.archiviata ? 'archived' : ''} ${notifica.eliminata ? 'deleted' : ''}`}
                                onClick={() => {
                                    if (swipedId === notifica.id) {
                                        setSwipedId(null);
                                    } else {
                                        navigate(`/notifiche/${notifica.id}`);
                                    }
                                }}
                                onTouchStart={() => setSwipedId(notifica.id)}
                            >
                                {notifica.avatar && (
                                    <div className="notifica-avatar">{notifica.avatar}</div>
                                )}
                                <div className="notifica-body">
                                    <div className="notifica-top">
                                        <span className="notifica-titolo">{notifica.titolo}</span>
                                        <span className="notifica-tempo">{notifica.tempo}</span>
                                    </div>
                                    <div className="notifica-messaggio">{notifica.messaggio}</div>
                                    {notifica.urgente && (
                                        <div className="urgent-badge">
                                            <AlertCircle size={12} />
                                            Urgente
                                        </div>
                                    )}
                                </div>
                                {!notifica.letta && !notifica.archiviata && !notifica.eliminata && (
                                    <div className="unread-dot" />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CentroNotifiche;
