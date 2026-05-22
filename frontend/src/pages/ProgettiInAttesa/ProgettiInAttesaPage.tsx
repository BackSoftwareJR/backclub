import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Briefcase, 
    Calendar,
    User,
    Building2,
    UserCheck,
    Eye,
    LayoutGrid,
    List,
    ChevronRight
} from 'lucide-react';
import { crmProjectsApi, type CrmProject } from '../../api/crmProjects';
import './ProgettiInAttesaPage.css';

type ViewMode = 'cards' | 'rows';
type StatusFilter = 'all' | 'in_attesa_presa_carico' | 'preso_in_carico' | 'avviato' | 'active' | 'paused' | 'completed';

const ProgettiInAttesaPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<CrmProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    

    useEffect(() => {
        loadProjects();
    }, [statusFilter, currentPage]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
                loadProjects();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await crmProjectsApi.getAll({
                crm_department_code: 'PROGETTI IN ATTESA',
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: searchQuery || undefined,
                sort_by: 'created_at',
                sort_order: 'desc',
                per_page: 20,
                page: currentPage,
            });
            
            setProjects(response.data);
            setCurrentPage(response.pagination.current_page);
            setTotalPages(response.pagination.last_page);
        } catch (err: any) {
            console.error('Error loading projects:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento dei progetti');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            'in_attesa_presa_carico': { label: 'In Attesa', color: '#FF9500' },
            'preso_in_carico': { label: 'Preso in Carico', color: '#0A84FF' },
            'avviato': { label: 'Avviato', color: '#34C759' },
            'active': { label: 'Attivo', color: '#34C759' },
            'paused': { label: 'In Pausa', color: '#FF9500' },
            'completed': { label: 'Completato', color: '#0A84FF' },
        };
        return configs[status] || { label: status, color: '#8E8E93' };
    };

    const handleAssignProject = (project: CrmProject) => {
        navigate(`/assegna-progetto/${project.id}`);
    };

    return (
        <div className="progetti-in-attesa-page">
            {/* Header */}
            <div className="page-header">
                <div>
                        <h1>Progetti in Attesa</h1>
                    <p className="page-subtitle">
                        Progetti con contratto firmato in attesa di assegnazione
                    </p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="controls-bar">
                <div className="search-container">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca progetti..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="controls-right">
                    <div className="view-toggle">
                    <button
                            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title="Vista a cards"
                    >
                            <LayoutGrid size={18} />
                    </button>
                    <button
                            className={`view-btn ${viewMode === 'rows' ? 'active' : ''}`}
                            onClick={() => setViewMode('rows')}
                            title="Vista a righe"
                    >
                            <List size={18} />
                    </button>
                    </div>

                    <div className="filter-tabs">
                    <button
                            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setStatusFilter('all');
                                setCurrentPage(1);
                            }}
                    >
                            Tutti
                    </button>
                    <button
                            className={`filter-tab ${statusFilter === 'in_attesa_presa_carico' ? 'active' : ''}`}
                            onClick={() => {
                                setStatusFilter('in_attesa_presa_carico');
                                setCurrentPage(1);
                            }}
                    >
                            In Attesa
                    </button>
                    </div>
                </div>
            </div>

            {/* Projects List */}
            <div className="projects-container">
                {loading ? (
                    <div className="empty-state">
                        <div className="spinner"></div>
                        <p>Caricamento progetti...</p>
                    </div>
                ) : error ? (
                    <div className="empty-state">
                        <p className="error-text">{error}</p>
                        <button onClick={loadProjects} className="btn-retry">Riprova</button>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="empty-state">
                        <Briefcase size={48} />
                        <p>Nessun progetto trovato</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'cards' ? (
                            <div className="projects-grid">
                                {projects.map((project) => {
                                    const statusConfig = getStatusConfig(project.status);
                                    return (
                                        <div key={project.id} className="project-card">
                                            <div className="project-card-header">
                                                <div className="project-title-section">
                                                    <Briefcase size={20} />
                                                    <h3>{project.name}</h3>
                                                </div>
                                                <span 
                                                    className="status-badge"
                                                    style={{ 
                                                        backgroundColor: `${statusConfig.color}15`,
                                                        color: statusConfig.color
                                                    }}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            </div>

                                            <div className="project-card-body">
                                                {project.client && (
                                                    <div className="project-info-row">
                                                <Building2 size={16} />
                                                        <span>{project.client.company_name}</span>
                                            </div>
                                                )}
                                                
                                                {project.seller?.user && (
                                                    <div className="project-info-row">
                                                        <User size={16} />
                                                        <span>{project.seller.user.name}</span>
                                                    </div>
                                                )}

                                                {project.start_date && (
                                                    <div className="project-info-row">
                                                        <Calendar size={16} />
                                                        <span>{formatDate(project.start_date)}</span>
                                            </div>
                                                )}

                                                <div className="project-budget">
                                                    <span className="budget-label">Budget:</span>
                                                    <span className="budget-value">
                                                        {formatCurrency(project.budget_cocchi || 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="project-card-actions">
                                                <button
                                                    className="action-btn primary"
                                                    onClick={() => navigate(`/gestione-progetti/${project.id}`)}
                                                >
                                                    <Eye size={16} />
                                                    Dettagli
                                                </button>
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => handleAssignProject(project)}
                                                >
                                                    <UserCheck size={16} />
                                                    Assegna
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="projects-rows">
                                {projects.map((project) => {
                                    const statusConfig = getStatusConfig(project.status);
                                    return (
                                        <div 
                                            key={project.id} 
                                            className="project-row"
                                            onClick={() => navigate(`/gestione-progetti/${project.id}`)}
                                        >
                                            <div className="project-row-main">
                                                <div className="project-row-title">
                                                    <Briefcase size={18} />
                                                    <h3>{project.name}</h3>
                                                </div>
                                                <div className="project-row-info">
                                                    {project.client && (
                                                        <div className="info-item">
                                                            <Building2 size={14} />
                                                            <span>{project.client.company_name}</span>
                                                        </div>
                                                    )}
                                                    {project.seller?.user && (
                                                        <div className="info-item">
                                                            <User size={14} />
                                                            <span>{project.seller.user.name}</span>
                                                        </div>
                                                    )}
                                                    {project.start_date && (
                                                        <div className="info-item">
                                                            <Calendar size={14} />
                                                            <span>{formatDate(project.start_date)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="project-row-side">
                                                <div className="budget-display">
                                                    {formatCurrency(project.budget_cocchi || 0)}
                                                </div>
                                                <span 
                                                    className="status-badge"
                                                    style={{ 
                                                        backgroundColor: `${statusConfig.color}15`,
                                                        color: statusConfig.color
                                                    }}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                                <div className="row-actions">
                                                    <button
                                                        className="row-action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/gestione-progetti/${project.id}`);
                                                        }}
                                                        title="Visualizza dettagli"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        className="row-action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAssignProject(project);
                                                        }}
                                                        title="Assegna progetto"
                                                    >
                                                        <UserCheck size={18} />
                                                    </button>
                                                </div>
                                                <ChevronRight size={18} className="chevron-icon" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    Precedente
                                </button>
                                <span className="pagination-info">
                                    Pagina {currentPage} di {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Successiva
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
};

export default ProgettiInAttesaPage;
