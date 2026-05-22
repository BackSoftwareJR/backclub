import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    DollarSign,
    Briefcase,
    TrendingUp,
    FileText,
    Settings,
    Plus
} from 'lucide-react';
import { userManagementApi, type WorkHour, type Compensation, type UserNote } from '../../api/userManagement';
import './UserDetail.css';

interface UserDetail {
    user: any;
    current_compensation: Compensation | null;
    stats: {
        total_hours_month: number;
        total_hours_year: number;
        total_payments: number;
        pending_payments: number;
        active_projects: number;
        completed_projects: number;
    };
}

const UserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'hours' | 'payments' | 'projects' | 'compensation' | 'notes' | 'admin'>('overview');
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [workHours, setWorkHours] = useState<WorkHour[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [compensations, setCompensations] = useState<Compensation[]>([]);
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showHoursModal, setShowHoursModal] = useState(false);
    const [showCompModal, setShowCompModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const [detailRes, hoursRes, projectsRes, compRes, notesRes] = await Promise.all([
                userManagementApi.getDetail(parseInt(id)),
                userManagementApi.getWorkHours(parseInt(id)),
                userManagementApi.getProjects(parseInt(id)),
                userManagementApi.getCompensation(parseInt(id)),
                userManagementApi.getNotes(parseInt(id)),
            ]);

            setUserDetail(detailRes.data as any);
            setWorkHours(hoursRes.data);
            setProjects(projectsRes.data);
            setCompensations(compRes.data);
            setNotes(notesRes.data);
        } catch (err: any) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !userDetail) {
        return (
            <div className="user-detail-page">
                <div className="loading-container">Caricamento...</div>
            </div>
        );
    }

    const { user, current_compensation, stats } = userDetail;

    return (
        <div className="user-detail-page">
            {/* Header */}
            <div className="detail-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Torna agli utenti
                </button>
                <div className="header-content">
                    <div className="user-avatar-large">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-main-info">
                        <h1>{user.name}</h1>
                        <p>{user.email}</p>
                        {current_compensation && (
                            <div className="compensation-badge">
                                {current_compensation.type === 'hourly' && `€${current_compensation.base_rate}/h`}
                                {current_compensation.type === 'task' && `€${current_compensation.base_rate}/task`}
                                {current_compensation.type === 'project' && `€${current_compensation.base_rate}/progetto`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="detail-kpis">
                <div className="kpi-card">
                    <Clock size={20} />
                    <div>
                        <p className="kpi-label">Ore Mese</p>
                        <h3 className="kpi-value">{stats.total_hours_month.toFixed(1)}h</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <Clock size={20} />
                    <div>
                        <p className="kpi-label">Ore Anno</p>
                        <h3 className="kpi-value">{stats.total_hours_year.toFixed(1)}h</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <DollarSign size={20} />
                    <div>
                        <p className="kpi-label">Pagato</p>
                        <h3 className="kpi-value">€ {stats.total_payments.toLocaleString('it-IT')}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <DollarSign size={20} />
                    <div>
                        <p className="kpi-label">Pending</p>
                        <h3 className="kpi-value pending">€ {stats.pending_payments.toLocaleString('it-IT')}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <Briefcase size={20} />
                    <div>
                        <p className="kpi-label">Progetti Attivi</p>
                        <h3 className="kpi-value">{stats.active_projects}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
                <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <TrendingUp size={18} />
                    Overview
                </button>
                <button className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>
                    <Clock size={18} />
                    Ore Lavorate
                </button>
                <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
                    <DollarSign size={18} />
                    Pagamenti
                </button>
                <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                    <Briefcase size={18} />
                    Progetti ({projects.length})
                </button>
                <button className={`tab ${activeTab === 'compensation' ? 'active' : ''}`} onClick={() => setActiveTab('compensation')}>
                    <TrendingUp size={18} />
                    Compensi
                </button>
                <button className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    <FileText size={18} />
                    Note ({notes.length})
                </button>
                <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                    <Settings size={18} />
                    Admin
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        <h2>Riepilogo Utente</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <h4>Informazioni Base</h4>
                                <p>Ruolo: <strong>{user.role}</strong></p>
                                <p>Status: <strong>{user.status}</strong></p>
                                {current_compensation && (
                                    <p>Retribuzione: <strong>{current_compensation.type}</strong></p>
                                )}
                            </div>
                            <div className="stat-box">
                                <h4>Performance</h4>
                                <p>Progetti completati: <strong>{stats.completed_projects}</strong></p>
                                <p>Progetti attivi: <strong>{stats.active_projects}</strong></p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'hours' && (
                    <div className="hours-tab">
                        <div className="tab-header">
                            <h2>Ore Lavorate</h2>
                            <button className="btn-primary" onClick={() => setShowHoursModal(true)}>
                                <Plus size={16} />
                                Aggiungi Ore
                            </button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Progetto</th>
                                    <th>Ore</th>
                                    <th>Tariffa</th>
                                    <th>Totale</th>
                                    <th>Descrizione</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workHours.map(hour => (
                                    <tr key={hour.id}>
                                        <td>{new Date(hour.date).toLocaleDateString('it-IT')}</td>
                                        <td>{hour.project_name || '-'}</td>
                                        <td>{hour.hours}h</td>
                                        <td>{hour.hourly_rate ? `€${hour.hourly_rate}` : '-'}</td>
                                        <td>{hour.hourly_rate ? `€${(hour.hours * hour.hourly_rate).toFixed(2)}` : '-'}</td>
                                        <td className="description">{hour.description || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="payments-tab">
                        <h2>Storico Pagamenti</h2>
                        <p className="placeholder">Integrazione con uscite_cocchi in sviluppo</p>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="projects-tab">
                        <h2>Progetti Utente</h2>
                        <div className="projects-grid">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    className="project-card"
                                    onClick={() => navigate(`/serbatoi/budget/projects/${project.id}`)}
                                >
                                    <h4>{project.name}</h4>
                                    <p>Ruolo: {project.team_role}</p>
                                    <p>Status: <span className={`badge status-${project.status}`}>{project.status}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'compensation' && (
                    <div className="compensation-tab">
                        <div className="tab-header">
                            <h2>Storico Compensi</h2>
                            <button className="btn-primary" onClick={() => setShowCompModal(true)}>
                                <Plus size={16} />
                                Nuovo Compenso
                            </button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Tariffa</th>
                                    <th>Valido Da</th>
                                    <th>Valido Fino</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compensations.map(comp => (
                                    <tr key={comp.id}>
                                        <td><span className="badge">{comp.type}</span></td>
                                        <td>€ {comp.base_rate}</td>
                                        <td>{new Date(comp.effective_from).toLocaleDateString('it-IT')}</td>
                                        <td>{comp.effective_to ? new Date(comp.effective_to).toLocaleDateString('it-IT') : 'Attuale'}</td>
                                        <td className="description">{comp.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="notes-tab">
                        <div className="tab-header">
                            <h2>Note</h2>
                            <button className="btn-primary" onClick={() => setShowNoteModal(true)}>
                                <Plus size={16} />
                                Aggiungi Nota
                            </button>
                        </div>
                        <div className="notes-timeline">
                            {notes.map(note => (
                                <div key={note.id} className="note-card">
                                    <div className="note-header">
                                        <strong>{note.author_name}</strong>
                                        <span className="note-date">{new Date(note.created_at).toLocaleDateString('it-IT')}</span>
                                    </div>
                                    <p className="note-content">{note.note}</p>
                                    {note.is_private && <span className="badge private">Privata</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className="admin-tab">
                        <h2>Pannello Admin</h2>
                        <div className="admin-actions">
                            <button className="action-card" onClick={() => setShowHoursModal(true)}>
                                <Clock size={32} />
                                <h4>Registra Ore</h4>
                                <p>Aggiungi ore lavorate per questo utente</p>
                            </button>
                            <button className="action-card" onClick={() => setShowCompModal(true)}>
                                <DollarSign size={32} />
                                <h4>Modifica Compenso</h4>
                                <p>Aggiorna la retribuzione dell'utente</p>
                            </button>
                            <button className="action-card" onClick={() => setShowNoteModal(true)}>
                                <FileText size={32} />
                                <h4>Aggiungi Nota</h4>
                                <p>Crea un appunto per questo utente</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals - Simplified placeholders */}
            {showHoursModal && (
                <div className="modal-overlay" onClick={() => setShowHoursModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Aggiungi Ore</h3>
                        <p>Modal in sviluppo - implementa form per aggiungere ore</p>
                        <button className="btn-secondary" onClick={() => setShowHoursModal(false)}>Chiudi</button>
                    </div>
                </div>
            )}

            {showCompModal && (
                <div className="modal-overlay" onClick={() => setShowCompModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Nuovo Compenso</h3>
                        <p>Modal in sviluppo - implementa form per compenso</p>
                        <button className="btn-secondary" onClick={() => setShowCompModal(false)}>Chiudi</button>
                    </div>
                </div>
            )}

            {showNoteModal && (
                <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Aggiungi Nota</h3>
                        <p>Modal in sviluppo - implementa form per nota</p>
                        <button className="btn-secondary" onClick={() => setShowNoteModal(false)}>Chiudi</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDetail;
