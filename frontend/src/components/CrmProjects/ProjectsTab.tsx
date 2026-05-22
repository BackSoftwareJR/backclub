import React from 'react';
import { Briefcase, Users, TrendingUp, Calendar } from 'lucide-react';

interface Project {
    id: number;
    name: string;
    description?: string;
    status: string;
    budget_allocated: number;
    budget_spent: number;
    expenses_total: number;
    start_date?: string;
    end_date?: string;
    project_type?: string;
    icon?: string;
    color?: string;
    client_name?: string;
    team_count: number;
}

interface ProjectsTabProps {
    projects: Project[];
    loading: boolean;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ projects, loading }) => {
    if (loading) {
        return <div className="loading-state">Caricamento progetti...</div>;
    }

    if (projects.length === 0) {
        return (
            <div className="empty-state">
                <Briefcase size={48} style={{ color: '#8E8E93', marginBottom: '1rem' }} />
                <p>Nessun progetto trovato per questo CRM</p>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#34C759';
            case 'in_progress': return '#0A84FF';
            case 'pending': return ' #FF9F0A';
            case 'on_hold': return '#8E8E93';
            default: return '#5E5CE6';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'completed': 'Completato',
            'in_progress': 'In Corso',
            'pending': 'In Attesa',
            'on_hold': 'In Pausa',
        };
        return labels[status] || status;
    };

    return (
        <div className="projects-tab">
            <div className="projects-grid">
                {projects.map((project) => {
                    const budgetRemaining = project.budget_allocated - project.budget_spent;
                    const budgetPercent = project.budget_allocated > 0
                        ? (project.budget_spent / project.budget_allocated) * 100
                        : 0;

                    return (
                        <div key={project.id} className="project-card">
                            <div className="project-header">
                                <div className="project-icon" style={{ background: project.color || '#0A84FF' + '20' }}>
                                    <Briefcase size={20} style={{ color: project.color || '#0A84FF' }} />
                                </div>
                                <div className="project-info">
                                    <h4>{project.name}</h4>
                                    {project.client_name && (
                                        <p className="project-client">{project.client_name}</p>
                                    )}
                                </div>
                                <span
                                    className="project-status"
                                    style={{ background: getStatusColor(project.status) + '20', color: getStatusColor(project.status) }}
                                >
                                    {getStatusLabel(project.status)}
                                </span>
                            </div>

                            {project.description && (
                                <p className="project-description">{project.description}</p>
                            )}

                            <div className="project-stats">
                                <div className="stat">
                                    <TrendingUp size={16} />
                                    <div>
                                        <span className="stat-label">Budget</span>
                                        <span className="stat-value">¢{project.budget_allocated.toLocaleString('it-IT')}</span>
                                    </div>
                                </div>
                                <div className="stat">
                                    <Users size={16} />
                                    <div>
                                        <span className="stat-label">Team</span>
                                        <span className="stat-value">{project.team_count} membri</span>
                                    </div>
                                </div>
                            </div>

                            <div className="project-budget">
                                <div className="budget-info">
                                    <span>Speso: ¢{project.budget_spent.toLocaleString('it-IT')}</span>
                                    <span style={{ color: budgetRemaining < 0 ? '#FF453A' : '#34C759' }}>
                                        Rimanente: ¢{budgetRemaining.toLocaleString('it-IT')}
                                    </span>
                                </div>
                                <div className="budget-progress-bar">
                                    <div
                                        className="budget-progress-fill"
                                        style={{
                                            width: `${Math.min(budgetPercent, 100)}%`,
                                            background: budgetPercent > 100 ? '#FF453A' : budgetPercent > 80 ? '#FF9F0A' : '#34C759'
                                        }}
                                    />
                                </div>
                            </div>

                            {(project.start_date || project.end_date) && (
                                <div className="project-dates">
                                    <Calendar size={14} />
                                    <span>
                                        {project.start_date && new Date(project.start_date).toLocaleDateString('it-IT')}
                                        {project.start_date && project.end_date && ' - '}
                                        {project.end_date && new Date(project.end_date).toLocaleDateString('it-IT')}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectsTab;
