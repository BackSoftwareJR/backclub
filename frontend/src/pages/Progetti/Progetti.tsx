import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FolderKanban, Users, Clock, TrendingUp, User, FileText, MessageSquare, Calendar as CalendarIcon, Ticket, Send, AlertCircle, ArrowLeft, Edit2 } from 'lucide-react';
import CreateProjectModal from '../../components/CreateProjectModal/CreateProjectModal';
import CrmDepartmentModal from '../../components/CrmDepartmentModal/CrmDepartmentModal';
import { projectsApi, type Project, type ProjectStats } from '../../api/projects';
import { getCrmDepartments, type CrmDepartment } from '../../api/crmDepartments';
import './Progetti.css';

type ViewType = 'crm-list' | 'projects-list' | 'project-detail';

const Progetti: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<ViewType>('crm-list');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeDetailTab, setActiveDetailTab] = useState('overview');
    const [newMessage, setNewMessage] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // CRM Departments
    const [crmDepartments, setCrmDepartments] = useState<CrmDepartment[]>([]);
    const [selectedCrm, setSelectedCrm] = useState<CrmDepartment | null>(null);
    const [loadingCrm, setLoadingCrm] = useState(true);
    const [isCrmModalOpen, setIsCrmModalOpen] = useState(false);
    const [selectedCrmForEdit, setSelectedCrmForEdit] = useState<CrmDepartment | null>(null);
    
    // Real data from API
    const [projects, setProjects] = useState<Project[]>([]);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load CRM departments on mount
    useEffect(() => {
        loadCrmDepartments();
    }, []);

    // Load projects when CRM is selected
    useEffect(() => {
        if (selectedCrm && view === 'projects-list') {
            loadProjects();
        }
    }, [selectedCrm, statusFilter]);

    const loadCrmDepartments = async () => {
        try {
            setLoadingCrm(true);
            setError(null);
            const data = await getCrmDepartments(true);
            console.log('CRM Departments loaded:', data);
            setCrmDepartments(data);
        } catch (err: any) {
            console.error('Error loading CRM departments:', err);
            setError(err.toString());
        } finally {
            setLoadingCrm(false);
        }
    };

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectsApi.getAll({
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: searchQuery || undefined,
                crm_department_id: selectedCrm?.id,
            });
            setProjects(response.data);
            setStats(response.stats);
        } catch (err: any) {
            console.error('Error loading projects:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento dei progetti');
        } finally {
            setLoading(false);
        }
    };

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                loadProjects();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    // Load project detail
    const loadProjectDetail = async (projectId: number) => {
        try {
            setLoading(true);
            const response = await projectsApi.getById(projectId);
            setSelectedProject(response.data);
            setView('project-detail');
        } catch (err: any) {
            console.error('Error loading project detail:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento del progetto');
        } finally {
            setLoading(false);
        }
    };

    const handleCrmClick = (crm: CrmDepartment) => {
        // Se è "PROGETTI IN ATTESA", naviga alla pagina dedicata
        if (crm.code === 'PROGETTI IN ATTESA' || crm.name?.toLowerCase().includes('progetti in attesa')) {
            navigate('/progetti-in-attesa');
            return;
        }
        // Se è "CLIENTI" (Gestione Clienti), naviga alla dashboard dedicata
        if (crm.code === 'CLIENTI' || crm.id === 4) {
            navigate('/gestione-clienti');
            return;
        }
        // Se è "CRM Project" (id 2), naviga alla dashboard PM
        if (crm.id === 2 || crm.name?.toLowerCase().includes('crm project')) {
            navigate('/pm');
            return;
        }
        // Altrimenti, mostra i progetti nella stessa pagina
        setSelectedCrm(crm);
        setView('projects-list');
    };

    const handleBackToCrmList = () => {
        setView('crm-list');
        setSelectedCrm(null);
        setProjects([]);
    };

    const handleProjectClick = (projectId: number) => {
        loadProjectDetail(projectId);
    };

    const handleBackToProjectsList = () => {
        setView('projects-list');
        setSelectedProject(null);
    };

    const handleCreateProject = () => {
        setIsCreateModalOpen(true);
    };

    const handleProjectCreated = () => {
        loadProjects();
    };

    const handleCreateCrm = () => {
        setSelectedCrmForEdit(null);
        setIsCrmModalOpen(true);
    };

    const handleEditCrm = (e: React.MouseEvent, crm: CrmDepartment) => {
        e.stopPropagation(); // Previene il click sulla card
        setSelectedCrmForEdit(crm);
        setIsCrmModalOpen(true);
    };

    const handleCrmSaved = () => {
        loadCrmDepartments();
    };

    // Filter projects client-side for instant feedback
    const filteredProjects = projects.filter(p => {
        const matchesSearch = !searchQuery || 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.client?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });
    // Loading state
    if (loadingCrm && view === 'crm-list') {
        return (
            <div className="progetti-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento CRM...</p>
                </div>
            </div>
        );
    }

    if (loading && view === 'projects-list') {
        return (
            <div className="progetti-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento progetti...</p>
                </div>
            </div>
        );
    }

    if (error && view === 'crm-list') {
        return (
            <div className="progetti-page">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Errore</h3>
                    <p>{error}</p>
                    <button onClick={loadCrmDepartments} className="btn-retry">Riprova</button>
                </div>
            </div>
        );
    }

    // Empty state for CRM
    if (!loadingCrm && view === 'crm-list' && crmDepartments.length === 0) {
        return (
            <div className="progetti-page">
                <div className="error-state">
                    <FolderKanban size={48} />
                    <h3>Nessun CRM trovato</h3>
                    <p>Non ci sono CRM departments attivi nel sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="progetti-page">
            {/* CRM List View */}
            {view === 'crm-list' && (
                <>
                    {/* Header */}
                    <div className="progetti-header">
                        <div>
                            <h1>CRM & Dipartimenti</h1>
                            <p className="subtitle">Seleziona un CRM per visualizzare i progetti</p>
                        </div>
                        <button className="btn-new-project" onClick={handleCreateCrm}>
                            <Plus size={16} />
                            Nuovo CRM
                        </button>
                    </div>

                    {/* CRM Grid */}
                    <div className="crm-grid">
                        {crmDepartments.map(crm => (
                            <div 
                                key={crm.id} 
                                className="crm-card"
                                onClick={() => handleCrmClick(crm)}
                                style={{ borderLeftColor: crm.color }}
                            >
                                <div className="crm-card-header">
                                    <div className="crm-icon" style={{ backgroundColor: crm.color + '20' }}>
                                        <span style={{ color: crm.color }}>
                                            {crm.icon === 'FileText' && <FileText size={24} />}
                                            {crm.icon === 'Briefcase' && <FolderKanban size={24} />}
                                            {crm.icon === 'Home' && <FileText size={24} />}
                                            {crm.icon === 'Users' && <Users size={24} />}
                                            {crm.icon === 'Globe' && <TrendingUp size={24} />}
                                            {crm.icon === 'Database' && <FileText size={24} />}
                                            {crm.icon === 'BookOpen' && <FileText size={24} />}
                                            {crm.icon === 'UserCheck' && <User size={24} />}
                                            {crm.icon === 'Video' && <MessageSquare size={24} />}
                                            {crm.icon === 'Wifi' && <TrendingUp size={24} />}
                                            {crm.icon === 'BarChart3' && <TrendingUp size={24} />}
                                            {!crm.icon && <FolderKanban size={24} />}
                                        </span>
                                    </div>
                                    <div className="crm-card-title">
                                        <h3>{crm.name}</h3>
                                        <p className="crm-code">{crm.code}</p>
                                    </div>
                                    <button 
                                        className="crm-edit-btn"
                                        onClick={(e) => handleEditCrm(e, crm)}
                                        title="Modifica CRM"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                <p className="crm-description">{crm.description || 'Nessuna descrizione'}</p>

                                <div className="crm-stats-row">
                                    <div className="crm-stat">
                                        <FolderKanban size={16} />
                                        <span>{crm.projects_count || 0} progetti</span>
                                    </div>
                                    <div className="crm-stat">
                                        <Users size={16} />
                                        <span>{crm.team_members_count || 0} membri</span>
                                    </div>
                                </div>

                                <div className="crm-budget">
                                    <div className="budget-bar">
                                        <div 
                                            className="budget-progress" 
                                            style={{ 
                                                width: `${Number(crm.budget_allocated) > 0 ? (Number(crm.budget_spent) / Number(crm.budget_allocated)) * 100 : 0}%`,
                                                backgroundColor: crm.color
                                            }}
                                        />
                                    </div>
                                    <div className="budget-text">
                                        <span>€{Number(crm.budget_spent).toFixed(2)}</span>
                                        <span className="budget-total">/ €{Number(crm.budget_allocated).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Projects List View (for selected CRM) */}
            {view === 'projects-list' && (
                <>
                    {/* Header with back button */}
                    <div className="progetti-header">
                        <div>
                            <button className="btn-back-crm" onClick={handleBackToCrmList}>
                                <ArrowLeft size={20} />
                                Torna ai CRM
                            </button>
                            <h1>{selectedCrm?.name}</h1>
                            <p className="subtitle">{selectedCrm?.description}</p>
                        </div>
                        <button className="btn-new-project" onClick={handleCreateProject}>
                            <Plus size={16} />
                            Nuovo Progetto
                        </button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="project-stats">
                            <div className="stat-card active">
                                <FolderKanban size={24} />
                                <div>
                                    <div className="stat-value">{stats.active}</div>
                                    <div className="stat-label">Progetti Attivi</div>
                                </div>
                            </div>
                            <div className="stat-card pending">
                                <Clock size={24} />
                                <div>
                                    <div className="stat-value">{stats.pending}</div>
                                    <div className="stat-label">In Attesa</div>
                                </div>
                            </div>
                            <div className="stat-card team">
                                <Users size={24} />
                                <div>
                                    <div className="stat-value">{stats.team_members_count}</div>
                                    <div className="stat-label">Team Members</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Filters */}
                    <div className="search-filters">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Cerca per cliente o nome progetto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                            <option value="all">Tutti gli stati</option>
                            <option value="active">Attivi</option>
                            <option value="pending">In Attesa</option>
                            <option value="completed">Completati</option>
                        </select>
                    </div>

                    {/* Projects Table */}
                    <div className="projects-table">
                        {filteredProjects.length === 0 ? (
                            <div className="empty-state-table">
                                <FolderKanban size={48} />
                                <p>Nessun progetto trovato per questo CRM</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Progetto</th>
                                        <th>Cliente</th>
                                        <th>Project Manager</th>
                                        <th>Progress</th>
                                        <th>Team</th>
                                        <th>Scadenza</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map(project => (
                                        <tr key={project.id} onClick={() => handleProjectClick(project.id)}>
                                            <td className="project-name">{project.name}</td>
                                            <td>{project.client?.company_name || 'N/A'}</td>
                                            <td>{project.manager?.name || 'N/A'}</td>
                                            <td>
                                                <div className="progress-cell">
                                                    <div className="progress-bar-mini" style={{ width: `${project.progress_percentage}%` }}></div>
                                                    <span>{project.progress_percentage}%</span>
                                                </div>
                                            </td>
                                            <td>{project.members?.length || 0} membri</td>
                                            <td>
                                                {project.end_date 
                                                    ? new Date(project.end_date).toLocaleDateString('it-IT')
                                                    : 'Non definita'}
                                            </td>
                                            <td>
                                                <span className={`status-badge-project ${project.status}`}>
                                                    {project.status === 'active' && 'Attivo'}
                                                    {project.status === 'planning' && 'Pianificazione'}
                                                    {project.status === 'on_hold' && 'In Pausa'}
                                                    {project.status === 'completed' && 'Completato'}
                                                    {project.status === 'cancelled' && 'Annullato'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Project Detail View */}
            {view === 'project-detail' && (
                <>
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Caricamento dettagli progetto...</p>
                        </div>
                    ) : selectedProject ? (
                <div className="project-detail">
                    {/* Detail Header */}
                    <div className="detail-header-project">
                        <button className="btn-back-project" onClick={handleBackToProjectsList}>
                            <ArrowLeft size={20} />
                            Torna ai Progetti
                        </button>
                        <h1>{selectedProject.name}</h1>
                    </div>
                    {/* Detail Tabs */}
                    <div className="detail-tabs">
                        <button className={activeDetailTab === 'overview' ? 'active' : ''} onClick={() => setActiveDetailTab('overview')}>
                            <TrendingUp size={16} /> Overview
                        </button>
                        <button className={activeDetailTab === 'pm-reports' ? 'active' : ''} onClick={() => setActiveDetailTab('pm-reports')}>
                            <User size={16} /> PM & Reports
                        </button>
                        <button className={activeDetailTab === 'client' ? 'active' : ''} onClick={() => setActiveDetailTab('client')}>
                            <FileText size={16} /> Cliente
                        </button>
                        <button className={activeDetailTab === 'tickets' ? 'active' : ''} onClick={() => setActiveDetailTab('tickets')}>
                            <Ticket size={16} /> Ticketing
                        </button>
                        <button className={activeDetailTab === 'chat' ? 'active' : ''} onClick={() => setActiveDetailTab('chat')}>
                            <MessageSquare size={16} /> Chat Team
                        </button>
                        <button className={activeDetailTab === 'calendar' ? 'active' : ''} onClick={() => setActiveDetailTab('calendar')}>
                            <CalendarIcon size={16} /> Calendar
                        </button>
                    </div>
                    {/* Tab Content */}
                    <div className="detail-content">
                        {activeDetailTab === 'overview' && (
                            <div className="overview-tab">
                                <div className="overview-grid">
                                    <div className="overview-card">
                                        <h3>Progress Generale</h3>
                                        <div className="big-progress">
                                            <div className="progress-circle">{selectedProject.progress_percentage}%</div>
                                            <div className="progress-bar-large" style={{ width: `${selectedProject.progress_percentage}%` }}></div>
                                        </div>
                                        {selectedProject.stats && (
                                            <div className="progress-details">
                                                <small>{selectedProject.stats.completed_tasks} / {selectedProject.stats.total_tasks} task completati</small>
                                            </div>
                                        )}
                                    </div>
                                    <div className="overview-card">
                                        <h3>Budget</h3>
                                        <div className="budget-info">
                                            <div className="budget-row">
                                                <span>Totale:</span>
                                                <strong>€ {selectedProject.budget_allocated?.toLocaleString('it-IT') || '0'}</strong>
                                            </div>
                                            <div className="budget-row">
                                                <span>Spesi:</span>
                                                <strong className="spent">€ {selectedProject.budget_spent?.toLocaleString('it-IT') || '0'}</strong>
                                            </div>
                                            <div className="budget-row">
                                                <span>Rimanente:</span>
                                                <strong className="remaining">€ {selectedProject.budget_remaining?.toLocaleString('it-IT') || '0'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overview-card">
                                        <h3>Timeline</h3>
                                        <div className="timeline-info">
                                            <div>Inizio: {new Date(selectedProject.start_date).toLocaleDateString('it-IT')}</div>
                                            {selectedProject.end_date && (
                                                <div>Fine: {new Date(selectedProject.end_date).toLocaleDateString('it-IT')}</div>
                                            )}
                                            {selectedProject.timeline_percentage !== undefined && (
                                                <div className="timeline-progress">{selectedProject.timeline_percentage}% tempo trascorso</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedProject.teamMembers && selectedProject.teamMembers.length > 0 && (
                                <div className="team-overview">
                                        <h3>Team Progetto ({selectedProject.teamMembers.length} membri)</h3>
                                    <div className="team-grid">
                                            {selectedProject.teamMembers.map((member: any) => (
                                            <div key={member.id} className="team-member-card-mini">
                                                    <div className="member-avatar-mini">
                                                        {member.user?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                                    </div>
                                                <div>
                                                        <div className="member-name">{member.user?.name || 'N/A'}</div>
                                                        <div className="member-role">{member.role || 'N/A'}</div>
                                                        <div className="member-type">
                                                            {member.payment_type === 'fisso' && 'Fisso'}
                                                            {member.payment_type === 'orario' && 'Orario'}
                                                            {member.payment_type === 'percentuale' && 'Percentuale'}
                                                            {member.payment_type === 'cocchi' && 'Cocchi'}
                                                        </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </div>
                        )}
                        {activeDetailTab === 'pm-reports' && (
                            <div className="pm-reports-tab">
                                <div className="pm-info-card">
                                    <h3>Project Manager</h3>
                                    <div className="pm-details">
                                        <div className="pm-avatar">
                                            {selectedProject.manager?.name?.split(' ').map((n: string) => n[0]).join('') || 'PM'}
                                        </div>
                                        <div>
                                            <div className="pm-name">{selectedProject.manager?.name || 'N/A'}</div>
                                            <div className="pm-email">{selectedProject.manager?.email || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="reports-section">
                                    <h3>Report Settimanali</h3>
                                    <div className="report-card">
                                        <p style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                                            Sistema di report settimanali in arrivo...
                                        </p>
                                        </div>
                                </div>
                            </div>
                        )}
                        {activeDetailTab === 'client' && (
                            <div className="client-tab">
                                <div className="client-info-card">
                                    <h3>Informazioni Cliente</h3>
                                    <div className="client-grid">
                                        <div className="client-field">
                                            <label>Nome:</label>
                                            <span>{selectedProject.client?.company_name || 'N/A'}</span>
                                        </div>
                                        <div className="client-field">
                                            <label>Email:</label>
                                            <span>{selectedProject.client?.email || 'N/A'}</span>
                                        </div>
                                        <div className="client-field">
                                            <label>Telefono:</label>
                                            <span>{selectedProject.client?.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeDetailTab === 'tickets' && (
                            <div className="tickets-tab">
                                <div className="tickets-header">
                                    <h3>Sistema Ticketing</h3>
                                    <button className="btn-new-ticket">
                                        <Plus size={14} /> Nuovo Ticket
                                    </button>
                                </div>
                                <div className="tickets-list">
                                    {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                                        selectedProject.tasks.map((task: any) => (
                                            <div key={task.id} className="ticket-card">
                                            <div className="ticket-header">
                                                    <h4>{task.title || 'Task senza titolo'}</h4>
                                                    <span className={`ticket-status ${task.status}`}>
                                                        {task.status === 'pending' && 'In Attesa'}
                                                        {task.status === 'in_progress' && 'In Lavorazione'}
                                                        {task.status === 'completed' && 'Completato'}
                                                </span>
                                            </div>
                                            <div className="ticket-meta">
                                                    <span className={`priority ${task.priority || 'medium'}`}>
                                                        {task.priority === 'high' && '🔴 Alta'}
                                                        {task.priority === 'medium' && '🟡 Media'}
                                                        {task.priority === 'low' && '🟢 Bassa'}
                                                </span>
                                                    {task.due_date && (
                                                        <span>Scadenza: {new Date(task.due_date).toLocaleDateString('it-IT')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-inline">
                                            <Ticket size={32} />
                                            <p>Nessun task trovato per questo progetto</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeDetailTab === 'chat' && (
                            <div className="chat-tab">
                                <div className="chat-messages">
                                    {selectedProject.chatMessages && selectedProject.chatMessages.length > 0 ? (
                                        selectedProject.chatMessages.map((msg: any) => (
                                        <div key={msg.id} className="chat-message">
                                                <div className="message-sender">{msg.user?.name || 'Utente'}</div>
                                            <div className="message-content">{msg.message}</div>
                                                <div className="message-time">
                                                    {new Date(msg.created_at).toLocaleString('it-IT')}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-inline">
                                            <MessageSquare size={32} />
                                            <p>Nessun messaggio ancora</p>
                                        </div>
                                    )}
                                </div>
                                <div className="chat-input">
                                    <input
                                        type="text"
                                        placeholder="Scrivi un messaggio..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button className="btn-send">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeDetailTab === 'calendar' && (
                            <div className="calendar-tab">
                                <div className="calendar-header">
                                    <h3>Calendar & Eventi</h3>
                                    <button className="btn-new-event">
                                        <Plus size={14} /> Nuovo Evento
                                    </button>
                                </div>
                                <div className="events-list">
                                    {selectedProject.calendarEvents && selectedProject.calendarEvents.length > 0 ? (
                                        selectedProject.calendarEvents.map((event: any) => (
                                            <div key={event.id} className={`event-card ${event.type}`}>
                                                <div className="event-date">
                                                    {new Date(event.start_datetime).toLocaleDateString('it-IT')}
                                                </div>
                                            <div className="event-title">{event.title}</div>
                                            <div className="event-type">
                                                    {event.type === 'task' && '📋 Task'}
                                                    {event.type === 'event' && '📅 Evento'}
                                                {event.type === 'call' && '📞 Call'}
                                                    {event.type === 'meeting' && '👥 Meeting'}
                                                    {event.type === 'document' && '📄 Documento'}
                                            </div>
                                                {event.location && (
                                                    <div className="event-location">📍 {event.location}</div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-inline">
                                            <CalendarIcon size={32} />
                                            <p>Nessun evento in calendario</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                    ) : (
                        <div className="error-state">
                            <AlertCircle size={48} />
                            <p>Progetto non trovato</p>
                            <button onClick={handleBackToProjectsList} className="btn-retry">Torna ai Progetti</button>
                        </div>
                    )}
                </>
            )}

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleProjectCreated}
                preselectedCrmId={selectedCrm?.id}
            />

            {/* CRM Department Modal */}
            <CrmDepartmentModal
                isOpen={isCrmModalOpen}
                onClose={() => {
                    setIsCrmModalOpen(false);
                    setSelectedCrmForEdit(null);
                }}
                onSuccess={handleCrmSaved}
                department={selectedCrmForEdit}
            />
        </div>
    );
};
export default Progetti;
