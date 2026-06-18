import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Plus, X, Check } from 'lucide-react';
import api from '../../lib/axios';
import { TaskDetailModal } from './TaskDetailModal';

interface ProjectTasksProps {
    projectId: string;
    tasks: any[];
    onTaskUpdate: () => void;
    members: any[];
    isPM?: boolean;
}

import { useAuth } from '../../context/AuthContext';

export function ProjectTasks({ projectId, tasks, onTaskUpdate, members, isPM }: ProjectTasksProps) {
    const { user } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        status: 'pending',
        assignees: [] as string[]
    });
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (selectedTask) {
            const updatedTask = tasks.find(t => t.id === selectedTask.id);
            if (updatedTask) {
                setSelectedTask(updatedTask);
            }
        }
    }, [tasks]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/tasks', { ...newTask, project_id: projectId });
            setIsCreating(false);
            setNewTask({ title: '', description: '', due_date: '', priority: 'medium', status: 'pending', assignees: [] });
            onTaskUpdate();
        } catch (error) {
            console.error('Failed to create task', error);
        }
    };

    const toggleAssignee = (userId: string) => {
        setNewTask(prev => {
            const assignees = prev.assignees.includes(userId)
                ? prev.assignees.filter(id => id !== userId)
                : [...prev.assignees, userId];
            return { ...prev, assignees };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Task del Progetto</h3>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Task
                </Button>
            </div>

            {isCreating && (
                <div className="glass-card p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
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
                            <label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                            <textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Assegnatari</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {newTask.assignees.map(assigneeId => {
                                    const member = members.find(m => m.id.toString() === assigneeId);
                                    return (
                                        <span key={assigneeId} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center">
                                            {member?.name}
                                            <button type="button" onClick={() => toggleAssignee(assigneeId)} className="ml-1 hover:text-white">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-950/50 rounded-lg border border-slate-800">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => toggleAssignee(member.id.toString())}
                                        className={`cursor-pointer p-2 rounded text-sm flex items-center gap-2 transition-colors ${newTask.assignees.includes(member.id.toString())
                                            ? 'bg-blue-600 text-white'
                                            : 'hover:bg-slate-800 text-slate-400'
                                            }`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                            {member.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{member.name}</span>
                                    </div>
                                ))}
                            </div>
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
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="low">Bassa</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Annulla</Button>
                            <Button type="submit">Crea Task</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {tasks.filter(task => {
                    if (user?.role === 'freelance') {
                        // Check if user is assigned OR is PM (passed via prop or checked against task logic if available)
                        // But here we rely on the backend filtering mostly, or we can double check.
                        // Since backend now returns all tasks for PMs, we should just show them.
                        // However, if we want to be safe:
                        if (isPM) return true;
                        return task.assignees?.some((a: any) => a.id === user.id);
                    }
                    return true;
                }).map((task) => (
                    <div key={task.id} className="glass-card p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                            {task.status === 'completed' ? (
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-500" />
                                </div>
                            ) : (
                                <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' :
                                    task.priority === 'high' ? 'bg-orange-500' :
                                        task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-500'
                                    }`} />
                            )}
                            <div>
                                <h4 className="text-white font-medium">{task.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span>Scadenza: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Nessuna data'}</span>
                                    <span>•</span>
                                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                    {task.assignees && task.assignees.length > 0 && (
                                        <>
                                            <span>•</span>
                                            <div className="flex -space-x-2">
                                                {task.assignees.map((assignee: any) => (
                                                    <div key={assignee.id} className="w-5 h-5 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center text-[10px] text-white" title={assignee.name}>
                                                        {assignee.name.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>Dettagli</Button>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="text-center py-8 text-slate-500">Nessun task trovato. Creane uno per iniziare.</div>
                )}
            </div>

            <TaskDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                task={selectedTask}
                onUpdate={onTaskUpdate}
                isProjectManager={isPM}
            />
        </div>
    );
}
