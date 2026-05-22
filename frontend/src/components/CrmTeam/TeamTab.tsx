import React from 'react';
import { User, Briefcase, DollarSign } from 'lucide-react';

interface TeamMember {
    user_id: number;
    name: string;
    email: string;
    role: string;
    projects: Array<{
        project_id: number;
        project_name: string;
        role: string;
        payment_type: string;
        payment_amount: number;
    }>;
    projects_count: number;
}

interface TeamTabProps {
    team: TeamMember[];
    loading: boolean;
}

const TeamTab: React.FC<TeamTabProps> = ({ team, loading }) => {
    if (loading) {
        return <div className="loading-state">Caricamento team...</div>;
    }

    if (team.length === 0) {
        return (
            <div className="empty-state">
                <User size={48} style={{ color: '#8E8E93', marginBottom: '1rem' }} />
                <p>Nessun membro del team trovato</p>
            </div>
        );
    }

    return (
        <div className="team-tab">
            <div className="team-members-grid">
                {team.map((member) => (
                    <div key={member.user_id} className="team-member-card">
                        <div className="member-header">
                            <div className="member-avatar">
                                <User size={24} />
                            </div>
                            <div className="member-info">
                                <h4>{member.name}</h4>
                                <p className="member-email">{member.email}</p>
                                <span className="member-role-badge">{member.role}</span>
                            </div>
                        </div>

                        <div className="member-projects">
                            <div className="section-title">
                                <Briefcase size={16} />
                                <span>{member.projects_count} Progetti</span>
                            </div>

                            {member.projects.map((project, idx) => (
                                <div key={idx} className="project-assignment">
                                    <div className="assignment-info">
                                        <span className="project-name">{project.project_name}</span>
                                        <span className="assignment-role">{project.role || 'Team Member'}</span>
                                    </div>
                                    <div className="assignment-payment">
                                        <DollarSign size={14} />
                                        <span>
                                            {project.payment_amount > 0
                                                ? `¢${project.payment_amount.toLocaleString('it-IT')}`
                                                : '-'
                                            }
                                        </span>
                                        <span className="payment-type">({project.payment_type})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamTab;
