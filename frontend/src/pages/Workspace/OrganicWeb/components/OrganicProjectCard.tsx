import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, AlertCircle, Play, ChevronRight } from 'lucide-react';
import type { OrganicWebProject, SkillStatus } from '../../../../api/organicWeb';
import SkillRunStatusBadge from './SkillRunStatusBadge';

interface OrganicProjectCardProps {
    project: OrganicWebProject;
    skillStatus?: SkillStatus[];
}

const OrganicProjectCard: React.FC<OrganicProjectCardProps> = ({ project, skillStatus = [] }) => {
    const navigate = useNavigate();

    const pendingTasks = skillStatus.reduce((sum, s) => sum + s.pending_human_tasks, 0);
    const activeRuns = skillStatus.filter(s => s.last_run_status === 'running').length;
    const projectName = project.crmProject?.name ?? `Progetto #${project.id}`;

    const handleOpen = () => {
        navigate(`/workspace/organic_web/project/${project.id}`);
    };

    return (
        <div className="ow-project-card" onClick={handleOpen}>
            <div className="ow-project-card-header">
                <div className="ow-project-card-icon">
                    <Globe size={16} />
                </div>
                <div className="ow-project-card-meta">
                    <h3 className="ow-project-card-name">{projectName}</h3>
                    <a
                        className="ow-project-card-url"
                        href={project.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                    >
                        {project.website_url}
                    </a>
                </div>
                <div className="ow-project-card-status">
                    {project.is_active ? (
                        <span className="ow-badge ow-badge--green ow-badge--sm">Attivo</span>
                    ) : (
                        <span className="ow-badge ow-badge--gray ow-badge--sm">Inattivo</span>
                    )}
                </div>
            </div>

            {skillStatus.length > 0 && (
                <div className="ow-project-card-skills">
                    {skillStatus.map(s => (
                        s.last_run_status && (
                            <SkillRunStatusBadge
                                key={s.skill_id}
                                status={s.last_run_status}
                                size="sm"
                            />
                        )
                    ))}
                </div>
            )}

            <div className="ow-project-card-footer">
                <div className="ow-project-card-stats">
                    {pendingTasks > 0 && (
                        <span className="ow-project-card-stat ow-project-card-stat--alert">
                            <AlertCircle size={12} />
                            {pendingTasks} task in attesa
                        </span>
                    )}
                    {activeRuns > 0 && (
                        <span className="ow-project-card-stat ow-project-card-stat--running">
                            <Play size={12} />
                            {activeRuns} skill attiva
                        </span>
                    )}
                    {pendingTasks === 0 && activeRuns === 0 && (
                        <span className="ow-project-card-stat ow-project-card-stat--muted">
                            Nessuna attività in corso
                        </span>
                    )}
                </div>
                <button className="ow-project-card-open" onClick={handleOpen}>
                    Apri <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default OrganicProjectCard;
