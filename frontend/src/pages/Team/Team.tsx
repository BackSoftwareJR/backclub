import React, { useState } from 'react';
import { Users, UserCheck, UserPlus, TrendingUp, FolderKanban, Clock, Award, Shield, Plus, Mail, Phone } from 'lucide-react';
import './Team.css';

type TabType = 'members' | 'assignments' | 'hours' | 'performance' | 'permissions';

const Team: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('members');

    // Mock Data - Team Members
    const members = [
        { id: 1, name: 'Mario Rossi', role: 'Senior Developer', type: 'employee', email: 'mario.rossi@backclub.it', phone: '+39 333 1234567', projects: 3, hoursWeek: 40, tasksCompleted: 45, productivity: 92 },
        { id: 2, name: 'Laura Bianchi', role: 'Frontend Developer', type: 'employee', email: 'laura.bianchi@backclub.it', phone: '+39 333 2345678', projects: 2, hoursWeek: 38, tasksCompleted: 38, productivity: 88 },
        { id: 3, name: 'Marco Neri', role: 'Backend Developer', type: 'employee', email: 'marco.neri@backclub.it', phone: '+39 333 3456789', projects: 4, hoursWeek: 42, tasksCompleted: 52, productivity: 95 },
        { id: 4, name: 'Sofia Russo', role: 'UI/UX Designer', type: 'freelance', email: 'sofia@freelance.it', phone: '+39 333 4567890', projects: 2, hoursWeek: 25, tasksCompleted: 28, productivity: 85 },
        { id: 5, name: 'Giovanni Verdi', role: 'Project Manager', type: 'employee', email: 'giovanni.verdi@backclub.it', phone: '+39 333 5678901', projects: 5, hoursWeek: 40, tasksCompleted: 35, productivity: 90 },
        { id: 6, name: 'Anna Ferrari', role: 'Marketing Specialist', type: 'freelance', email: 'anna@freelance.it', phone: '+39 333 6789012', projects: 1, hoursWeek: 20, tasksCompleted: 22, productivity: 82 },
    ];

    // Mock Data - Project Assignments
    const assignments = [
        { member: 'Mario Rossi', project: 'Sito Web Tech Solutions', role: 'Lead Dev', hours: 120, start: '2024-11-01', end: '2025-03-15' },
        { member: 'Laura Bianchi', project: 'Sito Web Tech Solutions', role: 'Frontend', hours: 80, start: '2024-11-01', end: '2025-03-15' },
        { member: 'Marco Neri', project: 'CRM Enterprise', role: 'Backend', hours: 160, start: '2024-10-15', end: '2025-02-28' },
        { member: 'Sofia Russo', project: 'App Mobile Startup', role: 'Designer', hours: 60, start: '2024-12-01', end: '2025-04-20' },
        { member: 'Giovanni Verdi', project: 'Sito Web Tech Solutions', role: 'PM', hours: 40, start: '2024-11-01', end: '2025-03-15' },
    ];

    // Mock Data - Hour Tracking
    const hourStats = {
        thisWeek: 185,
        lastWeek: 192,
        billable: 78,
        nonBillable: 22,
        overtime: 12
    };

    // Stats
    const stats = {
        total: members.length,
        employees: members.filter(m => m.type === 'employee').length,
        freelancers: members.filter(m => m.type === 'freelance').length,
        utilization: 87
    };

    const tabs = [
        { id: 'members', label: 'Team Members', icon: Users },
        { id: 'assignments', label: 'Assegnazioni Progetti', icon: FolderKanban },
        { id: 'hours', label: 'Tracking Ore', icon: Clock },
        { id: 'performance', label: 'Performance', icon: Award },
        { id: 'permissions', label: 'Permessi', icon: Shield },
    ];

    return (
        <div className="team-page">

            {/* Header */}
            <div className="team-header">
                <div>
                    <h1>Gestione Team</h1>
                    <p className="subtitle">Overview completo team aziendale</p>
                </div>
                <button className="btn-add-member">
                    <Plus size={16} />
                    Nuovo Membro
                </button>
            </div>

            {/* Stats */}
            <div className="team-stats">
                <div className="stat-card-team total">
                    <Users size={24} />
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Team Members</div>
                    </div>
                </div>
                <div className="stat-card-team employees">
                    <UserCheck size={24} />
                    <div>
                        <div className="stat-value">{stats.employees}</div>
                        <div className="stat-label">Dipendenti</div>
                    </div>
                </div>
                <div className="stat-card-team freelancers">
                    <UserPlus size={24} />
                    <div>
                        <div className="stat-value">{stats.freelancers}</div>
                        <div className="stat-label">Freelance</div>
                    </div>
                </div>
                <div className="stat-card-team utilization">
                    <TrendingUp size={24} />
                    <div>
                        <div className="stat-value">{stats.utilization}%</div>
                        <div className="stat-label">Utilization Rate</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="team-tabs">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`team-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as TabType)}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="team-content">
                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="members-grid">
                        {members.map(member => (
                            <div key={member.id} className="member-card">
                                <div className="member-header-card">
                                    <div className="member-avatar-large">
                                        {member.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className={`member-type-badge ${member.type}`}>
                                        {member.type === 'employee' ? 'Dipendente' : 'Freelance'}
                                    </span>
                                </div>
                                <h3>{member.name}</h3>
                                <div className="member-role">{member.role}</div>
                                <div className="member-stats-mini">
                                    <div className="stat-mini">
                                        <FolderKanban size={14} />
                                        {member.projects} progetti
                                    </div>
                                    <div className="stat-mini">
                                        <Clock size={14} />
                                        {member.hoursWeek}h/week
                                    </div>
                                </div>
                                <div className="member-contact">
                                    <div className="contact-item">
                                        <Mail size={14} />
                                        {member.email}
                                    </div>
                                    <div className="contact-item">
                                        <Phone size={14} />
                                        {member.phone}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                    <div className="assignments-section">
                        <div className="assignments-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Membro</th>
                                        <th>Progetto</th>
                                        <th>Ruolo</th>
                                        <th>Ore Allocate</th>
                                        <th>Data Inizio</th>
                                        <th>Data Fine</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.map((assign, idx) => (
                                        <tr key={idx}>
                                            <td className="member-name-cell">{assign.member}</td>
                                            <td>{assign.project}</td>
                                            <td>{assign.role}</td>
                                            <td className="hours-cell">{assign.hours}h</td>
                                            <td>{new Date(assign.start).toLocaleDateString('it-IT')}</td>
                                            <td>{new Date(assign.end).toLocaleDateString('it-IT')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Hours Tab */}
                {activeTab === 'hours' && (
                    <div className="hours-section">
                        <div className="hours-overview">
                            <div className="hour-card">
                                <h3>Ore Questa Settimana</h3>
                                <div className="hour-value">{hourStats.thisWeek}h</div>
                                <div className="hour-change">-7h rispetto settimana scorsa</div>
                            </div>
                            <div className="hour-card">
                                <h3>Billable vs Non-Billable</h3>
                                <div className="billable-chart">
                                    <div className="chart-bar billable" style={{ width: `${hourStats.billable}%` }}>
                                        {hourStats.billable}%
                                    </div>
                                    <div className="chart-bar non-billable" style={{ width: `${hourStats.nonBillable}%` }}>
                                        {hourStats.nonBillable}%
                                    </div>
                                </div>
                                <div className="chart-legend">
                                    <span className="legend-item billable">Billable</span>
                                    <span className="legend-item non-billable">Non-Billable</span>
                                </div>
                            </div>
                            <div className="hour-card">
                                <h3>Straordinari</h3>
                                <div className="hour-value overtime">{hourStats.overtime}h</div>
                                <div className="hour-note">Questo mese</div>
                            </div>
                        </div>
                        <div className="weekly-hours-table">
                            <h3>Ore Settimanali per Membro</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Membro</th>
                                        <th>Lun</th>
                                        <th>Mar</th>
                                        <th>Mer</th>
                                        <th>Gio</th>
                                        <th>Ven</th>
                                        <th>Totale</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.slice(0, 4).map(member => (
                                        <tr key={member.id}>
                                            <td className="member-name-cell">{member.name}</td>
                                            <td>8h</td>
                                            <td>8h</td>
                                            <td>8h</td>
                                            <td>8h</td>
                                            <td>8h</td>
                                            <td className="total-hours">{member.hoursWeek}h</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                    <div className="performance-section">
                        <div className="performance-grid">
                            {members.map(member => (
                                <div key={member.id} className="performance-card">
                                    <div className="perf-header">
                                        <div className="member-avatar-small">
                                            {member.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="perf-name">{member.name}</div>
                                            <div className="perf-role">{member.role}</div>
                                        </div>
                                    </div>
                                    <div className="perf-metrics">
                                        <div className="metric-row">
                                            <span>Task Completati:</span>
                                            <strong>{member.tasksCompleted}</strong>
                                        </div>
                                        <div className="metric-row">
                                            <span>Progetti Attivi:</span>
                                            <strong>{member.projects}</strong>
                                        </div>
                                        <div className="metric-row">
                                            <span>Ore Settimanali:</span>
                                            <strong>{member.hoursWeek}h</strong>
                                        </div>
                                    </div>
                                    <div className="productivity-score">
                                        <div className="score-label">Productivity Score</div>
                                        <div className="score-bar-wrapper">
                                            <div className="score-bar" style={{ width: `${member.productivity}%` }}></div>
                                        </div>
                                        <div className="score-value">{member.productivity}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                    <div className="permissions-section">
                        <div className="permissions-intro">
                            <h2>Gestione Permessi e Ruoli</h2>
                            <p>Configura i permessi di accesso per ogni membro del team</p>
                        </div>
                        <div className="permissions-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Membro</th>
                                        <th>Ruolo Sistema</th>
                                        <th>Progetti</th>
                                        <th>Clienti</th>
                                        <th>Spese</th>
                                        <th>Team</th>
                                        <th>Admin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(member => (
                                        <tr key={member.id}>
                                            <td className="member-name-cell">{member.name}</td>
                                            <td>
                                                <select className="role-select">
                                                    <option>Team Member</option>
                                                    <option>Project Manager</option>
                                                    <option>Admin</option>
                                                </select>
                                            </td>
                                            <td><input type="checkbox" defaultChecked className="perm-checkbox" /></td>
                                            <td><input type="checkbox" defaultChecked={member.role.includes('Manager')} className="perm-checkbox" /></td>
                                            <td><input type="checkbox" className="perm-checkbox" /></td>
                                            <td><input type="checkbox" defaultChecked={member.role.includes('Manager')} className="perm-checkbox" /></td>
                                            <td><input type="checkbox" className="perm-checkbox" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Team;
