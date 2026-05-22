import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HelpCircle,
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    User,
    Calendar,
    Loader2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { supportTicketsApi, type SupportTicket } from '../../api/supportTickets';
import './GestioneSupporto.css';

const GestioneSupporto: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [requests, setRequests] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<SupportTicket | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [modalStatus, setModalStatus] = useState<string>('');
    const [modalPriority, setModalPriority] = useState<string>('');
    const [modalResponse, setModalResponse] = useState('');
    const [saving, setSaving] = useState(false);

    const debouncedSearch = useMemo(() => {
        let t: ReturnType<typeof setTimeout>;
        return (term: string, cb: (v: string) => void) => {
            clearTimeout(t);
            t = setTimeout(() => cb(term), 400);
        };
    }, []);
    const [appliedSearch, setAppliedSearch] = useState('');

    useEffect(() => {
        debouncedSearch(searchTerm, setAppliedSearch);
    }, [searchTerm, debouncedSearch]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (priorityFilter !== 'all') params.priority = priorityFilter;
            if (appliedSearch.trim()) params.search = appliedSearch.trim();
            const data = await supportTicketsApi.getAllTickets(params);
            setRequests(data);
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : null;
            setError(msg || 'Errore nel caricamento dei ticket.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, priorityFilter, appliedSearch]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        if (selectedRequest) {
            setModalStatus(selectedRequest.status);
            setModalPriority(selectedRequest.priority);
            setModalResponse(selectedRequest.response ?? '');
        }
    }, [selectedRequest]);

    const getStatusBadge = (status: string) => {
        const badges = {
            aperto: { icon: AlertCircle, label: 'Aperto', class: 'status-aperto' },
            in_lavorazione: { icon: Clock, label: 'In Lavorazione', class: 'status-lavorazione' },
            risolto: { icon: CheckCircle, label: 'Risolto', class: 'status-risolto' },
            chiuso: { icon: XCircle, label: 'Chiuso', class: 'status-chiuso' }
        };
        return badges[status as keyof typeof badges] || badges.aperto;
    };

    const getPriorityBadge = (priority: string) => {
        const badges = {
            bassa: { label: 'Bassa', class: 'priority-bassa' },
            media: { label: 'Media', class: 'priority-media' },
            alta: { label: 'Alta', class: 'priority-alta' },
            urgente: { label: 'Urgente', class: 'priority-urgente' }
        };
        return badges[priority as keyof typeof badges] || badges.media;
    };

    const getCategoryLabel = (category: string) => {
        const labels: { [key: string]: string } = {
            amministrazione: 'Amministrazione',
            'sales-kit': 'Sales Kit',
            contrattualistica: 'Contrattualistica',
            tecnico: 'Tecnico',
            sicurezza: 'Sicurezza'
        };
        return labels[category] || category;
    };

    const stats = {
        total: requests.length,
        aperti: requests.filter(r => r.status === 'aperto').length,
        in_lavorazione: requests.filter(r => r.status === 'in_lavorazione').length,
        risolti: requests.filter(r => r.status === 'risolto').length,
        urgenti: requests.filter(r => r.priority === 'urgente').length
    };

    const handleRequestClick = (request: SupportTicket) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    };

    const handleSaveModal = async () => {
        if (!selectedRequest) return;
        setSaving(true);
        try {
            const updated = await supportTicketsApi.updateTicket(selectedRequest.id, {
                status: modalStatus as SupportTicket['status'],
                priority: modalPriority as SupportTicket['priority'],
                response: modalResponse.trim() || undefined,
            });
            setSelectedRequest(updated);
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
        } catch (err) {
            alert('Errore nel salvataggio. Riprova.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`gestione-supporto-page ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
            {/* Header */}
            <div className="gestione-supporto-header">
                <div>
                    <h1>Gestione Supporto</h1>
                    <p className="subtitle">Gestisci le richieste di supporto dai venditori</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="gestione-supporto-stats">
                <div className="stat-card">
                    <HelpCircle size={20} />
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Totale Richieste</div>
                    </div>
                </div>
                <div className="stat-card stat-aperto">
                    <AlertCircle size={20} />
                    <div>
                        <div className="stat-value">{stats.aperti}</div>
                        <div className="stat-label">Aperte</div>
                    </div>
                </div>
                <div className="stat-card stat-lavorazione">
                    <Clock size={20} />
                    <div>
                        <div className="stat-value">{stats.in_lavorazione}</div>
                        <div className="stat-label">In Lavorazione</div>
                    </div>
                </div>
                <div className="stat-card stat-risolto">
                    <CheckCircle size={20} />
                    <div>
                        <div className="stat-value">{stats.risolti}</div>
                        <div className="stat-label">Risolte</div>
                    </div>
                </div>
                <div className="stat-card stat-urgente">
                    <AlertCircle size={20} />
                    <div>
                        <div className="stat-value">{stats.urgenti}</div>
                        <div className="stat-label">Urgenti</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="gestione-supporto-error" role="alert">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="gestione-supporto-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca per venditore, oggetto o messaggio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={16} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tutti gli stati</option>
                        <option value="aperto">Aperto</option>
                        <option value="in_lavorazione">In Lavorazione</option>
                        <option value="risolto">Risolto</option>
                        <option value="chiuso">Chiuso</option>
                    </select>
                </div>
                <div className="filter-group">
                    <FileText size={16} />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Tutte le categorie</option>
                        <option value="amministrazione">Amministrazione</option>
                        <option value="sales-kit">Sales Kit</option>
                        <option value="contrattualistica">Contrattualistica</option>
                        <option value="tecnico">Tecnico</option>
                        <option value="sicurezza">Sicurezza</option>
                    </select>
                </div>
                <div className="filter-group">
                    <AlertCircle size={16} />
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option value="all">Tutte le priorità</option>
                        <option value="urgente">Urgente</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="bassa">Bassa</option>
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="gestione-supporto-table-container">
                <table className="gestione-supporto-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Venditore</th>
                            <th>Categoria</th>
                            <th>Oggetto</th>
                            <th>Priorità</th>
                            <th>Stato</th>
                            <th>Data</th>
                            <th>Assegnato a</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="empty-state">
                                    <Loader2 size={48} className="spin" />
                                    <p>Caricamento...</p>
                                </td>
                            </tr>
                        ) : requests.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="empty-state">
                                    <HelpCircle size={48} />
                                    <p>Nessuna richiesta trovata</p>
                                </td>
                            </tr>
                        ) : (
                            requests.map((request) => {
                                const statusBadge = getStatusBadge(request.status);
                                const priorityBadge = getPriorityBadge(request.priority);
                                const StatusIcon = statusBadge.icon;

                                return (
                                    <tr
                                        key={request.id}
                                        className="request-row"
                                        onClick={() => handleRequestClick(request)}
                                    >
                                        <td>#{request.id}</td>
                                        <td>
                                            <div className="seller-info">
                                                <User size={16} />
                                                <div>
                                                    <div className="seller-name">{request.seller_name ?? '—'}</div>
                                                    <div className="seller-email">{request.seller_email ?? ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="category-badge">
                                                {getCategoryLabel(request.category ?? '')}
                                            </span>
                                        </td>
                                        <td className="subject-cell">{request.subject ?? '—'}</td>
                                        <td>
                                            <span className={`priority-badge ${priorityBadge.class}`}>
                                                {priorityBadge.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusBadge.class}`}>
                                                <StatusIcon size={14} />
                                                {statusBadge.label}
                                            </span>
                                        </td>
                                        <td>{formatDate(request.created_at)}</td>
                                        <td>
                                            {request.assigned_to_name ? (
                                                <span className="assigned-badge">{request.assigned_to_name}</span>
                                            ) : (
                                                <span className="unassigned">Non assegnato</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequestClick(request);
                                                }}
                                            >
                                                Visualizza
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Dettaglio Richiesta #{selectedRequest.id}</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Informazioni Richiesta</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Venditore</label>
                                        <div className="seller-info">
                                            <User size={16} />
                                            <div>
                                                <div>{selectedRequest.seller_name}</div>
                                                <div className="detail-value-secondary">{selectedRequest.seller_email}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <label>Categoria</label>
                                        <span className="category-badge">
                                            {getCategoryLabel(selectedRequest.category ?? '')}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Priorità</label>
                                        <span className={`priority-badge ${getPriorityBadge(selectedRequest.priority).class}`}>
                                            {getPriorityBadge(selectedRequest.priority).label}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Stato</label>
                                        <span className={`status-badge ${getStatusBadge(selectedRequest.status).class}`}>
                                            {getStatusBadge(selectedRequest.status).label}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Data Creazione</label>
                                        <div className="detail-value">
                                            <Calendar size={14} />
                                            {formatDate(selectedRequest.created_at)}
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <label>Ultimo Aggiornamento</label>
                                        <div className="detail-value">
                                            <Calendar size={14} />
                                            {formatDate(selectedRequest.updated_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-section">
                                <h3>Oggetto</h3>
                                <p className="detail-message">{selectedRequest.subject ?? '—'}</p>
                            </div>
                            <div className="detail-section">
                                <h3>Messaggio</h3>
                                <p className="detail-message">{selectedRequest.message}</p>
                            </div>
                            <div className="detail-section">
                                <h3>Stato</h3>
                                <select
                                    value={modalStatus}
                                    onChange={(e) => setModalStatus(e.target.value)}
                                    className="modal-select"
                                >
                                    <option value="aperto">Aperto</option>
                                    <option value="in_lavorazione">In Lavorazione</option>
                                    <option value="risolto">Risolto</option>
                                    <option value="chiuso">Chiuso</option>
                                </select>
                            </div>
                            <div className="detail-section">
                                <h3>Priorità</h3>
                                <select
                                    value={modalPriority}
                                    onChange={(e) => setModalPriority(e.target.value)}
                                    className="modal-select"
                                >
                                    <option value="bassa">Bassa</option>
                                    <option value="media">Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <div className="detail-section">
                                <h3>Risposta al venditore</h3>
                                <textarea
                                    value={modalResponse}
                                    onChange={(e) => setModalResponse(e.target.value)}
                                    className="modal-response-textarea"
                                    rows={4}
                                    placeholder="Scrivi la risposta..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                                Chiudi
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveModal}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        Salvataggio...
                                    </>
                                ) : (
                                    'Salva'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestioneSupporto;
