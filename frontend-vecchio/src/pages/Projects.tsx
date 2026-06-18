import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Plus, Calendar, MoreVertical } from 'lucide-react';
import api from '../lib/axios';

interface Project {
    id: number;
    name: string;
    description: string;
    status: string;
    priority: string;
    start_date: string;
    client: {
        company_name: string;
    };
}

import { useAuth } from '../context/AuthContext';

export default function Projects() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [freelancers, setFreelancers] = useState<any[]>([]);
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        client_id: '',
        manager_id: '',
        start_date: '',
        status: 'planning',
        priority: 'medium',
        budget: ''
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (isCreating) {
            api.get('/clients').then(res => setClients(res.data)).catch(console.error);
            api.get('/users?role=freelance').then(res => setFreelancers(res.data)).catch(console.error);
        }
    }, [isCreating]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!user?.id) {
                alert('User not identified. Please try logging in again.');
                return;
            }

            const payload = {
                ...newProject,
                // If manager_id is selected, use it. Otherwise fallback to current user (though UI enforces selection now)
                manager_id: newProject.manager_id || user.id,
                budget: newProject.budget === '' ? null : newProject.budget,
                client_id: Number(newProject.client_id)
            };

            await api.post('/projects', payload);
            setIsCreating(false);
            fetchProjects();
        } catch (error: any) {
            console.error('Failed to create project', error.response?.data || error);
            alert('Failed to create project: ' + (error.response?.data?.message || 'Unknown error'));
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Progetti</h1>
                    <p className="text-slate-400 mt-2">Gestisci i tuoi progetti in corso</p>
                </div>
                {user?.role === 'admin' && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        Nuovo Progetto
                    </Button>
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Crea Nuovo Progetto</h2>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Progetto</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Cliente</label>
                                    <select
                                        value={newProject.client_id}
                                        onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Seleziona Cliente...</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.company_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Project Manager</label>
                                    <select
                                        value={newProject.manager_id}
                                        onChange={(e) => setNewProject({ ...newProject, manager_id: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Seleziona Manager...</option>
                                        {freelancers.map(freelancer => (
                                            <option key={freelancer.id} value={freelancer.id}>{freelancer.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Data Inizio</label>
                                    <input
                                        type="date"
                                        value={newProject.start_date}
                                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Budget</label>
                                    <input
                                        type="number"
                                        value={newProject.budget}
                                        onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Annulla</Button>
                                <Button type="submit">Crea Progetto</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Caricamento progetti...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => window.location.hash = `#/projects/${project.id}`}
                            className="glass-card p-6 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer relative overflow-hidden"
                        >
                            {/* Project Manager Badge */}
                            {/* @ts-ignore */}
                            {user?.id === project.manager_id && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                                    Project Manager
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                    {project.status.replace('_', ' ')}
                                </div>
                                <button className="text-slate-500 hover:text-white transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description}</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800">
                                <div className="flex items-center text-slate-500 text-sm">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {new Date(project.start_date).toLocaleDateString()}
                                </div>
                                <div className="text-sm font-medium text-slate-300">
                                    {project.client?.company_name}
                                </div>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            Nessun progetto trovato. Creane uno per iniziare.
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
