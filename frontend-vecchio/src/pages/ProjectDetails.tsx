import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Calendar as CalendarIcon, Users, ListTodo, LayoutDashboard, Plus, Pencil, BarChart3, MessageSquare } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { ProjectAnalytics } from '../components/projects/ProjectAnalytics';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import { ProjectTasks } from '../components/projects/ProjectTasks';
import { ProjectCalendar } from '../components/projects/ProjectCalendar';
import TaskRequests from './TaskRequests';
import { Clock } from 'lucide-react';
import { Chat } from '../components/projects/Chat';

// Placeholder components for tabs
const ProjectOverview = ({ project }: { project: any }) => (
    <div className="space-y-6">
        <div className="glass-card p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Descrizione</h3>
            <p className="text-slate-400">{project.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-xl">
                <h4 className="text-slate-400 text-sm mb-2">Budget</h4>
                <p className="text-2xl font-bold text-white">€{Number(project.budget).toLocaleString()}</p>
            </div>
            <div className="glass-card p-6 rounded-xl">
                <h4 className="text-slate-400 text-sm mb-2">Data Inizio</h4>
                <p className="text-2xl font-bold text-white">{new Date(project.start_date).toLocaleDateString()}</p>
            </div>
            <div className="glass-card p-6 rounded-xl">
                <h4 className="text-slate-400 text-sm mb-2">Stato</h4>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                    {project.status.replace('_', ' ')}
                </span>
            </div>
        </div>
    </div>
);



const ProjectTeam = ({ projectId, members, onMemberUpdate }: { projectId: string, members: any[], onMemberUpdate: () => void }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newMemberId, setNewMemberId] = useState('');
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    useEffect(() => {
        if (isAdding) {
            // Fetch users to add (simplified: fetching all users for now)
            api.get('/users').then(res => setAvailableUsers(res.data)).catch(console.error);
        }
    }, [isAdding]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${projectId}/members`, { user_id: newMemberId, role: 'member' });
            setIsAdding(false);
            setNewMemberId('');
            onMemberUpdate();
        } catch (error) {
            console.error('Failed to add member', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Membri del Team</h3>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Membro
                </Button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAddMember} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Seleziona Utente</label>
                            <select
                                value={newMemberId}
                                onChange={(e) => setNewMemberId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            >
                                <option value="">Seleziona un utente...</option>
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                ))}
                            </select>
                        </div>
                        <Button type="submit">Aggiungi</Button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <div key={member.id} className="glass-card p-6 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            {member.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="text-white font-medium">{member.name}</h4>
                            <p className="text-slate-400 text-sm">{member.email}</p>
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                                {member.pivot?.role || 'Member'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchProjectDetails();
    }, [id]);

    const fetchProjectDetails = async () => {
        try {
            const response = await api.get(`/projects/${id}`);
            setProject(response.data);
        } catch (error) {
            console.error('Failed to fetch project details', error);
            // navigate('/projects'); // Redirect if not found?
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="text-center py-12 text-slate-500">Caricamento progetto...</div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="text-center py-12 text-slate-500">Progetto non trovato</div>
            </DashboardLayout>
        );
    }

    const isPM = user?.id === project.manager_id;
    const isAdmin = user?.role === 'admin';
    const canEdit = isAdmin || isPM;

    // Define tabs based on role
    const tabs = [
        { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
        { id: 'tasks', label: 'Tasks', icon: ListTodo },
        { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    ];

    if (isAdmin || isPM) {
        tabs.push(
            { id: 'team', label: 'Team', icon: Users },
            { id: 'requests', label: 'Richieste', icon: Clock },
            { id: 'analytics', label: 'Statistiche', icon: BarChart3 },
            { id: 'chat', label: 'Chat', icon: MessageSquare }
        );
    } else {
        // Freelance Member View
        tabs.push(
            { id: 'requests', label: 'Le mie Richieste', icon: Clock },
            { id: 'chat', label: 'Chat', icon: MessageSquare }
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-8">
                <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4 pl-0 hover:bg-transparent hover:text-white text-slate-400">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna ai Progetti
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                        <p className="text-slate-400 mt-1">{project.client?.company_name}</p>
                    </div>
                    {canEdit && (
                        <Button variant="secondary" onClick={() => setIsEditing(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifica Progetto
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl mb-8 w-fit overflow-x-auto max-w-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
              flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && <ProjectOverview project={project} />}
                {activeTab === 'tasks' && <ProjectTasks projectId={id!} tasks={project.tasks || []} onTaskUpdate={fetchProjectDetails} members={project.members || []} isPM={isPM} />}
                {activeTab === 'calendar' && <ProjectCalendar tasks={project.tasks || []} projectId={id!} onTaskUpdate={fetchProjectDetails} />}
                {activeTab === 'team' && <ProjectTeam projectId={id!} members={project.members || []} onMemberUpdate={fetchProjectDetails} />}
                {activeTab === 'requests' && <TaskRequests projectId={id!} />}
                {activeTab === 'analytics' && <ProjectAnalytics project={project} tasks={project.tasks || []} />}
                {activeTab === 'chat' && (
                    <Chat projectId={id!} />
                )}
            </div>

            <EditProjectModal
                project={project}
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onUpdate={fetchProjectDetails}
            />
        </DashboardLayout>
    );
}
