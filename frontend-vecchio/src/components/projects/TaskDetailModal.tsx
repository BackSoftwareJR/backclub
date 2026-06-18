import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, Calendar, MessageSquare, Send } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any;
    onUpdate: () => void;
    isProjectManager?: boolean;
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdate, isProjectManager }: TaskDetailModalProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState(task?.status || 'pending');
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [isMoving, setIsMoving] = useState(false);
    const [newDeadline, setNewDeadline] = useState('');

    useEffect(() => {
        if (isOpen && task) {
            setStatus(task.status);
            fetchComments();
        }
    }, [isOpen, task]);

    const fetchComments = async () => {
        setIsLoadingComments(true);
        try {
            const response = await api.get(`/tasks/${task.id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSending(true);
        try {
            await api.post(`/tasks/${task.id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to send comment', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setStatus(newStatus);
        try {
            await api.put(`/tasks/${task.id}`, { status: newStatus });

            // Add system comment
            const statusLabel = newStatus.replace('_', ' ');
            await api.post(`/tasks/${task.id}/comments`, {
                content: `Stato aggiornato a: ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`
            });

            fetchComments(); // Refresh comments to show the new system note
            onUpdate();
        } catch (error) {
            console.error('Failed to update status', error);
            setStatus(task.status); // Revert on error
        }
    };

    const handleRequestReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/reschedule-requests', {
                task_id: task.id,
                requested_date: rescheduleDate,
                reason: rescheduleReason
            });
            setIsRescheduling(false);
            setRescheduleDate('');
            setRescheduleReason('');
            fetchComments(); // System comment added by backend
            alert('Richiesta inviata con successo');
        } catch (error) {
            console.error('Failed to request reschedule', error);
        }
    };

    const handleMoveDeadline = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/tasks/${task.id}`, { due_date: newDeadline });

            // Add system comment
            await api.post(`/tasks/${task.id}/comments`, {
                content: `Scadenza modificata a: ${new Date(newDeadline).toLocaleDateString()}`
            });

            setIsMoving(false);
            setNewDeadline('');
            fetchComments();
            onUpdate();
        } catch (error) {
            console.error('Failed to move deadline', error);
        }
    };

    const handleDeleteTask = async () => {
        if (!confirm('Sei sicuro di voler eliminare questo task?')) return;
        try {
            await api.delete(`/tasks/${task.id}`);
            onClose();
            onUpdate();
        } catch (error) {
            console.error('Failed to delete task', error);
        }
    };

    if (!isOpen || !task) return null;

    const isAssignee = task.assignees?.some((a: any) => a.id === user?.id);
    const canMove = user?.role === 'admin' || isProjectManager || (task.project?.manager_id === user?.id);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-in fade-in zoom-in-95 shadow-2xl">

                {/* Left Side: Task Details */}
                <div className="w-2/3 p-8 overflow-y-auto border-r border-slate-800">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {task.priority} Priority
                                </span>
                                <span className="text-slate-500 text-sm flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-white">{task.title}</h2>
                        </div>

                        <div className="flex gap-2">
                            {canMove ? (
                                <>
                                    <Button variant="secondary" size="sm" onClick={() => setIsMoving(true)}>Sposta</Button>
                                    <Button variant="danger" size="sm" onClick={handleDeleteTask}>Elimina</Button>
                                </>
                            ) : (
                                <Button variant="secondary" size="sm" onClick={() => setIsRescheduling(true)}>Richiedi Spostamento</Button>
                            )}
                        </div>
                    </div>

                    {isRescheduling && (
                        <div className="mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-white font-medium mb-3">Richiedi Spostamento Scadenza</h4>
                            <form onSubmit={handleRequestReschedule} className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nuova Data Richiesta</label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Motivazione</label>
                                    <textarea
                                        value={rescheduleReason}
                                        onChange={(e) => setRescheduleReason(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm"
                                        placeholder="Perché hai bisogno di più tempo?"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsRescheduling(false)}>Annulla</Button>
                                    <Button type="submit" size="sm">Invia Richiesta</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {isMoving && (
                        <div className="mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-white font-medium mb-3">Sposta Scadenza Task</h4>
                            <form onSubmit={handleMoveDeadline} className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nuova Scadenza</label>
                                    <input
                                        type="date"
                                        value={newDeadline}
                                        onChange={(e) => setNewDeadline(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsMoving(false)}>Annulla</Button>
                                    <Button type="submit" size="sm">Aggiorna Scadenza</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="prose prose-invert max-w-none mb-8">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Descrizione</h3>
                        <p className="text-slate-300 whitespace-pre-wrap">{task.description || "Nessuna descrizione fornita."}</p>
                    </div>

                    {/* Status Workflow for Assignees */}
                    <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 mb-8">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Avanzamento</h3>
                        <div className="flex items-center justify-between gap-2">
                            {['pending', 'in_progress', 'review', 'completed'].map((step, index) => {
                                const isCurrent = status === step;
                                const isCompleted = ['pending', 'in_progress', 'review', 'completed'].indexOf(status) > index;

                                return (
                                    <button
                                        key={step}
                                        onClick={() => handleStatusChange(step)}
                                        disabled={!isAssignee && !canMove}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            isCompleted ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                            }`}
                                    >
                                        {step.replace('_', ' ')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Assegnato a</h3>
                            <div className="flex flex-wrap gap-2">
                                {task.assignees?.map((assignee: any) => (
                                    <div key={assignee.id} className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-3 py-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                            {assignee.name.charAt(0)}
                                        </div>
                                        <span className="text-sm text-slate-300">{assignee.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Creato da</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">
                                    {task.created_by?.name?.charAt(0) || '?'}
                                </div>
                                <span className="text-slate-300">{task.created_by?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Comments & Activity */}
                <div className="w-1/3 bg-slate-950 flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Note & Aggiornamenti
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isLoadingComments ? (
                            <div className="text-center text-slate-500 py-4">Caricamento note...</div>
                        ) : comments.length === 0 ? (
                            <div className="text-center text-slate-500 py-8 italic">
                                Nessuna nota presente.<br />Scrivi qualcosa per iniziare la discussione.
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                                        {comment.user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-sm font-medium text-white">{comment.user.name}</span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(comment.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-lg rounded-tl-none text-sm text-slate-300 border border-slate-800">
                                            {comment.content}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <form onSubmit={handleSendComment} className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Scrivi una nota..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                            />
                            <Button type="submit" size="sm" disabled={isSending || !newComment.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
