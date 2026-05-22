import React, { useState, useEffect } from 'react';
import { reimbursementsApi, type ReimbursementRequest } from '../../api/expenses';
import { CheckCircle, XCircle, Loader, Calendar, User, FileText } from 'lucide-react';
import './ReimbursementApprovals.css';

const ReimbursementApprovals: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadPendingReimbursements();
    }, []);

    const loadPendingReimbursements = async () => {
        try {
            setLoading(true);
            const response = await reimbursementsApi.getPending();
            setReimbursements(response.data);
        } catch (err) {
            console.error('Errore caricamento rimborsi:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('Confermi l\'approvazione di questa richiesta?')) return;

        setActionLoading(true);
        try {
            await reimbursementsApi.approve(id);
            setReimbursements(prev => prev.filter(r => r.id !== id));
            alert('Richiesta approvata con successo!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Errore durante l\'approvazione');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Inserisci una motivazione');
            return;
        }

        setActionLoading(true);
        try {
            await reimbursementsApi.reject(selectedId!, rejectReason);
            setReimbursements(prev => prev.filter(r => r.id !== selectedId));
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedId(null);
            alert('Richiesta rifiutata');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Errore durante il rifiuto');
        } finally {
            setActionLoading(false);
        }
    };

    const getUrgencyClass = (urgency: string) => {
        switch (urgency) {
            case 'overdue': return 'urgency-overdue';
            case 'urgent': return 'urgency-urgent';
            default: return 'urgency-normal';
        }
    };

    if (loading) {
        return (
            <div className="reimbursement-approvals">
                <div className="loading-container">
                    <Loader className="spinner" size={40} />
                    <p>Caricamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reimbursement-approvals">
            <div className="approvals-header">
                <div>
                    <h1>Approvazione Rimborsi</h1>
                    <p>Richieste di rimborso in attesa di approvazione</p>
                </div>
                <div className="header-stats">
                    <div className="stat-badge">
                        <span className="badge-count">{reimbursements.length}</span>
                        <span className="badge-label">Pending</span>
                    </div>
                    <div className="stat-badge">
                        <span className="badge-count">
                            € {reimbursements.reduce((sum, r) => sum + r.amount, 0).toLocaleString('it-IT')}
                        </span>
                        <span className="badge-label">Totale</span>
                    </div>
                </div>
            </div>

            {reimbursements.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle size={64} color="#34C759" />
                    <h3>Nessuna richiesta pending!</h3>
                    <p>Tutte le richieste sono state processate</p>
                </div>
            ) : (
                <div className="approvals-list">
                    {reimbursements.map((reimb) => (
                        <div key={reimb.id} className={`approval-card ${getUrgencyClass(reimb.urgency_level)}`}>
                            <div className="card-header">
                                <div className="user-info">
                                    <div className="user-avatar">
                                        {reimb.user?.name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <h3>{reimb.title}</h3>
                                        <span className="user-name">
                                            <User size={14} />
                                            {reimb.user?.name || 'Utente'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-amount">
                                    € {reimb.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="card-body">
                                {reimb.description && (
                                    <p className="description">{reimb.description}</p>
                                )}

                                <div className="card-meta">
                                    <span className="meta-item">
                                        <Calendar size={14} />
                                        {new Date(reimb.expense_date).toLocaleDateString('it-IT')}
                                    </span>
                                    {reimb.category && (
                                        <span className="meta-item category">
                                            {reimb.category}
                                        </span>
                                    )}
                                    {reimb.crm_code && (
                                        <span className="meta-item crm">
                                            CRM: {reimb.crm_code}
                                        </span>
                                    )}
                                    <span className="meta-item pending-time">
                                        {reimb.days_pending} giorni fa
                                    </span>
                                </div>

                                {reimb.receipt_file_path && (
                                    <a
                                        href={`https://backclub.it/backend/storage/${reimb.receipt_file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="receipt-link"
                                    >
                                        <FileText size={16} />
                                        Visualizza Ricevuta
                                    </a>
                                )}
                            </div>

                            <div className="card-actions">
                                <button
                                    onClick={() => handleApprove(reimb.id)}
                                    disabled={actionLoading}
                                    className="btn-approve"
                                >
                                    <CheckCircle size={18} />
                                    Approva
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedId(reimb.id);
                                        setShowRejectModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="btn-reject"
                                >
                                    <XCircle size={18} />
                                    Rifiuta
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Rifiuta Richiesta</h2>
                        <p>Inserisci una motivazione per il rifiuto:</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="es: Ricevuta non leggibile, importo non conforme..."
                            rows={4}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                className="btn-secondary"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="btn-reject"
                            >
                                {actionLoading ? <Loader className="spinner" size={16} /> : 'Rifiuta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReimbursementApprovals;

