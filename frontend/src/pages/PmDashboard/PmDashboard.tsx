import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, 
    Clock,
    CheckCircle2,
    Users,
    ArrowRight,
    Eye
} from 'lucide-react';
import { crmProjectsApi, type CrmProject, type CrmProjectStats } from '../../api/crmProjects';
import './PmDashboard.css';

const PmDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<CrmProjectStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Progetti in attesa (limitati a 5 per preview)
    const [pendingProjects, setPendingProjects] = useState<CrmProject[]>([]);
    const [teamMembersCount, setTeamMembersCount] = useState(0);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Carica statistiche generali
            const statsResponse = await crmProjectsApi.getDashboardStats();
            setStats(statsResponse.data);
            
            // Carica progetti in attesa (solo i primi 5)
            const pendingResponse = await crmProjectsApi.getAll({
                status: 'in_attesa_presa_carico',
                per_page: 5,
                page: 1,
                sort_by: 'created_at',
                sort_order: 'desc',
            });
            setPendingProjects(pendingResponse.data);
            
            // Calcola team members unici (da tutti i progetti)
            const allProjectsResponse = await crmProjectsApi.getAll({
                per_page: 1000, // Carica molti progetti per contare team members
            });
            
            // Conta team members unici
            const uniqueTeamMembers = new Set<number>();
            allProjectsResponse.data.forEach(project => {
                if (project.teamMembers) {
                    project.teamMembers.forEach(member => {
                        if (member.is_active && member.user_id) {
                            uniqueTeamMembers.add(member.user_id);
                        }
                    });
                }
            });
            setTeamMembersCount(uniqueTeamMembers.size);
            
        } catch (err: any) {
            console.error('Error loading dashboard data:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento della dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="pm-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pm-dashboard">
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={loadDashboardData}>Riprova</button>
                </div>
            </div>
        );
    }

    // Calcola progetti attivi (preso_in_carico + avviato + active)
    const activeProjects = (stats?.preso_in_carico || 0) + (stats?.avviato || 0) + (stats?.active || 0);
    
    // Progetti conclusi
    const completedProjects = stats?.completed || 0;
    
    // Progetti in attesa
    const pendingCount = stats?.in_attesa_presa_carico || 0;

    return (
        <div className="pm-dashboard">
            {/* Header */}
            <div className="pm-dashboard-header">
                <div>
                    <h1>Project Manager Dashboard</h1>
                    <p className="subtitle">Panoramica generale dei progetti aziendali</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="pm-stats-grid">
                <div className="pm-stat-card active">
                    <div className="pm-stat-icon">
                        <Briefcase size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <div className="pm-stat-value">{activeProjects}</div>
                        <div className="pm-stat-label">PROGETTI ATTIVI</div>
                    </div>
                    <button 
                        className="pm-stat-action"
                        onClick={() => navigate('/gestione-progetti?status=active')}
                    >
                        <ArrowRight size={18} />
                    </button>
                </div>

                <div className="pm-stat-card pending">
                    <div className="pm-stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <div className="pm-stat-value">{pendingCount}</div>
                        <div className="pm-stat-label">IN ATTESA</div>
                    </div>
                    <button 
                        className="pm-stat-action"
                        onClick={() => navigate('/progetti-in-attesa')}
                    >
                        <ArrowRight size={18} />
                    </button>
                </div>

                <div className="pm-stat-card completed">
                    <div className="pm-stat-icon">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <div className="pm-stat-value">{completedProjects}</div>
                        <div className="pm-stat-label">PROGETTI CONCLUSI</div>
                    </div>
                    <button 
                        className="pm-stat-action"
                        onClick={() => navigate('/gestione-progetti?status=completed')}
                    >
                        <ArrowRight size={18} />
                    </button>
                </div>

                <div className="pm-stat-card team">
                    <div className="pm-stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="pm-stat-content">
                        <div className="pm-stat-value">{teamMembersCount}</div>
                        <div className="pm-stat-label">TEAM MEMBERS</div>
                    </div>
                    <button 
                        className="pm-stat-action"
                        onClick={() => navigate('/team')}
                    >
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            {/* Progetti in Attesa Preview */}
            {pendingProjects.length > 0 && (
                <div className="pm-pending-section">
                    <div className="pm-section-header">
                        <h2>Progetti in Attesa di Assegnazione</h2>
                        <button 
                            className="pm-view-all-btn"
                            onClick={() => navigate('/progetti-in-attesa')}
                        >
                            Vedi tutti
                        </button>
                    </div>
                    <div className="pm-pending-list">
                        {pendingProjects.map((project) => (
                            <div 
                                key={project.id} 
                                className="pm-pending-card"
                                onClick={() => navigate(`/progetti-in-attesa?project=${project.id}`)}
                            >
                                <div className="pm-pending-card-content">
                                    <div className="pm-pending-card-header">
                                        <Briefcase size={18} />
                                        <h3>{project.name}</h3>
                                    </div>
                                    {project.client && (
                                        <div className="pm-pending-card-client">
                                            <span>{project.client.company_name}</span>
                                        </div>
                                    )}
                                    {project.settings?.contract_number && (
                                        <div className="pm-pending-card-meta">
                                            <span>Contratto: {project.settings.contract_number}</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    className="pm-pending-card-action"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/progetti-in-attesa?project=${project.id}`);
                                    }}
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PmDashboard;

