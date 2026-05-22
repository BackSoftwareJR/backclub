import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Briefcase, 
    Clock,
    CheckCircle2,
    PauseCircle,
    Archive,
    Eye,
    User,
    Building2,
    Play,
    UserCheck
} from 'lucide-react';
import { crmProjectsApi, type CrmProject, type CrmProjectStats } from '../../api/crmProjects';
import './GestioneProgettiPage.css';

type StatusFilter = 'all' | 'in_attesa_presa_carico' | 'preso_in_carico' | 'avviato' | 'active' | 'paused' | 'completed' | 'archived';

const GestioneProgettiPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<CrmProject[]>([]);
    const [stats, setStats] = useState<CrmProjectStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        loadProjects();
        loadStats();
    }, [statusFilter, currentPage]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== '') {
                loadProjects();
            } else if (searchQuery === '') {
                loadProjects();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await crmProjectsApi.getAll({
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
            setTotalItems(response.pagination.total);
        } catch (err: any) {
            console.error('Error loading projects:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento dei progetti');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await crmProjectsApi.getDashboardStats();
            setStats(response.data);
        } catch (err: any) {
            console.error('Error loading stats:', err);
        }
    };

    const handleStatusChange = (newStatus: StatusFilter) => {
        setStatusFilter(newStatus);
        setCurrentPage(1);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
            in_attesa_presa_carico: { label: 'In Attesa Presa in Carico', color: '#FF9500', icon: Clock },
            preso_in_carico: { label: 'Preso in Carico', color: '#0A84FF', icon: UserCheck },
            avviato: { label: 'Avviato', color: '#34C759', icon: Play },
            active: { label: 'Attivo', color: '#34C759', icon: CheckCircle2 },
            paused: { label: 'In Pausa', color: '#FF9500', icon: PauseCircle },
            completed: { label: 'Completato', color: '#0A84FF', icon: CheckCircle2 },
            archived: { label: 'Archiviato', color: '#8E8E93', icon: Archive },
        };
        
        const config = statusConfig[status] || statusConfig.active;
        const Icon = config.icon;
        
        return (
            <span className="status-badge" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    return (
        <div className="gestione-progetti-page">
            {/* Header Section */}
            <div className="page-header-section">
                <div className="header-content">
                    <div className="header-title-section">
                        <div className="header-icon-wrapper">
                            <Briefcase size={28} />
                        </div>
                        <div>
                            <h1>Gestione Progetti</h1>
                            <p className="header-subtitle">
                                Visualizza e gestisci tutti i progetti avviati dai contratti
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search Section */}
            <div className="filters-section">
                <h2 className="section-title">Filtri e Ricerca</h2>
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca per nome progetto, cliente, venditore..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => handleStatusChange('all')}
                    >
                        Tutti ({stats?.total || 0})
                    </button>
                    {stats?.in_attesa_presa_carico !== undefined && (
                        <button
                            className={`filter-btn ${statusFilter === 'in_attesa_presa_carico' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('in_attesa_presa_carico')}
                        >
                            In Attesa ({stats.in_attesa_presa_carico})
                        </button>
                    )}
                    {stats?.preso_in_carico !== undefined && (
                        <button
                            className={`filter-btn ${statusFilter === 'preso_in_carico' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('preso_in_carico')}
                        >
                            Presi in Carico ({stats.preso_in_carico})
                        </button>
                    )}
                    {stats?.avviato !== undefined && (
                        <button
                            className={`filter-btn ${statusFilter === 'avviato' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('avviato')}
                        >
                            Avviati ({stats.avviato})
                        </button>
                    )}
                    <button
                        className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => handleStatusChange('completed')}
                    >
                        Completati ({stats?.completed || 0})
                    </button>
                </div>
            </div>

            {/* Projects Table Section */}
            <div className="projects-section">
                <div className="section-header">
                    <h2 className="section-title">Lista Progetti</h2>
                    <div className="section-info">
                        {!loading && (
                            <span className="projects-count">
                                {totalItems} {totalItems === 1 ? 'progetto' : 'progetti'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="projects-table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Caricamento progetti...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={loadProjects}>Riprova</button>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="empty-state">
                        <Briefcase size={48} />
                        <p>Nessun progetto trovato</p>
                    </div>
                ) : (
                    <>
                        <table className="projects-table">
                            <thead>
                                <tr>
                                    <th>Progetto</th>
                                    <th>Cliente</th>
                                    <th>Venditore</th>
                                    <th>Responsabile</th>
                                    <th>Stato</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((project) => (
                                    <tr key={project.id} onClick={() => navigate(`/gestione-progetti/${project.id}`)}>
                                        <td>
                                            <div className="table-cell-project">
                                                {project.cover_photo_url ? (
                                                    <div className="table-cell-project-cover" style={{ backgroundImage: `url(${project.cover_photo_url})` }} />
                                                ) : (
                                                    <Briefcase size={16} />
                                                )}
                                                <span>{project.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-cell-client">
                                                <Building2 size={16} />
                                                <span>{project.client?.company_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {project.seller?.user ? (
                                                <div className="table-cell-seller">
                                                    <User size={16} />
                                                    <span>{project.seller.user.name}</span>
                                                </div>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {project.manager ? (
                                                <div className="table-cell-seller">
                                                    <UserCheck size={16} />
                                                    <span>{project.manager.name}</span>
                                                </div>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(project.status)}</td>
                                        <td>
                                            <button
                                                className="table-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/gestione-progetti/${project.id}`);
                                                }}
                                                title="Visualizza dettagli"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

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
                                    Pagina {currentPage} di {totalPages} ({totalItems} progetti)
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
        </div>
    );
};

export default GestioneProgettiPage;

