import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';
import api from '../../lib/axios';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    projectId?: string;
    projects?: any[]; // List of available projects for selection
    initialDate?: Date;
    eventToEdit?: any;
}

export function EventModal({ isOpen, onClose, onUpdate, projectId, projects, initialDate, eventToEdit }: EventModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        type: 'event',
        location: '',
        project_id: '' // Add project_id to state
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setFormData({
                    title: eventToEdit.title,
                    description: eventToEdit.description || '',
                    start_date: eventToEdit.start_date.split('T')[0] + 'T' + eventToEdit.start_date.split('T')[1].substring(0, 5),
                    end_date: eventToEdit.end_date.split('T')[0] + 'T' + eventToEdit.end_date.split('T')[1].substring(0, 5),
                    type: eventToEdit.type || 'event',
                    location: eventToEdit.location || '',
                    project_id: eventToEdit.project_id || projectId || ''
                });
            } else {
                const defaultStart = initialDate ? new Date(initialDate) : new Date();
                defaultStart.setHours(9, 0, 0, 0);
                const defaultEnd = new Date(defaultStart);
                defaultEnd.setHours(10, 0, 0, 0);

                // Format for datetime-local input: YYYY-MM-DDThh:mm
                const formatDateTime = (date: Date) => {
                    const pad = (n: number) => n < 10 ? '0' + n : n;
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                };

                setFormData({
                    title: '',
                    description: '',
                    start_date: formatDateTime(defaultStart),
                    end_date: formatDateTime(defaultEnd),
                    type: 'event',
                    location: '',
                    project_id: projectId || ''
                });
            }
        }
    }, [isOpen, eventToEdit, initialDate, projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                project_id: formData.project_id || projectId // Use selected project or prop
            };

            if (eventToEdit) {
                await api.put(`/events/${eventToEdit.id}`, payload);
            } else {
                await api.post('/events', payload);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to save event', error);
            alert('Errore nel salvataggio dell\'evento');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;
        setIsLoading(true);
        try {
            await api.delete(`/events/${eventToEdit.id}`);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to delete event', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {eventToEdit ? 'Modifica Evento' : 'Nuovo Evento'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Selection if no projectId provided */}
                    {!projectId && projects && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Progetto</label>
                            <select
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            >
                                <option value="">Seleziona un progetto</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Titolo</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Inizio</label>
                            <input
                                type="datetime-local"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Fine</label>
                            <input
                                type="datetime-local"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="event">Evento</option>
                            <option value="meeting">Meeting</option>
                            <option value="deadline">Scadenza</option>
                            <option value="call">Call</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Luogo / Link</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="es. Google Meet o Ufficio"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24"
                        />
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-800">
                        {eventToEdit ? (
                            <Button type="button" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleDelete}>
                                Elimina
                            </Button>
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <Button variant="ghost" type="button" onClick={onClose}>Annulla</Button>
                            <Button type="submit" isLoading={isLoading}>Salva</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
