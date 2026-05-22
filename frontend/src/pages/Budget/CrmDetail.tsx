import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Users,
    Briefcase,
    TrendingUp,
    DollarSign,
    Plus,
    Settings,
    Loader,
    FolderOpen,
    Receipt,
    BarChart3,
    Calendar as CalendarIcon,
    MessageSquare,
    Users as UsersIcon,
    CheckSquare
} from 'lucide-react';
import budgetApi, { type CrmDepartment } from '../../api/budget';
import ProjectCalendar from '../../components/ProjectCalendar/ProjectCalendar';
import ProjectChat from '../../components/ProjectChat/ProjectChat';
// TODO: Re-enable when integrated
// import ProjectsTab from '../../components/CrmProjects/ProjectsTab';
// import TeamTab from '../../components/CrmTeam/TeamTab';
import './CrmDetail.css';

type TabType = 'team' | 'projects' | 'expenses' | 'analytics' | 'calendar' | 'task' | 'chat-pm' | 'chat-general';

const CrmDetail: React.FC = () => {
    const navigate = useNavigate();
    const { code } = useParams<{ code: string }>();
    const [activeTab, setActiveTab] = useState<TabType>('team');
    const [crm, setCrm] = useState<CrmDepartment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Icon mapping
    const iconMap: { [key: string]: any } = {
        'FileText': Receipt,
        'Briefcase': Briefcase,
        'Home': FolderOpen,
        'Users': Users,
        'Globe': FolderOpen,
        'Database': FolderOpen,
        'BookOpen': FolderOpen,
        'UserCheck': Users,
        'Video': FolderOpen,
        'Wifi': FolderOpen,
        'BarChart3': BarChart3,
    };

    useEffect(() => {
        if (code) {
            loadCrmData();
        }
    }, [code]);

    const loadCrmData = async () => {
        if (!code) return;

        try {
            setLoading(true);
            setError(null);
            const response = await budgetApi.getCrmDetail(code);
            setCrm(response.data);
        } catch (err: any) {
            console.error('Error loading CRM data:', err);
            setError(err?.response?.data?.message || 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    };



    const getBudgetRemaining = () => {
        if (!crm) return 0;
        return Number(crm.budget_allocated || 0) - Number(crm.budget_spent || 0);
    };

    const getUsagePercentage = () => {
        if (!crm || !crm.budget_allocated) return 0;
        return (Number(crm.budget_spent || 0) / Number(crm.budget_allocated)) * 100;
    };

    if (loading) {
        return (
            <div className="crm-detail-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Loader className="spinner" size={40} />
                </div>
            </div>
        );
    }

    if (error || !crm) {
        return (
            <div className="crm-detail-page">
                <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'red', marginBottom: '1rem' }}>⚠️ {error || 'CRM non trovato'}</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">
                        Torna al Budget
                    </button>
                </div>
            </div>
        );
    }

    const IconComponent = iconMap[crm.icon || 'Briefcase'] || Briefcase;
    const usagePercent = getUsagePercentage();

    return (
        <div className="crm-detail-page">

            {/* Header */}
            <div className="crm-detail-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Budget Dashboard
                </button>
                <div className="crm-title-section">
                    <div className="crm-icon-large" style={{ background: crm.color }}>
                        <IconComponent size={32} color="#fff" />
                    </div>
                    <div>
                        <h1>{crm.name}</h1>
                        {crm.description && <p className="crm-subtitle">{crm.description}</p>}
                    </div>
                </div>
                <div className="crm-actions">
                    <button className="btn-action secondary">
                        <Settings size={18} />
                        Impostazioni
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="crm-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: `${crm.color}20` }}>
                        <DollarSign size={24} style={{ color: crm.color }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Budget Allocato</p>
                        <h3 className="kpi-value">¢ {(Number(crm.budget_allocated) || 0).toLocaleString('it-IT')}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(255, 159, 10, 0.2)' }}>
                        <TrendingUp size={24} style={{ color: '#FF9F0A' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Budget Speso</p>
                        <h3 className="kpi-value">¢ {(Number(crm.budget_spent) || 0).toLocaleString('it-IT')}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(52, 199, 89, 0.2)' }}>
                        <Briefcase size={24} style={{ color: '#34C759' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Budget Rimanente</p>
                        <h3 className="kpi-value">¢ {getBudgetRemaining().toLocaleString('it-IT')}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(94, 92, 230, 0.2)' }}>
                        <BarChart3 size={24} style={{ color: '#5E5CE6' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Utilizzo Budget</p>
                        <h3 className="kpi-value">{usagePercent.toFixed(1)}%</h3>
                        <div className="kpi-progress-bar">
                            <div
                                className="kpi-progress-fill"
                                style={{
                                    width: `${Math.min(usagePercent, 100)}%`,
                                    background: usagePercent > 90 ? '#FF453A' : usagePercent > 70 ? '#FF9F0A' : crm.color
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="crm-tabs">
                <button
                    className={`crm-tab ${activeTab === 'team' ? 'active' : ''}`}
                    onClick={() => setActiveTab('team')}
                >
                    <Users size={18} />
                    Team
                </button>
                <button
                    className={`crm-tab ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    <FolderOpen size={18} />
                    Progetti
                </button>
                <button
                    className={`crm-tab ${activeTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expenses')}
                >
                    <Receipt size={18} />
                    Spese & Abbonamenti
                </button>
                <button
                    className={`crm-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <BarChart3 size={18} />
                    Analytics
                </button>
                <button
                    className={`crm-tab ${activeTab === 'task' ? 'active' : ''}`}
                    onClick={() => setActiveTab('task')}
                >
                    <CheckSquare size={18} />
                    Task
                </button>
                <button
                    className={`crm-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <CalendarIcon size={18} />
                    Calendario
                </button>
                <button
                    className={`crm-tab ${activeTab === 'chat-pm' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat-pm')}
                >
                    <MessageSquare size={18} />
                    Chat PM
                </button>
                <button
                    className={`crm-tab ${activeTab === 'chat-general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat-general')}
                >
                    <UsersIcon size={18} />
                    Chat Generale
                </button>
            </div>

            {/* Content Area */}
            <div className="crm-content">
                {activeTab === 'team' && (
                    <div className="team-section">
                        <div className="section-header">
                            <h2>Team Members</h2>
                            <button className="btn-action primary">
                                <Plus size={18} />
                                Aggiungi Membro
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <Users size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Sezione Team in sviluppo...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="projects-section">
                        <div className="section-header">
                            <h2>Progetti</h2>
                            <button className="btn-action primary">
                                <Plus size={18} />
                                Assegna Budget
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <FolderOpen size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Sezione Progetti in sviluppo...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="expenses-section">
                        <div className="section-header">
                            <h2>Spese & Abbonamenti</h2>
                            <button className="btn-action primary">
                                <Plus size={18} />
                                Nuova Spesa
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <Receipt size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Sezione Spese in sviluppo...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="analytics-section">
                        <div className="section-header">
                            <h2>Analytics</h2>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <BarChart3 size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Sezione Analytics in sviluppo...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'task' && (
                    <div className="task-section">
                        <div className="section-header">
                            <h2>Task Management</h2>
                            <button className="btn-action primary">
                                <Plus size={18} />
                                Nuovo Task
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <CheckSquare size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Sezione Task in sviluppo...</p>
                            <small>Qui potrai gestire task, scadenze e assignazioni</small>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && crm && (
                    <ProjectCalendar 
                        projectId={crm.id || 0}
                        tasks={[]}
                    />
                )}

                {activeTab === 'chat-pm' && (
                    <ProjectChat
                        projectId={crm.id || 0}
                        isPmChat={true}
                        currentUserId={1}
                    />
                )}

                {activeTab === 'chat-general' && (
                    <ProjectChat
                        projectId={crm.id || 0}
                        isPmChat={false}
                        currentUserId={1}
                    />
                )}
            </div>
        </div>
    );
};

export default CrmDetail;
