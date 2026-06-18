import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ChevronRight,
    Pin,
    Plus,
    X,
    Loader,
    CheckCircle2,
    AlertCircle,
    Coins,
    TrendingUp,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { agendaApi } from '../api/agenda';
import type { DashboardStats } from '../types/api';
import KPICard from '../components/Dashboard/KPICard';
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

    useEffect(() => {
        if (window.location.pathname === '/role-selection') {
            return;
        }
        const roleSelectionInProgress = sessionStorage.getItem('role_selection_in_progress') === 'true';
        if (roleSelectionInProgress) {
            return;
        }
        if (user) {
            const activeRole = user.current_role || user.role;
            const isSeller = (activeRole === 'venditori' || activeRole === 'seller') && user.seller_id;
            if (isSeller) {
                navigate('/seller', { replace: true });
            }
        }
    }, [user?.current_role, user?.role, user?.seller_id, navigate, user]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await dashboardApi.getStats();
            setDashboardData(data);
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
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const currentDate = new Date().toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">{currentDate}</p>
                </div>
                <div className="kpi-grid">
                    {[...Array(4)].map((_, i) => (
                        <KPICard key={i} title="" value="" loading />
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Loader className="spinner" size={32} />
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="dashboard-page">
                <p style={{ color: 'var(--color-text-tertiary)', padding: '40px', textAlign: 'center' }}>
                    Errore nel caricamento dei dati
                </p>
            </div>
        );
    }

    const { task_performance, payment_analytics, team_efficiency, notifications } = dashboardData;

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="dashboard-header">
                <h1 className="dashboard-title">Dashboard</h1>
                <p className="dashboard-subtitle">{currentDate}</p>
            </div>

            {/* KPI Grid */}
            <div className="kpi-grid">
                <KPICard
                    title="Task Completate"
                    value={task_performance.completed_30d}
                    delta={task_performance.increment_percentage}
                    deltaLabel="vs mese scorso"
                    icon={<CheckCircle2 size={14} />}
                    accentColor="#0A84FF"
                />
                <KPICard
                    title="Task in Ritardo"
                    value={task_performance.overdue}
                    icon={<AlertCircle size={14} />}
                    accentColor="#FF453A"
                />
                <KPICard
                    title="Cocchi Pagati"
                    value={formatCurrency(payment_analytics.cocchi_paid_30d)}
                    icon={<Coins size={14} />}
                    accentColor="#34C759"
                />
                <KPICard
                    title="Settimana"
                    value={task_performance.completed_this_week}
                    delta={task_performance.increment_percentage}
                    deltaLabel="incremento"
                    icon={<TrendingUp size={14} />}
                    accentColor="#FF9F0A"
                />
            </div>

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
                                className={`range-btn${timeRange === range ? ' active' : ''}`}
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
                                                <span className="separator">·</span>
                                                <span className={`percentuale${member.percentage >= 90 ? ' high' : ''}`}>
                                                    {member.percentage}% totale
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-quaternary)' }}>
                                    Nessun dato disponibile
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="two-column-layout">
                {/* Notifications */}
                <div className="notifications-column">
                    <div className="column-header">
                        <h2>Notifiche</h2>
                        <button
                            className="view-all-link"
                            onClick={() => navigate('/notifiche')}
                        >
                            Tutte
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="notifications-list-clean">
                        {notifications && notifications.length > 0 ? (
                            notifications.map(notifica => (
                                <div
                                    key={notifica.id}
                                    className={`notifica-item-clean${!notifica.read ? ' unread' : ''}${notifica.urgent ? ' urgent' : ''}`}
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
                            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-quaternary)' }}>
                                Nessuna notifica
                            </p>
                        )}
                    </div>
                </div>

                {/* Board */}
                <div className="board-column">
                    <div className="column-header">
                        <h2>Bacheca</h2>
                        <button
                            className="btn-add-small"
                            onClick={() => navigate('/agenda')}
                        >
                            <Plus size={14} />
                            Nuovo
                        </button>
                    </div>

                    <div className="board-items-list">
                        {appunti.length > 0 ? (
                            appunti
                                .sort((a, b) => (b.pinnato ? 1 : 0) - (a.pinnato ? 1 : 0))
                                .map(appunto => (
                                    <div key={appunto.id} className={`board-item ${appunto.tipo}`}>
                                        <div className="board-item-header">
                                            <div className="board-item-type-badge">{appunto.tipo}</div>
                                            <div className="board-item-actions">
                                                <button
                                                    className={`pin-btn${appunto.pinnato ? ' pinned' : ''}`}
                                                    onClick={() => togglePin(appunto.id)}
                                                    title={appunto.pinnato ? 'Rimuovi pin' : 'Appunta'}
                                                >
                                                    <Pin size={13} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => deleteAppunto(appunto.id)}
                                                    title="Elimina"
                                                >
                                                    <X size={13} />
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
                                                    month: 'short',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-quaternary)' }}>
                                Nessun appunto nella bacheca
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
