import { Button } from '../ui/Button';
import { X, Plus, Calendar, CheckSquare, Clock } from 'lucide-react';

interface DayDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    events: any[];
    tasks: any[];
    onAddEvent: () => void;
    onEventClick: (event: any) => void;
    onTaskClick: (task: any) => void;
}

export function DayDetailModal({ isOpen, onClose, date, events, tasks, onAddEvent, onEventClick, onTaskClick }: DayDetailModalProps) {
    if (!isOpen) return null;

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const dateString = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">{dateString}</h2>
                        <p className="text-slate-400 text-sm">Dettagli del giorno</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Events Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Eventi
                            </h3>
                            <Button size="sm" variant="ghost" onClick={onAddEvent} className="h-8 text-blue-400 hover:text-blue-300">
                                <Plus className="w-3 h-3 mr-1" />
                                Aggiungi
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {events.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">Nessun evento programmato.</p>
                            ) : (
                                events.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="bg-slate-950 border border-slate-800 p-3 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">{event.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${event.type === 'meeting' ? 'bg-purple-500/10 text-purple-400' :
                                                    event.type === 'deadline' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {event.type}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <CheckSquare className="w-4 h-4" />
                            Tasks in Scadenza
                        </h3>
                        <div className="space-y-2">
                            {tasks.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">Nessun task in scadenza.</p>
                            ) : (
                                tasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className="bg-slate-950 border border-slate-800 p-3 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">{task.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <span className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' :
                                                            task.priority === 'high' ? 'bg-orange-500' :
                                                                task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-500'
                                                        }`} />
                                                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                            {task.assignees && task.assignees.length > 0 && (
                                                <div className="flex -space-x-2">
                                                    {task.assignees.map((assignee: any) => (
                                                        <div key={assignee.id} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-950 flex items-center justify-center text-[10px] text-white" title={assignee.name}>
                                                            {assignee.name.charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
