import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { EventModal } from './EventModal';
import { DayDetailModal } from './DayDetailModal';
import { TaskDetailModal } from './TaskDetailModal';
import api from '../../lib/axios';

interface ProjectCalendarProps {
    tasks: any[];
    projectId?: string; // Made optional
    onTaskUpdate?: () => void;
    events?: any[]; // New prop
    projects?: any[]; // New prop for project selection in modal
}

export function ProjectCalendar({ tasks, projectId, onTaskUpdate, events: propEvents, projects }: ProjectCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalEvents, setInternalEvents] = useState<any[]>([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
    const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const events = propEvents || internalEvents;

    useEffect(() => {
        if (!propEvents && projectId) {
            fetchEvents();
        }
    }, [projectId, currentDate, propEvents]);

    useEffect(() => {
        if (selectedTask) {
            const updatedTask = tasks.find(t => t.id === selectedTask.id);
            if (updatedTask) {
                setSelectedTask(updatedTask);
            }
        }
    }, [tasks]);

    const fetchEvents = async () => {
        if (!projectId) return;
        try {
            const response = await api.get(`/events?project_id=${projectId}`);
            setInternalEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events', error);
        }
    };

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sunday

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    const handleToday = () => setCurrentDate(new Date());

    const handleDateClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(date);
        setIsDayDetailOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: any) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setIsEventModalOpen(true);
    };

    const handleTaskClick = (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        setSelectedTask(task);
        setIsTaskDetailOpen(true);
    };

    const renderMonthView = () => {
        const days = [];
        const totalDays = daysInMonth(currentDate);
        const startDay = firstDayOfMonth(currentDate);

        // Previous month padding
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-slate-900/30 border border-slate-800/50"></div>);
        }

        // Days of month
        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            // Filter tasks for this day
            const dayTasks = tasks.filter(t => t.due_date === dateStr);

            // Filter events for this day
            const dayEvents = events.filter(e => {
                const eventDate = new Date(e.start_date);
                return eventDate.getDate() === i && eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear();
            });

            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toDateString();

            days.push(
                <div
                    key={i}
                    onClick={() => handleDateClick(i)}
                    className={`min-h-[120px] bg-slate-900/50 border border-slate-800 p-2 transition-colors hover:bg-slate-800/50 cursor-pointer group relative ${isToday ? 'bg-blue-900/10' : ''}`}
                >
                    <div className={`text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400 group-hover:text-white'}`}>
                        {i}
                    </div>

                    <div className="space-y-1">
                        {/* Events */}
                        {dayEvents.map(event => (
                            <div
                                key={`evt-${event.id}`}
                                onClick={(e) => handleEventClick(e, event)}
                                className={`text-xs px-2 py-1 rounded truncate border-l-2 mb-1 cursor-pointer transition-transform hover:scale-[1.02] ${event.type === 'meeting' ? 'bg-purple-500/20 border-purple-500 text-purple-200' :
                                    event.type === 'deadline' ? 'bg-red-500/20 border-red-500 text-red-200' :
                                        'bg-blue-500/20 border-blue-500 text-blue-200'
                                    }`}
                                title={`${event.title} (${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                            >
                                <span className="font-bold mr-1">{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {event.title}
                            </div>
                        ))}

                        {/* Tasks */}
                        {dayTasks.map(task => (
                            <div
                                key={`task-${task.id}`}
                                onClick={(e) => handleTaskClick(e, task)}
                                className="text-xs px-2 py-1 rounded truncate bg-slate-800 text-slate-400 border border-slate-700 flex items-center cursor-pointer hover:bg-slate-700 transition-colors"
                                title={`Task: ${task.title}`}
                            >
                                {task.status === 'completed' ? (
                                    <Check className="w-3 h-3 text-green-500 mr-1.5" />
                                ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${task.priority === 'urgent' ? 'bg-red-500' :
                                        task.priority === 'high' ? 'bg-orange-500' :
                                            'bg-blue-500'
                                        }`} />
                                )}
                                {task.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="glass-card rounded-xl overflow-hidden flex flex-col h-[800px]">
            {/* Calendar Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {monthNames[currentDate.getMonth()]}
                        <span className="text-slate-500 font-normal">{currentDate.getFullYear()}</span>
                    </h3>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Oggi
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <Button onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setIsEventModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Evento
                </Button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/50">
                {dayNames.map(day => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-slate-950">
                {renderMonthView()}
            </div>

            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onUpdate={() => {
                    if (propEvents && onTaskUpdate) {
                        // If external events are used, we might need to trigger a refresh in parent
                        // But onTaskUpdate is for tasks. We might need onEventUpdate.
                        // For now, if internal fetching is used, fetchEvents is called.
                        // If external, we rely on parent refreshing or we call onTaskUpdate as a proxy if it refreshes everything.
                        onTaskUpdate();
                    } else {
                        fetchEvents();
                    }
                }}
                projectId={projectId}
                projects={projects}
                initialDate={selectedDate || new Date()}
                eventToEdit={selectedEvent}
            />

            <DayDetailModal
                isOpen={isDayDetailOpen}
                onClose={() => setIsDayDetailOpen(false)}
                date={selectedDate || new Date()}
                events={events.filter(e => {
                    if (!selectedDate) return false;
                    const d = new Date(e.start_date);
                    return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
                })}
                tasks={tasks.filter(t => {
                    if (!selectedDate) return false;
                    // Assuming due_date is YYYY-MM-DD string
                    const d = new Date(t.due_date);
                    // Adjust for timezone if necessary, but string comparison is safer if formats match
                    // Here we construct date from string to be safe
                    return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
                })}
                onAddEvent={() => {
                    setIsDayDetailOpen(false);
                    setSelectedEvent(null);
                    setIsEventModalOpen(true);
                }}
                onEventClick={(event) => {
                    setIsDayDetailOpen(false);
                    setSelectedEvent(event);
                    setIsEventModalOpen(true);
                }}
                onTaskClick={(task) => {
                    setIsDayDetailOpen(false);
                    setSelectedTask(task);
                    setIsTaskDetailOpen(true);
                }}
            />

            <TaskDetailModal
                isOpen={isTaskDetailOpen}
                onClose={() => setIsTaskDetailOpen(false)}
                task={selectedTask}
                onUpdate={() => {
                    if (onTaskUpdate) onTaskUpdate();
                }}
            />
        </div>
    );
}
