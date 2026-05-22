import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ChevronRight,
    Pin,
    Plus,
    X,
    Loader
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { agendaApi } from '../api/agenda';
import type { DashboardStats } from '../types/api';
import '../styles/pages/Dashboard.css';

interface Appunto {
    id: number;
    tipo: 'avviso' | 'comunicazione' | 'appunto';
    titolo: string;
    contenuto: string;
    data: string;
    pinnato: boolean;
    autore: string;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
    const [appunti, setAppunti] = useState<Appunto[]>([]);
    const [timeRange, setTimeRange] = useState<'7G' | '30G' | '90G' | '1A'>('30G');

    // Redirect sellers to their dashboard
    // Usa current_role per verificare il ruolo corrente
    // IMPORTANT: Don't redirect if user is on role-selection page or role selection is in progress
    useEffect(() => {
        // Prevent redirect if we're on role-selection page or role selection is in progress
        if (window.location.pathname === '/role-selection') {
            return;
        }
        
        // Check if role selection is in progress
        const roleSelectionInProgress = sessionStorage.getItem('role_selection_in_progress') === 'true';
        if (roleSelectionInProgress) {
            console.log('Role selection in progress, skipping redirect');
            return;
        }
        
        if (user) {
            const activeRole = user.current_role || user.role;
            // Solo reindirizza se il ruolo corrente è effettivamente venditore
            // E se c'è seller_id (per evitare redirect se il ruolo è cambiato)
            const isSeller = (activeRole === 'venditori' || activeRole === 'seller') && user.seller_id;
            
            if (isSeller) {
                navigate('/seller', { replace: true });
            }
        }
    }, [user?.current_role, user?.role, user?.seller_id, navigate, user]);

    // Load dashboard data
    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await dashboardApi.getStats();
            setDashboardData(data);
            
