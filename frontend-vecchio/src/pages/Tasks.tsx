import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Filter, AlertCircle, CheckCircle2, Clock, Circle, Plus, Users, LayoutDashboard } from 'lucide-react';
import api from '../lib/axios';
import { TaskDetailModal } from '../components/projects/TaskDetailModal';

interface Task {
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    project: {
        name: string;
    };
    assignees: {
        avatar: string;
        name: string;
    }[];
}

export default function Tasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false); // Added for new task creation
    const [newTask, setNewTask] = useState({ title: '', description: '', project_id: '', due_date: '', priority: 'medium', status: 'pending' }); // Added for new task creation

    // Filters
    const [users, setUsers] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        project_id: '',
        status: '',
        priority: '',
        assignee_id: ''
    });

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [filters]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const params: any = { ...filters };
            // For freelancers, force strict assignment filtering if requested by user logic
            // The user requested: "freelance devono vedere le loro task e basta anche se sono project manager"
            if (user?.role === 'freelance') {
                params.only_assigned = true;
            }
            const response = await api.get('/tasks', { params });
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/tasks', newTask);
            setIsCreating(false);
            setNewTask({ title: '', description: '', project_id: '', due_date: '', priority: 'medium', status: 'pending' });
            fetchTasks();
        } catch (error) {
            console.error('Failed to create task', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'in_progress': return <Clock className="w-5 h-5 text-blue-400" />;
            case 'review': return <AlertCircle className="w-5 h-5 text-purple-400" />;
            default: return <Circle className="w-5 h-5 text-slate-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    if (isLoading && tasks.length === 0) {
        return (
            <DashboardLayout>
                <div className="text-center py-12 text-slate-500">Caricamento tasks...</div>
            </DashboardLayout>
        );
    }

    const isFreelance = user?.role === 'freelance';

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        {isFreelance ? 'Le tue Task' : 'Tasks'}
                    </h1>
                    <p className="text-slate-400 mt-2">
                        {isFreelance ? 'Gestisci le task assegnate a te' : 'Gestisci tutte le task dei progetti'}
                    </p>
                </div>
                {!isFreelance && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        Nuova Task
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-2 rounded-lg flex items-center px-4 border border-slate-800">
                    <Filter className="w-4 h-4 text-slate-400 mr-2" />
                    <select
                        value={filters.project_id}
                        onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
                        className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 w-full"
                    >
                        <option value="">Tutti i Progetti</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                </div>

                {!isFreelance && (
                    <div className="glass-card p-2 rounded-lg flex items-center px-4 border border-slate-800">
                        <Users className="w-4 h-4 text-slate-400 mr-2" />
                        <select
                            value={filters.assignee_id}
                            onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value })}
                            className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 w-full"
                        >
                            <option value="">Tutti gli Utenti</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="glass-card p-2 rounded-lg flex items-center px-4 border border-slate-800">
                    <LayoutDashboard className="w-4 h-4 text-slate-400 mr-2" />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 w-full"
                    >
                        <option value="">Tutti gli Stati</option>
                        <option value="pending">Da Fare</option>
                        <option value="in_progress">In Corso</option>
                        <option value="review">In Revisione</option>
                        <option value="completed">Completato</option>
                        <option value="on_hold">In Pausa</option>
                    </select>
                </div>

                <div className="glass-card p-2 rounded-lg flex items-center px-4 border border-slate-800">
                    <AlertCircle className="w-4 h-4 text-slate-400 mr-2" />
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                        className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 w-full"
                    >
                        <option value="">Tutte le Priorità</option>
                        <option value="low">Bassa</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>

                {(filters.project_id || filters.status || filters.priority || filters.assignee_id) && (
                    <div className="col-span-full flex justify-end">
                        <button
                            onClick={() => setFilters({ project_id: '', status: '', priority: '', assignee_id: '' })}
                            className="text-sm text-red-400 hover:text-red-300"
                        >
                            Reset Filtri
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Caricamento tasks...</div>
            ) : (
                <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                            <p>Nessuna task trovata con i filtri correnti.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                                className="glass-card p-4 rounded-xl hover:bg-slate-800/50 transition-all group flex items-center gap-4 cursor-pointer"
                            >
                                <div className="flex-shrink-0">
                                    {getStatusIcon(task.status)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-semibold text-white truncate">{task.title}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)} capitalize`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-400 gap-4">
                                        <span className="truncate">{task.project?.name}</span>
                                        {task.due_date && (
                                            <span>Scadenza: {new Date(task.due_date).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex -space-x-2">
                                    {task.assignees?.map((assignee, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white" title={assignee.name}>
                                            {assignee.avatar ? (
                                                <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full" />
                                            ) : (
                                                assignee.name.charAt(0)
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 rounded-xl w-full max-w-lg animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Nuovo Task</h2>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Titolo</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Progetto</label>
                                <select
                                    value={newTask.project_id}
                                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Seleziona Progetto</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Scadenza</label>
                                    <input
                                        type="date"
                                        value={newTask.due_date}
                                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Priorità</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="low">Bassa</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Annulla</Button>
                                <Button type="submit">Crea Task</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TaskDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                task={selectedTask}
                onUpdate={fetchTasks}
            />
        </DashboardLayout>
    );
}
