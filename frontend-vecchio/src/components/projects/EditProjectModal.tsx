import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import api from '../../lib/axios';
import { X } from 'lucide-react';

interface EditProjectModalProps {
    project: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function EditProjectModal({ project, isOpen, onClose, onUpdate }: EditProjectModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        client_id: '',
        manager_id: '',
        start_date: '',
        end_date: '',
        status: '',
        priority: '',
        budget: ''
    });
    const [clients, setClients] = useState<any[]>([]);
    const [freelancers, setFreelancers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && project) {
            setFormData({
                name: project.name || '',
                description: project.description || '',
                client_id: project.client_id || '',
                manager_id: project.manager_id || '',
                start_date: project.start_date ? project.start_date.split('T')[0] : '',
                end_date: project.end_date ? project.end_date.split('T')[0] : '',
                status: project.status || 'planning',
                priority: project.priority || 'medium',
                budget: project.budget || ''
            });

            // Fetch dependencies
            api.get('/clients').then(res => setClients(res.data)).catch(console.error);
            api.get('/users?role=freelance').then(res => setFreelancers(res.data)).catch(console.error);
        }
    }, [isOpen, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                budget: formData.budget === '' ? null : formData.budget,
                client_id: Number(formData.client_id),
                manager_id: Number(formData.manager_id)
            };

            await api.put(`/projects/${project.id}`, payload);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update project', error);
            alert('Failed to update project');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Modifica Progetto</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nome Progetto</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Cliente</label>
                            <select
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
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
                                value={formData.manager_id}
                                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            >
                                <option value="">Seleziona Manager...</option>
                                {freelancers.map(freelancer => (
                                    <option key={freelancer.id} value={freelancer.id}>{freelancer.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Stato</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="planning">Planning</option>
                                <option value="active">Active</option>
                                <option value="on_hold">On Hold</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Priorità</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Data Inizio</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Data Fine</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Budget</label>
                            <input
                                type="number"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-32"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        <Button variant="ghost" type="button" onClick={onClose}>Annulla</Button>
                        <Button type="submit" isLoading={isLoading}>Salva Modifiche</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