            // Set agenda items
            if (data.agenda_items) {
                setAppunti(data.agenda_items);
            }
        } catch (error) {
            console.error('Errore caricamento dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePin = async (id: number) => {
        try {
            await agendaApi.togglePin(id);
            // Update local state
            setAppunti(prev => prev.map(a =>
                a.id === id ? { ...a, pinnato: !a.pinnato } : a
            ));
        } catch (error) {
            console.error('Errore toggle pin:', error);
        }
    };

    const deleteAppunto = async (id: number) => {
        try {
            await agendaApi.delete(id);
            setAppunti(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Errore eliminazione appunto:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return '¢ ' + new Intl.NumberFormat('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="dashboard-three-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader className="spinner" size={40} />
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="dashboard-three-section">
                <p>Errore nel caricamento dei dati</p>
            </div>
        );
    }

    const { task_performance, payment_analytics, team_efficiency, notifications } = dashboardData;

    return (
        <div className="dashboard-three-section">
            {/* Quick Actions Bar */}

            {/* Analytics & Performance Panel */}
            <div className="analytics-panel">
                <div className="analytics-header">
                    <div>
                        <h2 className="analytics-title">Analytics & Performance</h2>
                        <p className="analytics-subtitle">Panoramica completa delle attività</p>
                    </div>
                    <div className="time-range-selector">
                        {(['7G', '30G', '90G', '1A'] as const).map(range => (
                            <button
                                key={range}
                                className={`range-btn ${timeRange === range ? 'active' : ''}`}
                                onClick={() => setTimeRange(range)}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="analytics-grid">
                    {/* Task Performance */}
                    <div className="analytics-card task-performance">
                        <div className="card-header">
                            <h3>Task Performance</h3>
                            <span className="card-subtitle">Ultimi 30 giorni</span>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value big">{task_performance.completed_30d}</div>
                                <div className="stat-label">Completate (30D)</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value medium danger">{task_performance.overdue}</div>
                                <div className="stat-label">In Ritardo</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value medium">{task_performance.completed_this_week}</div>
                                <div className="stat-label">Questa Settimana</div>
                            </div>
                            <div className="stat-item">
                                <div className={`stat-value medium ${task_performance.increment_percentage >= 0 ? 'success' : 'danger'}`}>
                                    {task_performance.increment_percentage >= 0 ? '+' : ''}{task_performance.increment_percentage}%
                                </div>
                                <div className="stat-label">Incremento</div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Analytics */}
                    <div className="analytics-card payment-analytics">
                        <div className="card-header">
                            <h3>Payment Analytics</h3>
                            <span className="card-subtitle">Gestione pagamenti</span>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value big success">{formatCurrency(payment_analytics.cocchi_paid_30d)}</div>
                                <div className="stat-label">Cocchi Pagati (30D)</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value medium danger">{formatCurrency(payment_analytics.cocchi_overdue)}</div>
                                <div className="stat-label">Cocchi In Ritardo</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value medium">{payment_analytics.installments_paid}</div>
                                <div className="stat-label">Rate Pagate</div>
                            </div>
                        </div>
                    </div>

                    {/* Team Efficiency */}
                    <div className="analytics-card team-efficiency">
                        <div className="card-header">
                            <h3>Team Efficiency</h3>
                            <div className="card-subtitle">Performance membri</div>
                        </div>
                        <div className="team-list">
                            {team_efficiency.length > 0 ? (
                                team_efficiency.map(member => (
                                    <div key={member.id} className="team-member">
                                        <div className="member-avatar">{member.initials}</div>
                                        <div className="member-info">
                                            <div className="member-name">{member.name}</div>
                                            <div className="member-stats">
                                                <span className="completate">{member.completed} completate</span>
                                                <span className="separator">•</span>
                                                <span className={`percentuale ${member.percentage >= 90 ? 'high' : ''}`}>
                                                    {member.percentage}% totale
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nessun dato disponibile</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="two-column-layout">
                {/* Left: Notifications */}
                <div className="notifications-column">
                    <div className="column-header">
                        <h2>Notifiche</h2>
                        <button
                            className="view-all-link"
                            onClick={() => navigate('/notifiche')}
                        >
                            Tutte
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="notifications-list-clean">
                        {notifications && notifications.length > 0 ? (
                            notifications.map(notifica => (
                                <div
                                    key={notifica.id}
                                    className={`notifica-item-clean ${!notifica.read ? 'unread' : ''} ${notifica.urgent ? 'urgent' : ''}`}
                                    onClick={() => navigate(`/notifiche/${notifica.id}`)}
                                >
                                    <div className="notifica-avatar-clean">{notifica.avatar}</div>
                                    <div className="notifica-content-clean">
                                        <div className="notifica-top-row">
                                            <span className="notifica-title-clean">{notifica.title}</span>
                                            <span className="notifica-time-clean">{notifica.time}</span>
                                        </div>
                                        <div className="notifica-message-clean">{notifica.message}</div>
                                    </div>
                                    {!notifica.read && <div className="unread-dot-clean" />}
                                </div>
                            ))
                        ) : (
                            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nessuna notifica</p>
                        )}
                    </div>
                </div>

                {/* Right: Interactive Board */}
                <div className="board-column">
                    <div className="column-header">
                        <h2>Bacheca</h2>
                        <button 
                            className="btn-add-small"
                            onClick={() => navigate('/agenda')}
                        >
                            <Plus size={16} />
                            Nuovo
                        </button>
                    </div>

                    <div className="board-items-list">
                        {appunti.length > 0 ? (
                            appunti.sort((a, b) => (b.pinnato ? 1 : 0) - (a.pinnato ? 1 : 0)).map(appunto => (
                                <div key={appunto.id} className={`board-item ${appunto.tipo}`}>
                                    <div className="board-item-header">
                                        <div className="board-item-type-badge">{appunto.tipo}</div>
                                        <div className="board-item-actions">
                                            <button
                                                className={`pin-btn ${appunto.pinnato ? 'pinned' : ''}`}
                                                onClick={() => togglePin(appunto.id)}
                                                title={appunto.pinnato ? 'Rimuovi pin' : 'Appunta'}
                                            >
                                                <Pin size={14} />
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => deleteAppunto(appunto.id)}
                                                title="Elimina"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="board-item-title">{appunto.titolo}</h3>
                                    <p className="board-item-content">{appunto.contenuto}</p>

                                    <div className="board-item-footer">
                                        <span className="board-item-author">{appunto.autore}</span>
                                        <span className="board-item-date">
                                            {new Date(appunto.data).toLocaleDateString('it-IT', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nessun appunto nella bacheca</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
