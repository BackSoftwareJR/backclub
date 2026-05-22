import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    X,
    Video,
    FileText,
    AlertCircle,
    Edit,
    Trash2,
    Plus,
    Download,
    MapPin,
    MessageSquare,
    Clock,
    User,
    CheckCircle,
    XCircle,
    ArrowRight,
    Calendar
} from 'lucide-react';
import { 
    projectCalendarApi, 
    type ProjectCalendarItem,
    type CreateCalendarItemData,
    type ChecklistItem,
    crmProjectTeamMembersApi,
    type User as AvailableUser,
    crmProjectTasksApi,
    type CrmProjectTeamMember,
    crmProjectsApi
} from '../../api/crmProjects';
import { useAuth } from '../../context/AuthContext';
import './ProjectCalendar.css';

export type CalendarItemType = 'task' | 'event' | 'call' | 'deadline' | 'reminder';

export interface CalendarItem {
    id: number;
    type: CalendarItemType;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    color?: string;
    assignedTo?: number[];
    visibility?: 'all' | 'freelance' | 'specific';
    visibleTo?: number[];
    // Metadata per export
    createdBy?: number;
    createdByName?: string;
    originalEvent?: ProjectCalendarItem;
    originalTask?: any;
    // Task specific
    taskId?: number;
    taskStatus?: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
    taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
    // Call specific
    callLink?: string;
    callNotes?: string;
    callParticipants?: number[];
    // Event specific
    eventLocation?: string;
    checklistItems?: ChecklistItem[];
    hasChecklist?: boolean;
    // Deadline specific
    deadlineType?: string;
    // All day events
    isAllDay?: boolean;
    // Completion status
    isCompleted?: boolean;
    completedAt?: Date;
    completedBy?: number;
}

interface ProjectCalendarProps {
    projectId: number;
    tasks?: any[];
    onItemDrag?: (itemId: number, newStartTime: Date, newEndTime: Date) => Promise<void>;
}

// Tutte le 24 ore
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAYS_OF_WEEK_SHORT = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// Componente Mini-Calendario
const MiniCalendar: React.FC<{
    currentDate: Date;
    weekDates: Date[];
    onDateSelect: (date: Date) => void;
    onMonthChange: (direction: 'prev' | 'next') => void;
    calendarItems: CalendarItem[];
}> = ({ currentDate, weekDates, onDateSelect, onMonthChange, calendarItems }) => {
    const [viewMonth, setViewMonth] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setViewMonth(prev => {
            const newMonth = new Date(prev);
            if (direction === 'prev') {
                newMonth.setMonth(prev.getMonth() - 1);
            } else {
                newMonth.setMonth(prev.getMonth() + 1);
            }
            return newMonth;
        });
        onMonthChange(direction);
    };

    const daysInMonth = getDaysInMonth(viewMonth);
    const firstDay = getFirstDayOfMonth(viewMonth);
    const days = [];
    
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    
    // Aggiungi giorni del mese
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i));
    }

    const hasEventsOnDay = (date: Date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return calendarItems.some(item => 
            item.startTime >= dayStart && item.startTime <= dayEnd
        );
    };

    const isInCurrentWeek = (date: Date) => {
        return weekDates.some(weekDate => 
            weekDate.toDateString() === date.toDateString()
        );
    };

    const isToday = (date: Date) => {
        return date.toDateString() === new Date().toDateString();
    };

    return (
        <div className="mini-calendar">
            <div className="mini-calendar-header">
                <button 
                    className="mini-calendar-nav-btn"
                    onClick={() => handleMonthChange('prev')}
                >
                    <ChevronLeft size={16} />
                </button>
                <div className="mini-calendar-month-year">
                    {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <button 
                    className="mini-calendar-nav-btn"
                    onClick={() => handleMonthChange('next')}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
            <div className="mini-calendar-weekdays">
                {DAYS_OF_WEEK_SHORT.map(day => (
                    <div key={day} className="mini-calendar-weekday">{day}</div>
                ))}
            </div>
            <div className="mini-calendar-days">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="mini-calendar-day empty" />;
                    }
                    const isTodayDate = isToday(date);
                    const inWeek = isInCurrentWeek(date);
                    const hasEvents = hasEventsOnDay(date);
                    
                    return (
                        <button
                            key={date.toISOString()}
                            className={`mini-calendar-day ${isTodayDate ? 'today' : ''} ${inWeek ? 'in-week' : ''} ${hasEvents ? 'has-events' : ''}`}
                            onClick={() => onDateSelect(date)}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
    projectId,
    tasks = [],
    onItemDrag
}) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.current_role === 'admin' || user?.roles?.includes('admin');
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; timeSlot: Date } | null>(null);
    const [draggedItem, setDraggedItem] = useState<CalendarItem | null>(null);
    const [resizingItem, setResizingItem] = useState<{ item: CalendarItem; edge: 'top' | 'bottom' } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createType, setCreateType] = useState<CalendarItemType | null>(null);
    const [createStartTime, setCreateStartTime] = useState<Date | null>(null);
    const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
    const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [showTaskSelectionModal, setShowTaskSelectionModal] = useState(false);
    const [selectedDayTasks, setSelectedDayTasks] = useState<CalendarItem[]>([]);
    const [selectedDateForTasks, setSelectedDateForTasks] = useState<Date | null>(null);
    const [editFormData, setEditFormData] = useState<CreateCalendarItemData | null>(null);
    const [deletingItem, setDeletingItem] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<ChecklistItem[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [projectManagerId, setProjectManagerId] = useState<number | null>(null);
    const [completingItem, setCompletingItem] = useState(false);
    const [dragEnabled, setDragEnabled] = useState(false);
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
    const DRAG_THRESHOLD = 5; // Pixel di movimento minimo per considerare un drag
    const [enabledCalendars, setEnabledCalendars] = useState<Record<string, boolean>>({
        'all': true,
        'tasks': true,
        'events': true,
        'calls': true,
        'deadlines': true
    });
    const [showSpecificVisibilityOnly, setShowSpecificVisibilityOnly] = useState(false);
    const [hourHeight, setHourHeight] = useState(75); // Altezza default per 12 ore visibili
    const [viewportHeight, setViewportHeight] = useState(900);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [teamMembers, setTeamMembers] = useState<CrmProjectTeamMember[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    
    // Form state per eventi/call/deadline
    const [formData, setFormData] = useState<CreateCalendarItemData>({
        type: 'event',
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: '',
        call_link: '',
        call_notes: '',
        deadline_type: '',
        color: '',
        visibility: 'all',
        visible_to: [],
        checklist_items: [],
        has_checklist: false
    });
    const [formChecklist, setFormChecklist] = useState<ChecklistItem[]>([]);
    const [newFormChecklistItem, setNewFormChecklistItem] = useState('');

    // Form state per task
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        status: 'pending' as 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        start_date: '',
        due_date: '',
        assignments: [] as Array<{
            user_id?: number;
            payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
            hourly_rate_cocchi?: number;
            hours_requested?: number;
            task_rate_cocchi?: number;
            project_rate_cocchi?: number;
        }>
    });

    // Form state per modifica task
    const [editTaskFormData, setEditTaskFormData] = useState<{
        title: string;
        description: string;
        status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
        priority: 'low' | 'medium' | 'high' | 'urgent';
        start_date: string;
        due_date: string;
    } | null>(null);

    // Utenti partecipanti per call
    const [callParticipants, setCallParticipants] = useState<number[]>([]);
    
    // Note e Timeline per task
    const [taskNotes, setTaskNotes] = useState<any[]>([]);
    const [taskEvents, setTaskEvents] = useState<any[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    
    const daysWrapperRef = useRef<HTMLDivElement>(null);
    const timeColumnRef = useRef<HTMLDivElement>(null);
    const calendarContainerRef = useRef<HTMLDivElement>(null);
    const dragStartPosRef = useRef<{ x: number; y: number; item: CalendarItem } | null>(null);

    // Calcola la settimana corrente
    const getWeekDates = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            week.push(date);
        }
        return week;
    };

    const weekDates = getWeekDates();

    // Calcola altezza dinamica per 12 ore visibili
    useEffect(() => {
        const calculateHourHeight = () => {
            if (!calendarContainerRef.current) return;
            
            const container = calendarContainerRef.current;
            const headerHeight = 60; // Altezza header giorni
            const availableHeight = container.clientHeight - headerHeight;
            const calculatedHourHeight = availableHeight / 12;
            
            setViewportHeight(availableHeight);
            setHourHeight(Math.max(calculatedHourHeight, 50)); // Minimo 50px
        };

        calculateHourHeight();
        window.addEventListener('resize', calculateHourHeight);
        return () => window.removeEventListener('resize', calculateHourHeight);
    }, []);

    // Carica items del calendario
    useEffect(() => {
        loadCalendarItems();
    }, [projectId, tasks]);

    // Carica utenti disponibili e team members
    useEffect(() => {
        loadAvailableUsers();
        loadTeamMembers();
        loadProjectInfo();
    }, [projectId]);

    // Carica informazioni del progetto per verificare i permessi
    const loadProjectInfo = async () => {
        try {
            const response = await crmProjectsApi.getById(projectId);
            if (response.data.manager_id) {
                setProjectManagerId(response.data.manager_id);
            }
        } catch (error) {
            console.error('Error loading project info:', error);
        }
    };

    // Verifica se l'utente può completare eventi/call
    const canCompleteItem = (): boolean => {
        if (!user) return false;
        // Admin può sempre completare
        if (user.role === 'admin') return true;
        // Project manager può completare
        if (projectManagerId && user.id === projectManagerId) return true;
        return false;
    };

    const loadCalendarItems = async () => {
        try {
            const response = await projectCalendarApi.getItems(projectId);
            
            // Carica anche le informazioni di visibilità per gli eventi
            // L'API potrebbe non restituire visible_to, quindi dobbiamo gestirlo
            const eventItems: CalendarItem[] = response.data.events.map((event: any) => {
                const item: CalendarItem = {
                id: event.id,
                type: event.type as CalendarItemType,
                title: event.title,
                description: event.description || undefined,
                startTime: new Date(event.start_time),
                endTime: new Date(event.end_time),
                color: event.color || undefined,
                visibility: event.visibility,
                eventLocation: event.location || undefined,
                callLink: event.call_link || undefined,
                callNotes: event.call_notes || undefined,
                deadlineType: event.deadline_type || undefined,
                    isAllDay: false,
                    createdBy: event.created_by,
                    originalEvent: event
                };
                
                // Se l'evento ha visibilità specifica, carica gli utenti visibili
                if (event.visibility === 'specific' && event.visible_to) {
                    item.visibleTo = Array.isArray(event.visible_to) ? event.visible_to : [];
                }
                
                // Carica checklist se presente
                if (event.checklist_items) {
                    try {
                        const checklist = typeof event.checklist_items === 'string' 
                            ? JSON.parse(event.checklist_items) 
                            : event.checklist_items;
                        item.checklistItems = Array.isArray(checklist) ? checklist : [];
                        item.hasChecklist = item.checklistItems.length > 0;
                    } catch (e) {
                        item.checklistItems = [];
                        item.hasChecklist = false;
                    }
                }
                
                // Carica partecipanti per le call
                if (event.type === 'call' && event.visible_to && Array.isArray(event.visible_to)) {
                    item.callParticipants = event.visible_to;
                }
                
                // Carica stato completamento
                if (event.completed_at) {
                    item.isCompleted = true;
                    item.completedAt = new Date(event.completed_at);
                    item.completedBy = event.completed_by || undefined;
                } else {
                    item.isCompleted = false;
                }
                
                return item;
            });

            const taskItems: CalendarItem[] = (response.data.tasks || tasks || []).map((task: any) => ({
                id: task.id,
                type: 'task' as CalendarItemType,
                title: task.title,
                description: task.description,
                startTime: new Date(task.start_date || task.due_date),
                endTime: new Date(task.due_date || task.start_date),
                taskId: task.id,
                taskStatus: task.status,
                taskPriority: task.priority,
                color: getTaskColor(task.status, task.priority),
                isAllDay: !task.start_date || task.start_date === task.due_date,
                createdBy: task.created_by,
                createdByName: task.creator?.name,
                originalTask: task
            }));

            setCalendarItems([...eventItems, ...taskItems]);
        } catch (error) {
            console.error('Error loading calendar items:', error);
            const taskItems: CalendarItem[] = (tasks || []).map(task => ({
                id: task.id,
                type: 'task' as CalendarItemType,
                title: task.title,
                description: task.description,
                startTime: new Date(task.start_date || task.due_date),
                endTime: new Date(task.due_date || task.start_date),
                taskId: task.id,
                taskStatus: task.status,
                taskPriority: task.priority,
                color: getTaskColor(task.status, task.priority),
                isAllDay: !task.start_date || task.start_date === task.due_date
            }));
            setCalendarItems(taskItems);
        }
    };

    const getTaskColor = (status?: string, priority?: string): string => {
        if (status === 'completed') return '#34C759';
        if (status === 'cancelled') return '#8E8E93';
        if (priority === 'urgent') return '#FF3B30';
        if (priority === 'high') return '#FF9500';
        if (priority === 'medium') return '#0A84FF';
        return '#5856D6';
    };

    const getItemTypeColor = (type: CalendarItemType): string => {
        switch (type) {
            case 'task': return '#0A84FF';
            case 'event': return '#5856D6';
            case 'call': return '#FF9500';
            case 'deadline': return '#FF3B30';
            case 'reminder': return '#34C759';
            default: return '#8E8E93';
        }
    };

    // Navigazione settimana
    const goToPreviousWeek = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            return newDate;
        });
    };

    const goToNextWeek = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            return newDate;
        });
    };


    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    // Sincronizzazione scroll: colonna tempo segue lo scroll delle colonne giorni
    const handleDaysWrapperScroll = useCallback(() => {
        if (!daysWrapperRef.current || !timeColumnRef.current) return;
        
        const scrollTop = daysWrapperRef.current.scrollTop;
        timeColumnRef.current.style.transform = `translateY(-${scrollTop}px)`;
    }, []);

    // Context menu (click destro)
    const handleContextMenu = (e: React.MouseEvent, timeSlot: Date) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, timeSlot });
    };

    const loadAvailableUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await crmProjectTeamMembersApi.getAvailableUsers();
            setAvailableUsers(response.data);
        } catch (error) {
            console.error('Error loading available users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const loadTeamMembers = async () => {
        if (!projectId) return;
        try {
            const response = await crmProjectTeamMembersApi.getByProject(projectId);
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    };

    // Ottieni gli utenti del team del progetto (team members + manager + seller)
    const getTeamUsers = () => {
        const teamUsers: Array<{ id: number; name: string; email?: string; role?: string }> = [];
        
        // Aggiungi team members
        teamMembers.forEach(member => {
            if (member.user) {
                teamUsers.push({
                    id: member.user_id,
                    name: member.user.name,
                    email: member.user.email,
                    role: member.role || 'Team Member'
                });
            }
        });
        
        return teamUsers;
    };

    const handleCreateItem = (type: CalendarItemType, timeSlot?: Date) => {
        const startTime = timeSlot || contextMenu?.timeSlot || new Date();
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1); // Default 1 ora

        // Formatta date per input datetime-local
        const formatDateTimeLocal = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Formatta date per input date
        const formatDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Colori default per tipo
        const defaultColors: Record<string, string> = {
            'event': '#5856D6',
            'call': '#FF9500',
            'deadline': '#FF3B30',
            'reminder': '#34C759',
            'task': '#0A84FF'
        };

        if (type === 'task') {
            // Inizializza form task
            setTaskFormData({
                title: '',
                description: '',
                status: 'pending',
                priority: 'medium',
                start_date: formatDate(startTime),
                due_date: formatDate(endTime),
                assignments: []
            });
        } else {
            // Inizializza form evento/call/deadline
        setFormData({
                type: type,
            title: '',
            description: '',
            start_time: formatDateTimeLocal(startTime),
            end_time: formatDateTimeLocal(endTime),
            location: '',
            call_link: '',
            call_notes: '',
            deadline_type: '',
            color: defaultColors[type] || '#5856D6',
            visibility: 'all',
            visible_to: []
        });
            setCallParticipants([]);
        }

        setCreateType(type);
        setCreateStartTime(startTime);
        setContextMenu(null);
        setShowCreateModal(true);
    };

    const handleFormChange = (field: keyof CreateCalendarItemData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVisibilityChange = (visibility: 'all' | 'freelance' | 'specific') => {
        setFormData(prev => ({
            ...prev,
            visibility,
            visible_to: visibility === 'specific' ? prev.visible_to : []
        }));
    };

    const handleVisibleToChange = (userId: number, checked: boolean) => {
        setFormData(prev => {
            const current = prev.visible_to || [];
            if (checked) {
                return { ...prev, visible_to: [...current, userId] };
            } else {
                return { ...prev, visible_to: current.filter(id => id !== userId) };
            }
        });
    };

    const handleSubmitEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            alert('Il titolo è obbligatorio');
            return;
        }

        if (!formData.start_time || !formData.end_time) {
            alert('Data e ora di inizio e fine sono obbligatorie');
            return;
        }

        if (new Date(formData.end_time) <= new Date(formData.start_time)) {
            alert('La data di fine deve essere successiva alla data di inizio');
            return;
        }

        if (formData.visibility === 'specific' && (!formData.visible_to || formData.visible_to.length === 0)) {
            alert('Seleziona almeno un utente per la visibilità specifica');
            return;
        }

        // Per le call, verifica che ci sia almeno un partecipante
        if (formData.type === 'call' && callParticipants.length === 0) {
            alert('Seleziona almeno un partecipante per la call');
            return;
        }

        try {
            setSaving(true);
            
            // Prepara i dati per l'API
            const submitData: CreateCalendarItemData = {
                type: formData.type,
                title: formData.title.trim(),
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
                visibility: formData.visibility,
                color: formData.color || undefined
            };

            // Aggiungi campi opzionali solo se valorizzati
            if (formData.description?.trim()) {
                submitData.description = formData.description.trim();
            }

            if (formData.type === 'event' && formData.location?.trim()) {
                submitData.location = formData.location.trim();
            }

            if (formData.type === 'call') {
                if (formData.call_link?.trim()) {
                    submitData.call_link = formData.call_link.trim();
                }
                if (formData.call_notes?.trim()) {
                    submitData.call_notes = formData.call_notes.trim();
                }
                // Aggiungi partecipanti per le call
                if (callParticipants.length > 0) {
                    submitData.visible_to = callParticipants;
                }
            }

            if (formData.type === 'deadline' && formData.deadline_type?.trim()) {
                submitData.deadline_type = formData.deadline_type.trim();
            }

            if (formData.visibility === 'specific' && formData.visible_to && formData.visible_to.length > 0) {
                submitData.visible_to = formData.visible_to;
            }

            // Aggiungi checklist se presente (solo per eventi)
            if (formData.type === 'event' && formData.has_checklist && formChecklist.length > 0) {
                submitData.checklist_items = formChecklist;
                submitData.has_checklist = true;
            }

            await projectCalendarApi.createItem(projectId, submitData);
            
            // Ricarica gli eventi
            await loadCalendarItems();
            
            // Chiudi modal e reset form
            setShowCreateModal(false);
            setCreateType(null);
            setCreateStartTime(null);
            setFormData({
                type: 'event',
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: '',
                call_link: '',
                call_notes: '',
                deadline_type: '',
                color: '',
                visibility: 'all',
            visible_to: [],
            checklist_items: [],
            has_checklist: false
            });
        setCallParticipants([]);
        setFormChecklist([]);
        setNewFormChecklistItem('');
        } catch (error: any) {
            console.error('Error creating calendar item:', error);
            alert(error.response?.data?.message || 'Errore nella creazione dell\'evento');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!taskFormData.title.trim()) {
            alert('Il titolo è obbligatorio');
            return;
        }

        if (taskFormData.assignments.length === 0) {
            alert('Aggiungi almeno un\'assegnazione utente');
            return;
        }

        // Verifica che tutte le assegnazioni abbiano un utente
        for (const assignment of taskFormData.assignments) {
            if (!assignment.user_id) {
                alert('Tutte le assegnazioni devono avere un utente selezionato');
                return;
            }
        }

        try {
            setSaving(true);
            
            const taskData: any = {
                title: taskFormData.title.trim(),
                description: taskFormData.description || undefined,
                status: taskFormData.status,
                priority: taskFormData.priority,
                start_date: taskFormData.start_date || undefined,
                due_date: taskFormData.due_date || undefined,
                assignments: taskFormData.assignments
            };

            await crmProjectTasksApi.create(projectId, taskData);
            
            // Ricarica gli eventi (i task vengono mostrati nel calendario)
            await loadCalendarItems();
            
            // Chiudi modal e reset form
            setShowCreateModal(false);
            setCreateType(null);
            setCreateStartTime(null);
            setTaskFormData({
                title: '',
                description: '',
                status: 'pending',
                priority: 'medium',
                start_date: '',
                due_date: '',
                assignments: []
            });
        } catch (error: any) {
            console.error('Error creating task:', error);
            alert(error.response?.data?.message || 'Errore nella creazione del task');
        } finally {
            setSaving(false);
        }
    };

    const handleAddTaskAssignment = () => {
        setTaskFormData(prev => ({
            ...prev,
            assignments: [...prev.assignments, {
                payment_method: 'hourly' as const
            }]
        }));
    };

    const handleRemoveTaskAssignment = (index: number) => {
        setTaskFormData(prev => ({
            ...prev,
            assignments: prev.assignments.filter((_, i) => i !== index)
        }));
    };

    const handleUpdateTaskAssignment = (index: number, field: string, value: any) => {
        setTaskFormData(prev => {
            const updated = [...prev.assignments];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, assignments: updated };
        });
    };

    const handleCallParticipantChange = (userId: number, checked: boolean) => {
        if (checked) {
            setCallParticipants(prev => [...prev, userId]);
        } else {
            setCallParticipants(prev => prev.filter(id => id !== userId));
        }
    };

    // Funzione per ottenere il nome utente da ID
    const getUserName = (userId?: number): string => {
        if (!userId) return 'N/A';
        const user = availableUsers.find(u => u.id === userId);
        return user?.name || `ID: ${userId}`;
    };

    // Funzione per ottenere la lista degli utenti visibili
    const getVisibleToNames = (item: CalendarItem): string => {
        if (!item.visibility) return 'N/A';
        
        if (item.visibility === 'all') {
            return 'Tutti nel progetto';
        } else if (item.visibility === 'freelance') {
            return 'Freelance';
        } else if (item.visibility === 'specific') {
            if (!item.visibleTo || item.visibleTo.length === 0) {
                return 'Nessuno';
            }
            return item.visibleTo.map(userId => getUserName(userId)).join(', ');
        }
        return 'N/A';
    };

    // Funzioni per caricare note ed eventi della task
    const loadTaskNotes = async (taskId: number) => {
        if (!selectedItem || selectedItem.type !== 'task') return;
        try {
            setLoadingNotes(true);
            const response = await crmProjectTasksApi.getNotes(projectId, taskId);
            if (response.success) {
                setTaskNotes(response.data || []);
            }
        } catch (error: any) {
            console.error('Error loading task notes:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const loadTaskEvents = async (taskId: number) => {
        if (!selectedItem || selectedItem.type !== 'task') return;
        try {
            setLoadingEvents(true);
            const response = await crmProjectTasksApi.getEvents(projectId, taskId);
            if (response.success) {
                setTaskEvents(response.data || []);
            }
        } catch (error: any) {
            console.error('Error loading task events:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    // Carica note ed eventi quando si apre il popup della task
    useEffect(() => {
        if (showItemDetailsModal && selectedItem?.type === 'task' && selectedItem.taskId) {
            loadTaskNotes(selectedItem.taskId);
            loadTaskEvents(selectedItem.taskId);
        } else {
            setTaskNotes([]);
            setTaskEvents([]);
        }
    }, [showItemDetailsModal, selectedItem?.taskId]);

    // Funzione per aggiungere una nota
    const handleAddNote = async () => {
        if (!selectedItem || selectedItem.type !== 'task' || !selectedItem.taskId || !newNoteText.trim()) {
            return;
        }

        try {
            setSavingNote(true);
            const response = await crmProjectTasksApi.createNote(projectId, selectedItem.taskId, newNoteText.trim());
            if (response.success) {
                setNewNoteText('');
                await loadTaskNotes(selectedItem.taskId);
                await loadTaskEvents(selectedItem.taskId); // Ricarica eventi per vedere la nuova nota nella timeline
            }
        } catch (error: any) {
            console.error('Error adding note:', error);
            alert(error.response?.data?.message || 'Errore nell\'aggiunta della nota');
        } finally {
            setSavingNote(false);
        }
    };

    // Funzione per ottenere il tipo evento in italiano
    const getEventTypeLabel = (item: CalendarItem): string => {
        switch (item.type) {
            case 'task': return 'Task';
            case 'event': return 'Evento';
            case 'call': return 'Call';
            case 'deadline': return 'Scadenza';
            case 'reminder': return 'Promemoria';
            default: return 'Sconosciuto';
        }
    };

    // Funzione helper per formattare CSV (gestisce virgole e virgolette)
    const formatCSVField = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Se contiene virgola, virgolette o newline, racchiudilo tra virgolette e raddoppia le virgolette
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Funzione per formattare data e ora separatamente
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Funzione per esportare CSV
    const handleExportCSV = () => {
        if (!exportStartDate || !exportEndDate) {
            alert('Seleziona un periodo valido');
            return;
        }

        const startDate = new Date(exportStartDate);
        const endDate = new Date(exportEndDate);
        endDate.setHours(23, 59, 59, 999); // Fine della giornata

        // Filtra gli eventi nel periodo selezionato
        const filteredItems = calendarItems.filter(item => {
            const itemDate = item.startTime;
            return itemDate >= startDate && itemDate <= endDate;
        });

        if (filteredItems.length === 0) {
            alert('Nessun evento trovato nel periodo selezionato');
            return;
        }

        // Prepara i dati CSV con colonne organizzate
        const csvRows = [];
        
        // Intestazione CSV - colonne ben organizzate
        const headers = [
            'Titolo',
            'Tipo',
            'Descrizione',
            'Data Inizio',
            'Ora Inizio',
            'Data Fine',
            'Ora Fine',
            'Durata (ore)',
            'Colore',
            'Creato da',
            'Visibilità',
            'Visibile a',
            // Colonne specifiche per tipo
            'Luogo', // Per eventi
            'Link Call', // Per call
            'Note Call', // Per call
            'Partecipanti Call', // Per call
            'Tipo Scadenza', // Per deadline
            'Checklist', // Per eventi
            'Stato Task', // Per task
            'Priorità Task' // Per task
        ];
        csvRows.push(headers.map(h => formatCSVField(h)).join(','));

        // Dati
        filteredItems.forEach(item => {
            // Calcola durata in ore
            const durationMs = item.endTime.getTime() - item.startTime.getTime();
            const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

            // Prepara checklist come stringa
            let checklistStr = '';
            if (item.checklistItems && item.checklistItems.length > 0) {
                checklistStr = item.checklistItems.map(ci => {
                    const status = ci.completed ? '✓' : '○';
                    return `${status} ${ci.text}`;
                }).join(' | ');
            }

            // Prepara partecipanti call
            let participantsStr = '';
            if (item.type === 'call' && item.callParticipants && item.callParticipants.length > 0) {
                participantsStr = item.callParticipants.map(userId => getUserName(userId)).join(', ');
            }

            const row = [
                formatCSVField(item.title || ''),
                formatCSVField(getEventTypeLabel(item)),
                formatCSVField(item.description || ''),
                formatCSVField(formatDate(item.startTime)),
                formatCSVField(formatTime(item.startTime)),
                formatCSVField(formatDate(item.endTime)),
                formatCSVField(formatTime(item.endTime)),
                formatCSVField(durationHours),
                formatCSVField(item.color || ''),
                formatCSVField(getUserName(item.createdBy) || ''),
                formatCSVField(item.visibility === 'all' ? 'Tutti' : item.visibility === 'freelance' ? 'Freelance' : 'Specifici'),
                formatCSVField(getVisibleToNames(item)),
                // Colonne specifiche per tipo
                formatCSVField(item.type === 'event' ? (item.eventLocation || '') : ''),
                formatCSVField(item.type === 'call' ? (item.callLink || '') : ''),
                formatCSVField(item.type === 'call' ? (item.callNotes || '') : ''),
                formatCSVField(item.type === 'call' ? participantsStr : ''),
                formatCSVField(item.type === 'deadline' ? (item.deadlineType || '') : ''),
                formatCSVField(item.type === 'event' ? checklistStr : ''),
                formatCSVField(item.type === 'task' ? (item.taskStatus || '') : ''),
                formatCSVField(item.type === 'task' ? (item.taskPriority || '') : '')
            ];
            csvRows.push(row.join(','));
        });

        // Crea il file CSV
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `calendario_${exportStartDate}_${exportEndDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Chiudi modal
        setShowExportModal(false);
        setExportStartDate('');
        setExportEndDate('');
    };

    // Funzione helper per calcolare posizione precisa con snap a 5 minuti (stile Apple)
    const calculateTimeFromPosition = useCallback((y: number, date: Date): Date => {
        // Calcola ore e minuti precisi dalla posizione Y
        // y è in pixel, hourHeight è l'altezza di un'ora in pixel
        // Quindi y / hourHeight dà le ore (con decimali)
        const hoursDecimal = y / hourHeight;
        const hours = Math.floor(hoursDecimal);
        const minutesDecimal = (hoursDecimal - hours) * 60;
        const minutes = Math.floor(minutesDecimal);
        
        // Snap a 5 minuti (come Apple Calendar) per una migliore UX
        const snappedMinutes = Math.round(minutes / 5) * 5;
        
        // Crea la data con l'ora calcolata
        const timeSlot = new Date(date);
        timeSlot.setHours(hours, snappedMinutes, 0, 0);
        
        return timeSlot;
    }, [hourHeight]);

    // Click su uno slot per creare evento
    const handleSlotClick = (e: React.MouseEvent, date: Date) => {
        if (draggedItem || resizingItem) return;
        if ((e.target as HTMLElement).closest('.calendar-item')) return;
        
        // Ottieni il container dei time slots (calendar-day-slots)
        const timeSlotsContainer = e.currentTarget as HTMLElement;
        const rect = timeSlotsContainer.getBoundingClientRect();
        
        // Calcola la posizione Y relativa al container dei time slots
        // e.clientY è la posizione del mouse nella viewport
        // rect.top è la posizione del container nella viewport
        // Quindi e.clientY - rect.top dà la posizione Y relativa al container
        const relativeY = e.clientY - rect.top;
        
        // Considera anche lo scroll se presente
        const wrapper = daysWrapperRef.current;
        const scrollTop = wrapper?.scrollTop || 0;
        
        // La Y totale è la posizione relativa al container + lo scroll
        const y = relativeY + scrollTop;
        
        // Assicuriamoci che y sia positivo e all'interno del range valido (0 - 24 ore)
        const clampedY = Math.max(0, Math.min(y, 24 * hourHeight - 1));
        
        // Calcola il tempo esatto dalla posizione Y
        const timeSlot = calculateTimeFromPosition(clampedY, date);
        
        // Imposta il tempo di inizio esattamente dove è stato cliccato
        setCreateStartTime(timeSlot);
        setCreateType(null);
        setShowCreateModal(true);
    };

    // Mouse down su item - inizia potenziale drag o click
    const handleItemMouseDown = (e: React.MouseEvent, item: CalendarItem) => {
        if (resizingItem) return;
        e.stopPropagation();
        
        // Salva posizione iniziale del mouse
        setMouseDownPos({ x: e.clientX, y: e.clientY });
        
        const itemElement = e.currentTarget as HTMLElement;
        const rect = itemElement.getBoundingClientRect();
        const wrapper = daysWrapperRef.current;
        if (!wrapper) return;
        
        // Calcola offset iniziale del mouse rispetto all'item
        const offsetY = e.clientY - rect.top;
        const offsetX = e.clientX - rect.left;
        
        dragStartPosRef.current = {
            x: e.clientX,
            y: e.clientY,
            item
        };
        
        setDragOffset({ x: offsetX, y: offsetY });
        setDraggedItem(item);
        setDragEnabled(false); // Non abilitato finché non c'è movimento
    };

    // Mouse up su item - verifica se è stato un click o un drag
    const handleItemMouseUp = (e: React.MouseEvent, item: CalendarItem) => {
        if (resizingItem) return;
        
        // Se il drag non è stato abilitato, significa che è stato solo un click
        if (!dragEnabled && mouseDownPos) {
            const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownPos.x, 2) + 
                Math.pow(e.clientY - mouseDownPos.y, 2)
            );
            
            // Se il movimento è stato minimo, apri i dettagli
            if (distance < DRAG_THRESHOLD) {
                e.stopPropagation();
                setSelectedItem(item);
                setIsEditingItem(false);
                setEditFormData(null);
                setShowItemDetailsModal(true);
            }
        }
        
        // Reset stato
        setMouseDownPos(null);
        
        // Se non c'è drag attivo, resetta tutto
        if (!dragEnabled) {
            setDraggedItem(null);
            setDragOffset(null);
            dragStartPosRef.current = null;
        }
    };

    // Funzione helper per formattare date per input datetime-local
    const formatDateTimeLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Funzione helper per formattare date per input date
    const formatDateLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Inizia modifica item
    const handleStartEdit = () => {
        if (!selectedItem) return;
        
        // Se è una task, usa il form delle task
        if (selectedItem.type === 'task') {
            setEditTaskFormData({
                title: selectedItem.title,
                description: selectedItem.description || '',
                status: selectedItem.taskStatus || 'pending',
                priority: selectedItem.taskPriority || 'medium',
                start_date: formatDateLocal(selectedItem.startTime),
                due_date: formatDateLocal(selectedItem.endTime)
            });
            setIsEditingItem(true);
            return;
        }
        
        // Prepara i dati del form con i valori attuali per eventi/call/deadline
        setEditFormData({
            type: selectedItem.type as 'event' | 'call' | 'deadline' | 'reminder',
            title: selectedItem.title,
            description: selectedItem.description || '',
            start_time: formatDateTimeLocal(selectedItem.startTime),
            end_time: formatDateTimeLocal(selectedItem.endTime),
            location: selectedItem.eventLocation || '',
            call_link: selectedItem.callLink || '',
            call_notes: selectedItem.callNotes || '',
            deadline_type: selectedItem.deadlineType || '',
            color: selectedItem.color || getItemTypeColor(selectedItem.type),
            visibility: selectedItem.visibility || 'all',
            visible_to: selectedItem.visibleTo || [],
            checklist_items: selectedItem.checklistItems || [],
            has_checklist: selectedItem.hasChecklist || false
        });
        setEditingChecklist(selectedItem.checklistItems ? [...selectedItem.checklistItems] : []);
        setIsEditingItem(true);
    };

    // Annulla modifica
    const handleCancelEdit = () => {
        setIsEditingItem(false);
        setEditFormData(null);
        setEditTaskFormData(null);
        setEditingChecklist([]);
        setNewChecklistItem('');
    };

    // Gestione checklist
    const handleToggleChecklist = () => {
        if (!editFormData) return;
        const newHasChecklist = !editFormData.has_checklist;
        setEditFormData(prev => prev ? { ...prev, has_checklist: newHasChecklist } : null);
        if (!newHasChecklist) {
            setEditingChecklist([]);
        }
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem: ChecklistItem = {
            id: Date.now().toString(),
            text: newChecklistItem.trim(),
            completed: false
        };
        setEditingChecklist(prev => [...prev, newItem]);
        setNewChecklistItem('');
    };

    const handleRemoveChecklistItem = (itemId: string) => {
        setEditingChecklist(prev => prev.filter(item => item.id !== itemId));
    };

    const handleToggleChecklistItem = (itemId: string) => {
        setEditingChecklist(prev => prev.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
        ));
    };



    // Contrassegna evento/call come completata
    const handleCompleteItem = async () => {
        if (!selectedItem || !user) return;
        
        // Verifica permessi
        if (!canCompleteItem()) {
            alert('Solo gli admin o i project manager possono contrassegnare item come completati');
            return;
        }
        
        try {
            setCompletingItem(true);
            
            // Se è una task, usa l'API delle task
            if (selectedItem.type === 'task' && selectedItem.taskId) {
                const isCurrentlyCompleted = selectedItem.taskStatus === 'completed';
                const newStatus = isCurrentlyCompleted ? 'in_progress' : 'completed';
                
                // Aggiorna immediatamente lo stato locale
                setSelectedItem(prev => prev ? {
                    ...prev,
                    taskStatus: newStatus as any
                } : null);
                
                // Salva sul backend
                await crmProjectTasksApi.update(projectId, selectedItem.taskId, {
                    status: newStatus
                });
                
                // Ricarica gli eventi per sincronizzare
                await loadCalendarItems();
            } else {
                // Per eventi e call
                const isCurrentlyCompleted = selectedItem.isCompleted;
                
                // Aggiorna immediatamente lo stato locale
                setSelectedItem(prev => prev ? {
                    ...prev,
                    isCompleted: !isCurrentlyCompleted,
                    completedAt: !isCurrentlyCompleted ? new Date() : undefined,
                    completedBy: !isCurrentlyCompleted ? user.id : undefined
                } : null);
                
                // Salva sul backend
                await projectCalendarApi.updateItem(projectId, selectedItem.id, {
                    completed_at: !isCurrentlyCompleted ? new Date().toISOString() : null,
                    completed_by: !isCurrentlyCompleted ? user.id : null
                });
                
                // Ricarica gli eventi per sincronizzare
                await loadCalendarItems();
            }
        } catch (error: any) {
            console.error('Error completing item:', error);
            alert(error.response?.data?.message || 'Errore nel completamento dell\'item');
            // Ripristina lo stato
            await loadCalendarItems();
        } finally {
            setCompletingItem(false);
        }
    };

    // Salva modifiche item
    const handleSaveEdit = async () => {
        if (!selectedItem) return;

        // Se è una task, gestisci la modifica task
        if (selectedItem.type === 'task' && editTaskFormData) {
            if (!editTaskFormData.title.trim()) {
                alert('Il titolo è obbligatorio');
                return;
            }

            if (!editTaskFormData.due_date) {
                alert('La data di scadenza è obbligatoria');
                return;
            }

            if (editTaskFormData.start_date && new Date(editTaskFormData.due_date) < new Date(editTaskFormData.start_date)) {
                alert('La data di scadenza deve essere successiva alla data di inizio');
                return;
            }

            try {
                setSaving(true);
                
                if (!selectedItem.taskId) {
                    throw new Error('Task ID non trovato');
                }

                await crmProjectTasksApi.update(projectId, selectedItem.taskId, {
                    title: editTaskFormData.title.trim(),
                    description: editTaskFormData.description || undefined,
                    status: editTaskFormData.status,
                    priority: editTaskFormData.priority,
                    start_date: editTaskFormData.start_date || undefined,
                    due_date: editTaskFormData.due_date
                });

                // Ricarica gli eventi
                await loadCalendarItems();
                
                // Chiudi modal e reset
                setIsEditingItem(false);
                setEditTaskFormData(null);
                setShowItemDetailsModal(false);
                setSelectedItem(null);
            } catch (error: any) {
                console.error('Error updating task:', error);
                alert(error.response?.data?.message || 'Errore nell\'aggiornamento del task');
            } finally {
                setSaving(false);
            }
            return;
        }

        // Gestione modifica eventi/call/deadline
        if (!editFormData) return;

        if (!editFormData.title.trim()) {
            alert('Il titolo è obbligatorio');
            return;
        }

        if (!editFormData.start_time || !editFormData.end_time) {
            alert('Data e ora di inizio e fine sono obbligatorie');
            return;
        }

        if (new Date(editFormData.end_time) <= new Date(editFormData.start_time)) {
            alert('La data di fine deve essere successiva alla data di inizio');
            return;
        }

        if (editFormData.visibility === 'specific' && (!editFormData.visible_to || editFormData.visible_to.length === 0)) {
            alert('Seleziona almeno un utente per la visibilità specifica');
            return;
        }

        try {
            setSaving(true);
            
            // Prepara i dati per l'API
            const submitData: Partial<CreateCalendarItemData> = {
                type: editFormData.type,
                title: editFormData.title.trim(),
                start_time: new Date(editFormData.start_time).toISOString(),
                end_time: new Date(editFormData.end_time).toISOString(),
                visibility: editFormData.visibility,
                color: editFormData.color || undefined
            };

            // Aggiungi campi opzionali solo se valorizzati
            if (editFormData.description?.trim()) {
                submitData.description = editFormData.description.trim();
            }

            if (editFormData.type === 'event' && editFormData.location?.trim()) {
                submitData.location = editFormData.location.trim();
            }

            if (editFormData.type === 'call') {
                if (editFormData.call_link?.trim()) {
                    submitData.call_link = editFormData.call_link.trim();
                }
                if (editFormData.call_notes?.trim()) {
                    submitData.call_notes = editFormData.call_notes.trim();
                }
            }

            if (editFormData.type === 'deadline' && editFormData.deadline_type?.trim()) {
                submitData.deadline_type = editFormData.deadline_type.trim();
            }

            if (editFormData.visibility === 'specific' && editFormData.visible_to && editFormData.visible_to.length > 0) {
                submitData.visible_to = editFormData.visible_to;
            }

            // Aggiungi checklist se presente
            if (editFormData.has_checklist && editingChecklist.length > 0) {
                submitData.checklist_items = editingChecklist;
                submitData.has_checklist = true;
            } else {
                submitData.checklist_items = [];
                submitData.has_checklist = false;
            }

            await projectCalendarApi.updateItem(projectId, selectedItem.id, submitData);
            
            // Ricarica gli eventi
            await loadCalendarItems();
            
            // Chiudi modal e reset
            setIsEditingItem(false);
            setEditFormData(null);
            setShowItemDetailsModal(false);
            setSelectedItem(null);
        } catch (error: any) {
            console.error('Error updating calendar item:', error);
            alert(error.response?.data?.message || 'Errore nell\'aggiornamento dell\'evento');
        } finally {
            setSaving(false);
        }
    };

    // Elimina item
    const handleDeleteItem = async () => {
        if (!selectedItem) return;

        if (!confirm(`Sei sicuro di voler eliminare "${selectedItem.title}"?`)) {
            return;
        }

        try {
            setDeletingItem(true);
            
            // Se è una task, usa l'API delle task
            if (selectedItem.type === 'task' && selectedItem.taskId) {
                await crmProjectTasksApi.delete(projectId, selectedItem.taskId);
            } else {
                // Altrimenti usa l'API del calendario
                await projectCalendarApi.deleteItem(projectId, selectedItem.id);
            }
            
            // Ricarica gli eventi
            await loadCalendarItems();
            
            // Chiudi modal
            setShowItemDetailsModal(false);
            setSelectedItem(null);
            setIsEditingItem(false);
            setEditFormData(null);
        } catch (error: any) {
            console.error('Error deleting calendar item:', error);
            alert(error.response?.data?.message || 'Errore nell\'eliminazione dell\'item');
        } finally {
            setDeletingItem(false);
        }
    };

    // Gestione cambio form modifica
    const handleEditFormChange = (field: keyof CreateCalendarItemData, value: any) => {
        if (!editFormData) return;
        setEditFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleEditVisibilityChange = (visibility: 'all' | 'freelance' | 'specific') => {
        if (!editFormData) return;
        setEditFormData(prev => prev ? {
            ...prev,
            visibility,
            visible_to: visibility === 'specific' ? prev.visible_to : []
        } : null);
    };

    const handleEditVisibleToChange = (userId: number, checked: boolean) => {
        if (!editFormData) return;
        setEditFormData(prev => {
            if (!prev) return null;
            const current = prev.visible_to || [];
            if (checked) {
                return { ...prev, visible_to: [...current, userId] };
            } else {
                return { ...prev, visible_to: current.filter(id => id !== userId) };
            }
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedItem || !dragStartPosRef.current || !daysWrapperRef.current) return;
        
        // Se il drag non è ancora abilitato, verifica se c'è stato movimento sufficiente
        if (!dragEnabled && mouseDownPos) {
            const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownPos.x, 2) + 
                Math.pow(e.clientY - mouseDownPos.y, 2)
            );
            
            // Se il movimento supera la soglia, abilita il drag
            if (distance >= DRAG_THRESHOLD) {
                setDragEnabled(true);
            } else {
                // Movimento insufficiente, non fare nulla ancora
                return;
            }
        }
        
        // Se il drag non è abilitato, esci
        if (!dragEnabled) return;
        
        const wrapper = daysWrapperRef.current;
        const wrapperRect = wrapper.getBoundingClientRect();
        const scrollTop = wrapper.scrollTop;
        
        // Calcola posizione Y relativa al wrapper
        const y = e.clientY - wrapperRect.top + scrollTop;
        
        // Trova quale giorno della settimana
        const dayWidth = wrapperRect.width / 7;
        const x = e.clientX - wrapperRect.left;
        const dayIndex = Math.floor(Math.min(Math.max(0, x / dayWidth), 6));
        
        // Calcola nuova posizione con snap a 5 minuti
        const targetDate = weekDates[dayIndex];
        const newStartTime = calculateTimeFromPosition(y - (dragOffset?.y || 0), targetDate);
        
        // Aggiorna posizione item in tempo reale
        const duration = draggedItem.endTime.getTime() - draggedItem.startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        setCalendarItems(prev => prev.map(item =>
            item.id === draggedItem.id
                ? { ...item, startTime: newStartTime, endTime: newEndTime }
                : item
        ));
    }, [draggedItem, dragOffset, weekDates, calculateTimeFromPosition, hourHeight, dragEnabled, mouseDownPos]);

    const handleMouseUp = useCallback(async () => {
        // Se il drag era abilitato, salva la posizione
        if (dragEnabled && draggedItem && dragStartPosRef.current) {
            const item = draggedItem;
            const updatedItem = calendarItems.find(i => i.id === item.id);
            
            if (updatedItem) {
                try {
                    await projectCalendarApi.dragItem(
                        projectId,
                        updatedItem.id,
                        updatedItem.startTime.toISOString(),
                        updatedItem.endTime.toISOString()
                    );
                    
                    if (onItemDrag) {
                        await onItemDrag(updatedItem.id, updatedItem.startTime, updatedItem.endTime);
                    }
                } catch (error) {
                    console.error('Error dragging item:', error);
                    alert('Errore nello spostamento dell\'item');
                    // Ripristina posizione originale
                    setCalendarItems(prev => prev.map(i =>
                        i.id === item.id ? item : i
                    ));
                }
            }
        }
        
        // Reset tutto
        setDraggedItem(null);
        setDragOffset(null);
        setDragEnabled(false);
        setMouseDownPos(null);
        dragStartPosRef.current = null;
    }, [dragEnabled, draggedItem, calendarItems, projectId, onItemDrag]);

    useEffect(() => {
        if (draggedItem) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [draggedItem, handleMouseMove, handleMouseUp]);

    // Resize eventi (trascinare bordi top/bottom)
    const handleResizeStart = (e: React.MouseEvent, item: CalendarItem, edge: 'top' | 'bottom') => {
        e.stopPropagation();
        e.preventDefault();
        setResizingItem({ item, edge });
    };

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizingItem || !daysWrapperRef.current) return;

        const wrapper = daysWrapperRef.current;
        const rect = wrapper.getBoundingClientRect();
        const scrollTop = wrapper.scrollTop;
        const y = e.clientY - rect.top + scrollTop;
        
        // Calcola giorno corrente dell'item
        const dayIndex = weekDates.findIndex(day => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            return resizingItem.item.startTime >= dayStart && resizingItem.item.startTime < dayEnd;
        });
        
        if (dayIndex === -1) return;
        
        const targetDate = weekDates[dayIndex];
        const newTime = calculateTimeFromPosition(y, targetDate);

        let newStartTime = resizingItem.item.startTime;
        let newEndTime = resizingItem.item.endTime;

        if (resizingItem.edge === 'top') {
            if (newTime < resizingItem.item.endTime) {
                newStartTime = newTime;
            }
        } else {
            if (newTime > resizingItem.item.startTime) {
                newEndTime = newTime;
            }
        }

        setCalendarItems(prev => prev.map(item =>
            item.id === resizingItem.item.id
                ? { ...item, startTime: newStartTime, endTime: newEndTime }
                : item
        ));
    }, [resizingItem, hourHeight, weekDates, calculateTimeFromPosition]);

    const handleResizeEnd = useCallback(async () => {
        if (!resizingItem) return;

        const item = resizingItem.item;
        const updatedItem = calendarItems.find(i => i.id === item.id);
        
        if (updatedItem) {
            try {
                await projectCalendarApi.dragItem(
                    projectId,
                    updatedItem.id,
                    updatedItem.startTime.toISOString(),
                    updatedItem.endTime.toISOString()
                );
            } catch (error) {
                console.error('Error resizing item:', error);
                alert('Errore nel ridimensionamento dell\'item');
                setCalendarItems(prev => prev.map(i =>
                    i.id === item.id ? item : i
                ));
            }
        }

        setResizingItem(null);
    }, [resizingItem, calendarItems, projectId]);

    useEffect(() => {
        if (resizingItem) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [resizingItem, handleResizeMove, handleResizeEnd]);

    // Calcola posizione e altezza di un item
    const getItemStyle = (item: CalendarItem, dayIndex: number): React.CSSProperties => {
        const dayStart = new Date(weekDates[dayIndex]);
        dayStart.setHours(0, 0, 0, 0);

        if (item.startTime < dayStart || item.startTime >= new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)) {
            return { display: 'none' };
        }

        if (item.isAllDay) {
            return {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '30px',
                backgroundColor: item.color || getItemTypeColor(item.type),
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'white',
                zIndex: 5
            };
        }

        const startHour = item.startTime.getHours();
        const startMin = item.startTime.getMinutes();
        const endHour = item.endTime.getHours();
        const endMin = item.endTime.getMinutes();

        const startMinutesTotal = startHour * 60 + startMin;
        const endMinutesTotal = endHour * 60 + endMin;
        const duration = endMinutesTotal - startMinutesTotal;

        const isResizing = resizingItem?.item.id === item.id;
        const isDragging = draggedItem?.id === item.id;

        // Calcola posizione e altezza usando hourHeight
        const top = (startMinutesTotal / 60) * hourHeight;
        const height = (duration / 60) * hourHeight;

        return {
            top: `${top}px`,
            height: `${Math.max(height, 20)}px`,
            backgroundColor: item.color || getItemTypeColor(item.type),
            opacity: isDragging ? 0.7 : 1,
            zIndex: isResizing || isDragging ? 20 : 10
        };
    };

    // Filtra items per giorno e tipo
    const getItemsForDay = (dayIndex: number): CalendarItem[] => {
        const dayStart = new Date(weekDates[dayIndex]);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        return calendarItems.filter(item => {
            const matchesDay = item.startTime >= dayStart && item.startTime < dayEnd;
            const calendarKey = item.type === 'task' ? 'tasks' : 
                               item.type === 'event' ? 'events' :
                               item.type === 'call' ? 'calls' :
                               item.type === 'deadline' ? 'deadlines' : 'all';
            const matchesType = enabledCalendars['all'] === false ? false : 
                               enabledCalendars[calendarKey] !== false;
            
            // Filtro per visibilità specifica (solo per admin)
            const matchesVisibility = isAdmin && showSpecificVisibilityOnly 
                ? item.visibility === 'specific'
                : true;
            
            return matchesDay && matchesType && matchesVisibility;
        });
    };

    // Calcola posizione linea rossa per ora corrente
    const getCurrentTimeLinePosition = (): number | null => {
        const now = new Date();
        const today = now.toDateString();
        const currentDayIndex = weekDates.findIndex(d => d.toDateString() === today);
        
        if (currentDayIndex === -1) return null;

        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const position = (currentHour * 60 + currentMinutes) / 60 * hourHeight;
        return position;
    };

    const currentTimeLinePosition = getCurrentTimeLinePosition();
    const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

    // Scroll automatico all'ora corrente
    useEffect(() => {
        if (daysWrapperRef.current && currentTimeLinePosition !== null) {
            const scrollPosition = currentTimeLinePosition - viewportHeight / 2;
            daysWrapperRef.current.scrollTop = Math.max(0, scrollPosition);
        }
    }, [currentTimeLinePosition, viewportHeight]);

    return (
        <div 
            className="project-calendar"
            ref={calendarContainerRef}
        >
            {/* Split View Layout */}
            <div className="calendar-split-view">
                {/* Sidebar Sinistra */}
                <div className="calendar-sidebar-left">
                    <div className="sidebar-content">
                        {/* Mini-Calendario - In alto */}
                        <div className="sidebar-mini-calendar-wrapper">
                        <MiniCalendar
                            currentDate={currentDate}
                            weekDates={weekDates}
                            onDateSelect={handleDateSelect}
                            onMonthChange={(dir) => {
                                if (dir === 'prev') goToPreviousWeek();
                                else goToNextWeek();
                            }}
                            calendarItems={calendarItems}
                        />
                        </div>
                    </div>

                    {/* Lista Calendari/Filtri - In basso */}
                    <div className="sidebar-calendars-section-bottom">
                        {/* Pulsante Esporta CSV */}
                        <div className="sidebar-export-section">
                            <button
                                className="btn-export-csv"
                                onClick={() => {
                                    // Imposta date di default (ultimo mese)
                                    const endDate = new Date();
                                    const startDate = new Date();
                                    startDate.setMonth(startDate.getMonth() - 1);
                                    
                                    setExportStartDate(startDate.toISOString().split('T')[0]);
                                    setExportEndDate(endDate.toISOString().split('T')[0]);
                                    setShowExportModal(true);
                                }}
                            >
                                <Download size={16} />
                                Esporta CSV
                            </button>
                        </div>
                        
                            <h3 className="sidebar-section-title">Calendari</h3>
                            <div className="sidebar-calendar-list">
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={enabledCalendars['all'] !== false}
                                        onChange={(e) => setEnabledCalendars(prev => ({ ...prev, all: e.target.checked }))}
                                    />
                                    <span>Tutti</span>
                                </label>
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={enabledCalendars['tasks'] !== false}
                                        onChange={(e) => setEnabledCalendars(prev => ({ ...prev, tasks: e.target.checked }))}
                                    />
                                    <span className="calendar-color-indicator" style={{ backgroundColor: '#0A84FF' }} />
                                    <span>Task</span>
                                </label>
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={enabledCalendars['events'] !== false}
                                        onChange={(e) => setEnabledCalendars(prev => ({ ...prev, events: e.target.checked }))}
                                    />
                                    <span className="calendar-color-indicator" style={{ backgroundColor: '#5856D6' }} />
                                    <span>Eventi</span>
                                </label>
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={enabledCalendars['calls'] !== false}
                                        onChange={(e) => setEnabledCalendars(prev => ({ ...prev, calls: e.target.checked }))}
                                    />
                                    <span className="calendar-color-indicator" style={{ backgroundColor: '#FF9500' }} />
                                    <span>Call</span>
                                </label>
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={enabledCalendars['deadlines'] !== false}
                                        onChange={(e) => setEnabledCalendars(prev => ({ ...prev, deadlines: e.target.checked }))}
                                    />
                                    <span className="calendar-color-indicator" style={{ backgroundColor: '#FF3B30' }} />
                                    <span>Scadenze</span>
                                </label>
                            </div>
                        
                        {/* Filtro Admin - Mostra solo eventi con visibilità specifica */}
                        {isAdmin && (
                            <div className="sidebar-admin-filter">
                                <label className="sidebar-calendar-item">
                                    <input 
                                        type="checkbox" 
                                        checked={showSpecificVisibilityOnly}
                                        onChange={(e) => setShowSpecificVisibilityOnly(e.target.checked)}
                                    />
                                    <span>Mostra solo eventi visibili a utenti specifici</span>
                                </label>
                        </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="calendar-main-content">
                    {/* Header Sticky con giorni settimana */}
                    <div className="calendar-week-header">
                        <div className="calendar-time-column-header">
                            {/* Spazio per colonna tempo */}
                        </div>
                        <div className="calendar-days-header">
                            {weekDates.map((date, dayIndex) => {
                                const isTodayDate = isToday(date);
                                return (
                                    <div 
                                        key={dayIndex} 
                                        className={`calendar-day-header ${isTodayDate ? 'today' : ''}`}
                                    >
                                        <div className="calendar-day-name">{DAYS_OF_WEEK[date.getDay()]}</div>
                                        <div className={`calendar-day-number ${isTodayDate ? 'today-circle' : ''}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="calendar-grid-container" ref={calendarContainerRef}>
                        {/* Time column - fissa a sinistra */}
                        <div className="calendar-time-column" ref={timeColumnRef}>
                            <div className="calendar-time-column-inner">
                                <div className="calendar-all-day-section">
                                    tutto il g.
                                </div>
                                {HOURS.map(hour => (
                                    <div 
                                        key={hour} 
                                        className="calendar-time-slot"
                                        style={{ height: `${hourHeight}px` }}
                                    >
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Days wrapper - scrollabile */}
                        <div 
                            className="calendar-days-wrapper"
                            ref={daysWrapperRef}
                            onScroll={handleDaysWrapperScroll}
                        >
                            <div 
                                className="calendar-days-container"
                                style={{ height: `${24 * hourHeight}px` }}
                            >
                                {weekDates.map((date, dayIndex) => {
                                    const isTodayDate = isToday(date);
                                    const dayItems = getItemsForDay(dayIndex);
                                    const allDayItems = dayItems.filter(item => item.isAllDay);
                                    const timedItems = dayItems.filter(item => !item.isAllDay);
                                    
                                    // Separa task da altri item all-day
                                    const allDayTasks = allDayItems.filter(item => item.type === 'task');
                                    const otherAllDayItems = allDayItems.filter(item => item.type !== 'task');

                                    return (
                                        <div key={dayIndex} className="calendar-day-column">
                                            {/* All day section */}
                                            <div className="calendar-all-day-slots">
                                                {/* Mostra altre item all-day (non task) */}
                                                {otherAllDayItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="calendar-item calendar-item-all-day"
                                                        style={{
                                                            backgroundColor: item.color || getItemTypeColor(item.type),
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            marginBottom: '2px',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItem(item);
                                                            setIsEditingItem(false);
                                                            setEditFormData(null);
                                                            setShowItemDetailsModal(true);
                                                        }}
                                                    >
                                                        {item.title}
                                                    </div>
                                                ))}
                                                
                                                {/* Mostra task: se più di una, mostra numerino, altrimenti mostra la task */}
                                                {allDayTasks.length > 1 ? (
                                                    <div
                                                        className="calendar-item calendar-item-all-day calendar-item-tasks-group"
                                                        style={{
                                                            backgroundColor: '#0A84FF',
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            marginBottom: '2px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDayTasks(allDayTasks);
                                                            setSelectedDateForTasks(date);
                                                            setShowTaskSelectionModal(true);
                                                        }}
                                                    >
                                                        <span>{allDayTasks.length} task</span>
                                                        <span className="tasks-count-badge">{allDayTasks.length}</span>
                                                    </div>
                                                ) : allDayTasks.length === 1 ? (
                                                    <div
                                                        key={allDayTasks[0].id}
                                                        className="calendar-item calendar-item-all-day"
                                                        style={{
                                                            backgroundColor: allDayTasks[0].color || getItemTypeColor(allDayTasks[0].type),
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            marginBottom: '2px',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItem(allDayTasks[0]);
                                                            setIsEditingItem(false);
                                                            setEditFormData(null);
                                                            setShowItemDetailsModal(true);
                                                        }}
                                                    >
                                                        {allDayTasks[0].title}
                                                    </div>
                                                ) : null}
                                            </div>

                                            {/* Time slots */}
                                            <div 
                                                className="calendar-day-slots"
                                                style={{ height: `${24 * hourHeight}px` }}
                                                onClick={(e) => handleSlotClick(e, date)}
                                                onContextMenu={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const wrapper = daysWrapperRef.current;
                                                    const scrollTop = wrapper?.scrollTop || 0;
                                                    const y = e.clientY - rect.top + scrollTop;
                                                    const timeSlot = calculateTimeFromPosition(y, date);
                                                    handleContextMenu(e, timeSlot);
                                                }}
                                            >
                                                {/* Linea rossa per ora corrente */}
                                                {isTodayDate && currentTimeLinePosition !== null && (
                                                    <div 
                                                        className="calendar-current-time-line"
                                                        style={{ top: `${currentTimeLinePosition}px` }}
                                                    />
                                                )}

                                                {/* Mostra tutte le 24 ore */}
                                                {HOURS.map(hour => (
                                                    <div 
                                                        key={hour} 
                                                        className="calendar-hour-slot"
                                                        style={{ height: `${hourHeight}px` }}
                                                    />
                                                ))}

                                                {/* Calendar items */}
                                                {timedItems.map(item => {
                                                    const itemStyle = getItemStyle(item, dayIndex);
                                                    const isResizing = resizingItem?.item.id === item.id;
                                                    
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`calendar-item ${(item.type === 'event' || item.type === 'call') && item.isCompleted ? 'completed' : ''}`}
                                                            style={itemStyle}
                                                            onMouseDown={(e) => !isResizing && handleItemMouseDown(e, item)}
                                                            onMouseUp={(e) => !isResizing && handleItemMouseUp(e, item)}
                                                        >
                                                            {/* Resize handle top */}
                                                            <div 
                                                                className="calendar-item-resize-handle calendar-item-resize-top"
                                                                onMouseDown={(e) => handleResizeStart(e, item, 'top')}
                                                            />
                                                            
                                                            <div className="calendar-item-content">
                                                                <div className="calendar-item-title">
                                                                    {item.title}
                                                                    {/* V verde se completato (solo eventi e call) */}
                                                                    {(item.type === 'event' || item.type === 'call') && item.isCompleted && (
                                                                        <span className="calendar-item-completed-check" title="Completata">
                                                                            ✓
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.type === 'call' && (
                                                                    <div className="calendar-item-icon">
                                                                        <Video size={12} />
                                                                    </div>
                                                                )}
                                                                {item.type === 'deadline' && (
                                                                    <div className="calendar-item-icon">
                                                                        <AlertCircle size={12} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Resize handle bottom */}
                                                            <div 
                                                                className="calendar-item-resize-handle calendar-item-resize-bottom"
                                                                onMouseDown={(e) => handleResizeStart(e, item, 'bottom')}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div 
                        className="context-menu-overlay"
                        onClick={() => setContextMenu(null)}
                    />
                    <div 
                        className="context-menu"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button onClick={() => handleCreateItem('event', contextMenu?.timeSlot)}>
                            <CalendarIcon size={16} />
                            Crea Nuovo Evento
                        </button>
                        <button onClick={() => handleCreateItem('task', contextMenu?.timeSlot)}>
                            <FileText size={16} />
                            Crea Nuova Task
                        </button>
                        <button onClick={() => handleCreateItem('call', contextMenu?.timeSlot)}>
                            <Video size={16} />
                            Crea Nuova Call
                        </button>
                        <button onClick={() => handleCreateItem('deadline', contextMenu?.timeSlot)}>
                            <AlertCircle size={16} />
                            Crea Nuova Scadenza
                        </button>
                    </div>
                </>
            )}

            {/* Create Modal - selezione tipo */}
            {showCreateModal && !createType && createStartTime && (
                <div className="modal-overlay" onClick={() => {
                    setShowCreateModal(false);
                    setCreateStartTime(null);
                }}>
                    <div className="modal-content create-item-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cosa vuoi creare?</h2>
                            <button onClick={() => {
                                setShowCreateModal(false);
                                setCreateStartTime(null);
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="create-item-subtitle">
                                Seleziona il tipo di item da creare alle {createStartTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="create-item-options">
                                <button 
                                    className="create-item-option"
                                    onClick={() => handleCreateItem('event', createStartTime)}
                                >
                                    <CalendarIcon size={24} />
                                    <span>Evento</span>
                                </button>
                                <button 
                                    className="create-item-option"
                                    onClick={() => handleCreateItem('task', createStartTime)}
                                >
                                    <FileText size={24} />
                                    <span>Task</span>
                                </button>
                                <button 
                                    className="create-item-option"
                                    onClick={() => handleCreateItem('call', createStartTime)}
                                >
                                    <Video size={24} />
                                    <span>Call</span>
                                </button>
                                <button 
                                    className="create-item-option"
                                    onClick={() => handleCreateItem('deadline', createStartTime)}
                                >
                                    <AlertCircle size={24} />
                                    <span>Scadenza</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal - form creazione */}
            {showCreateModal && createType && createStartTime && (
                <div className="modal-overlay" onClick={() => {
                    setShowCreateModal(false);
                    setCreateType(null);
                    setCreateStartTime(null);
                }}>
                    <div className="modal-content calendar-event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: createType === 'task' ? '900px' : '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2>
                                Crea {
                                    createType === 'task' ? 'Task' : 
                                    createType === 'call' ? 'Call' : 
                                    createType === 'event' ? 'Evento' : 
                                    createType === 'deadline' ? 'Scadenza' : 
                                    'Promemoria'
                                }
                            </h2>
                            <button onClick={() => {
                                setShowCreateModal(false);
                                setCreateType(null);
                                setCreateStartTime(null);
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        {createType === 'task' ? (
                            <form onSubmit={handleSubmitTask} className="calendar-event-form">
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Titolo Task *</label>
                                        <input
                                            type="text"
                                            value={taskFormData.title}
                                            onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Es: Sviluppo landing page"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Descrizione</label>
                                        <textarea
                                            value={taskFormData.description}
                                            onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Descrizione dettagliata del task..."
                                            className="form-input"
                                            rows={4}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Stato</label>
                                            <select
                                                value={taskFormData.status}
                                                onChange={(e) => setTaskFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                                className="form-input"
                                            >
                                                <option value="pending">In Attesa</option>
                                                <option value="in_progress">In Corso</option>
                                                <option value="review">In Revisione</option>
                                                <option value="completed">Completato</option>
                                                <option value="cancelled">Cancellato</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Priorità</label>
                                            <select
                                                value={taskFormData.priority}
                                                onChange={(e) => setTaskFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                                                className="form-input"
                                            >
                                                <option value="low">Bassa</option>
                                                <option value="medium">Media</option>
                                                <option value="high">Alta</option>
                                                <option value="urgent">Urgente</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Data Inizio</label>
                                            <input
                                                type="date"
                                                value={taskFormData.start_date}
                                                onChange={(e) => setTaskFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                                className="form-input"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Data Scadenza</label>
                                            <input
                                                type="date"
                                                value={taskFormData.due_date}
                                                onChange={(e) => setTaskFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label style={{ fontWeight: 600 }}>Assegnazioni Utenti *</label>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={handleAddTaskAssignment}
                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                <Plus size={14} />
                                                Aggiungi Assegnazione
                                            </button>
                                        </div>

                                        {taskFormData.assignments.length === 0 ? (
                                            <div style={{ 
                                                padding: '16px', 
                                                background: 'rgba(255, 255, 255, 0.03)', 
                                                borderRadius: '8px', 
                                                textAlign: 'center',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: '14px'
                                            }}>
                                                Nessuna assegnazione. Aggiungi almeno un utente.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {taskFormData.assignments.map((assignment, index) => (
                                                    <div key={index} style={{ 
                                                        padding: '16px', 
                                                        background: 'rgba(255, 255, 255, 0.03)', 
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Assegnazione {index + 1}</h4>
                                                            <button
                                                                type="button"
                                                                className="btn-secondary"
                                                                onClick={() => handleRemoveTaskAssignment(index)}
                                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                                            <label>Utente del Team *</label>
                                                            <select
                                                                value={assignment.user_id || ''}
                                                                onChange={(e) => handleUpdateTaskAssignment(index, 'user_id', e.target.value ? Number(e.target.value) : undefined)}
                                                                className="form-input"
                                                                required
                                                            >
                                                                <option value="">Seleziona utente del team</option>
                                                                {getTeamUsers().map((user) => (
                                                                    <option key={user.id} value={user.id}>
                                                                        {user.name} {user.email && `(${user.email})`} {user.role && ` - ${user.role}`}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                                            <label>Metodo di Pagamento *</label>
                                                            <select
                                                                value={assignment.payment_method || 'hourly'}
                                                                onChange={(e) => handleUpdateTaskAssignment(index, 'payment_method', e.target.value as any)}
                                                                className="form-input"
                                                                required
                                                            >
                                                                <option value="hourly">A Ore</option>
                                                                <option value="per_task">A Task</option>
                                                                <option value="per_project">A Progetto</option>
                                                                <option value="fixed">Fisso (Nessun Cocco)</option>
                                                                <option value="no_payment">Nessun Pagamento</option>
                                                            </select>
                                                        </div>

                                                        {assignment.payment_method === 'hourly' && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                <div className="form-group">
                                                                    <label>Tariffa Oraria (Cocchi) *</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={assignment.hourly_rate_cocchi || ''}
                                                                        onChange={(e) => handleUpdateTaskAssignment(index, 'hourly_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0.00"
                                                                        className="form-input"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label>Ore Richieste *</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.5"
                                                                        min="0"
                                                                        value={assignment.hours_requested || ''}
                                                                        onChange={(e) => handleUpdateTaskAssignment(index, 'hours_requested', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0"
                                                                        className="form-input"
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {assignment.payment_method === 'per_task' && (
                                                            <div className="form-group">
                                                                <label>Tariffa per Task (Cocchi) *</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={assignment.task_rate_cocchi || ''}
                                                                    onChange={(e) => handleUpdateTaskAssignment(index, 'task_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    className="form-input"
                                                                    required
                                                                />
                                                            </div>
                                                        )}

                                                        {assignment.payment_method === 'per_project' && (
                                                            <div className="form-group">
                                                                <label>Tariffa Progetto (Cocchi) *</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={assignment.project_rate_cocchi || ''}
                                                                    onChange={(e) => handleUpdateTaskAssignment(index, 'project_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    className="form-input"
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer-minimal">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateType(null);
                                            setCreateStartTime(null);
                                        }}
                                        disabled={saving}
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-create"
                                        disabled={saving || !taskFormData.title.trim()}
                                    >
                                        {saving ? 'Salvataggio...' : 'Crea Task'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                        <form onSubmit={handleSubmitEvent} className="calendar-event-form">
                            <div className="modal-body">
                                {/* Titolo - Grande e prominente */}
                                <div className="form-group-title">
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleFormChange('title', e.target.value)}
                                        className="form-input-title"
                                        required
                                        placeholder="Titolo evento"
                                        autoFocus
                                    />
                                </div>

                                {/* Descrizione - Minimalista */}
                                <div className="form-group-description">
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => handleFormChange('description', e.target.value)}
                                        className="form-input-description"
                                        rows={4}
                                        placeholder="Aggiungi una descrizione (opzionale)"
                                    />
                                </div>

                                    {/* Checklist (solo per eventi) */}
                                    {formData.type === 'event' && (
                                        <div className="form-group-checklist">
                                            <label className="checkbox-option-minimal" style={{ marginBottom: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.has_checklist || false}
                                                    onChange={(e) => {
                                                        const hasChecklist = e.target.checked;
                                                        setFormData(prev => ({ ...prev, has_checklist: hasChecklist }));
                                                        if (!hasChecklist) {
                                                            setFormChecklist([]);
                                                        }
                                                    }}
                                                />
                                                <span>Aggiungi Checklist</span>
                                            </label>
                                            
                                            {formData.has_checklist && (
                                                <div className="checklist-container">
                                                    <div className="checklist-items">
                                                        {formChecklist.map(item => (
                                                            <div key={item.id} className="checklist-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.completed}
                                                                    onChange={() => {
                                                                        setFormChecklist(prev => prev.map(i => 
                                                                            i.id === item.id ? { ...i, completed: !i.completed } : i
                                                                        ));
                                                                    }}
                                                                />
                                                                <span style={{ 
                                                                    textDecoration: item.completed ? 'line-through' : 'none',
                                                                    opacity: item.completed ? 0.6 : 1
                                                                }}>
                                                                    {item.text}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormChecklist(prev => prev.filter(i => i.id !== item.id));
                                                                    }}
                                                                    style={{ 
                                                                        marginLeft: 'auto', 
                                                                        background: 'transparent', 
                                                                        border: 'none', 
                                                                        color: 'rgba(255, 255, 255, 0.6)',
                                                                        cursor: 'pointer',
                                                                        padding: '4px 8px'
                                                                    }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="checklist-add-item">
                                                        <input
                                                            type="text"
                                                            value={newFormChecklistItem}
                                                            onChange={(e) => setNewFormChecklistItem(e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (newFormChecklistItem.trim()) {
                                                                        setFormChecklist(prev => [...prev, {
                                                                            id: Date.now().toString(),
                                                                            text: newFormChecklistItem.trim(),
                                                                            completed: false
                                                                        }]);
                                                                        setNewFormChecklistItem('');
                                                                    }
                                                                }
                                                            }}
                                                            placeholder="Aggiungi elemento checklist..."
                                                            className="form-input"
                                                            style={{ marginBottom: '8px' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (newFormChecklistItem.trim()) {
                                                                    setFormChecklist(prev => [...prev, {
                                                                        id: Date.now().toString(),
                                                                        text: newFormChecklistItem.trim(),
                                                                        completed: false
                                                                    }]);
                                                                    setNewFormChecklistItem('');
                                                                }
                                                            }}
                                                            className="btn-secondary"
                                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                                        >
                                                            <Plus size={14} />
                                                            Aggiungi
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Date e Ora */}
                                    <div className="form-group-datetime">
                                        <div className="form-group-half">
                                            <label className="form-label-minimal">Inizio</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_time}
                                                onChange={(e) => handleFormChange('start_time', e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                        <div className="form-group-half">
                                            <label className="form-label-minimal">Fine</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_time}
                                                onChange={(e) => handleFormChange('end_time', e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Luogo (solo per eventi) */}
                                    {formData.type === 'event' && (
                                        <div className="form-group">
                                            <label className="form-label-minimal">Luogo</label>
                                            <input
                                                type="text"
                                                value={formData.location || ''}
                                                onChange={(e) => handleFormChange('location', e.target.value)}
                                                className="form-input"
                                                placeholder="Luogo dell'evento (opzionale)"
                                            />
                                        </div>
                                    )}

                                    {/* Call Link e Note (solo per call) */}
                                    {formData.type === 'call' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label-minimal">Link Call *</label>
                                                <input
                                                    type="url"
                                                    value={formData.call_link || ''}
                                                    onChange={(e) => handleFormChange('call_link', e.target.value)}
                                                    className="form-input"
                                                    placeholder="https://..."
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label-minimal">Note Call</label>
                                                <textarea
                                                    value={formData.call_notes || ''}
                                                    onChange={(e) => handleFormChange('call_notes', e.target.value)}
                                                    className="form-input-description"
                                                    rows={3}
                                                    placeholder="Note sulla call (opzionale)"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label-minimal">Partecipanti CRM *</label>
                                                {loadingUsers ? (
                                                    <div className="loading-users-minimal">Caricamento utenti...</div>
                                                ) : (
                                                    <div className="users-checkbox-list-minimal">
                                                        {availableUsers.map(user => (
                                                            <label key={user.id} className="checkbox-option-minimal">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={callParticipants.includes(user.id)}
                                                                    onChange={(e) => handleCallParticipantChange(user.id, e.target.checked)}
                                                                />
                                                                <span>{user.name}</span>
                                                            </label>
                                                        ))}
                                                        {availableUsers.length === 0 && (
                                                            <div className="no-users-minimal">Nessun utente disponibile</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Deadline Type (solo per deadline) */}
                                    {formData.type === 'deadline' && (
                                        <div className="form-group">
                                            <label className="form-label-minimal">Tipo Scadenza</label>
                                            <input
                                                type="text"
                                                value={formData.deadline_type || ''}
                                                onChange={(e) => handleFormChange('deadline_type', e.target.value)}
                                                className="form-input"
                                                placeholder="Tipo di scadenza (opzionale)"
                                            />
                                        </div>
                                    )}

                                {/* Colore - Elegante e minimalista */}
                                <div className="form-group-color">
                                    <label className="form-label-minimal">Colore</label>
                                    <div className="color-picker-minimal">
                                        {['#5856D6', '#0A84FF', '#FF9500', '#FF3B30', '#34C759', '#8E8E93'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`color-option-minimal ${formData.color === color ? 'selected' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => handleFormChange('color', color)}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Visibilità - Stile Apple */}
                                <div className="form-group-visibility">
                                    <label className="form-label-minimal">Visibilità</label>
                                    <div className="visibility-options-minimal">
                                        <label className="radio-option-minimal">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="all"
                                                checked={formData.visibility === 'all'}
                                                onChange={() => handleVisibilityChange('all')}
                                            />
                                            <span>Tutti nel progetto</span>
                                        </label>
                                        <label className="radio-option-minimal">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="freelance"
                                                checked={formData.visibility === 'freelance'}
                                                onChange={() => handleVisibilityChange('freelance')}
                                            />
                                            <span>Freelance</span>
                                        </label>
                                        <label className="radio-option-minimal">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="specific"
                                                checked={formData.visibility === 'specific'}
                                                onChange={() => handleVisibilityChange('specific')}
                                            />
                                            <span>Utenti specifici</span>
                                        </label>
                                    </div>
                                    <p className="form-hint-minimal" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', marginBottom: 0 }}>
                                        Gli eventi appariranno nel Calendario (/freelance/calendario) delle persone coinvolte.
                                    </p>
                                </div>

                                {/* Selezione utenti per visibilità specifica - Solo quando necessario */}
                                {formData.visibility === 'specific' && (
                                    <div className="form-group-users">
                                        {loadingUsers ? (
                                            <div className="loading-users-minimal">Caricamento utenti...</div>
                                        ) : (
                                            <div className="users-checkbox-list-minimal">
                                                {availableUsers.map(user => (
                                                    <label key={user.id} className="checkbox-option-minimal">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.visible_to?.includes(user.id) || false}
                                                            onChange={(e) => handleVisibleToChange(user.id, e.target.checked)}
                                                        />
                                                        <span>{user.name}</span>
                                                    </label>
                                                ))}
                                                {availableUsers.length === 0 && (
                                                    <div className="no-users-minimal">Nessun utente disponibile</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer-minimal">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateType(null);
                                        setCreateStartTime(null);
                                    }}
                                    disabled={saving}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="btn-create"
                                    disabled={saving || !formData.title.trim()}
                                >
                                    {saving ? 'Salvataggio...' : 'Crea'}
                                </button>
                            </div>
                        </form>
                        )}
                    </div>
                </div>
            )}

            {/* Task Selection Modal - Apple Calendar Style Day View */}
            {showTaskSelectionModal && selectedDayTasks.length > 0 && selectedDateForTasks && (
                <div className="apple-modal-overlay" onClick={() => {
                    setShowTaskSelectionModal(false);
                    setSelectedDayTasks([]);
                    setSelectedDateForTasks(null);
                }}>
                    <div className="apple-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="apple-modal-header">
                            <div className="apple-modal-header-content">
                                <h2 className="apple-modal-title">
                                    {selectedDateForTasks.toLocaleDateString('it-IT', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                </h2>
                                <p className="apple-modal-subtitle">
                                    {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'attività pianificata' : 'attività pianificate'}
                                </p>
                            </div>
                            <button 
                                className="apple-modal-close-btn"
                                onClick={() => {
                                    setShowTaskSelectionModal(false);
                                    setSelectedDayTasks([]);
                                    setSelectedDateForTasks(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="apple-modal-body">
                            <div className="apple-agenda-list">
                                {selectedDayTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="apple-agenda-item"
                                        onClick={() => {
                                            setSelectedItem(task);
                                            setIsEditingItem(false);
                                            setEditFormData(null);
                                            setEditTaskFormData(null);
                                            setShowTaskSelectionModal(false);
                                            setShowItemDetailsModal(true);
                                        }}
                                    >
                                        <div 
                                            className="apple-agenda-indicator"
                                            style={{
                                                backgroundColor: task.color || getItemTypeColor(task.type)
                                            }}
                                        />
                                        <div className="apple-agenda-content">
                                            <div className="apple-agenda-main">
                                                <h3 className="apple-agenda-title">
                                                    {task.title.length > 60 
                                                        ? task.title.substring(0, 60) + '...' 
                                                        : task.title}
                                                </h3>
                                                {task.originalTask?.project && (
                                                    <p className="apple-agenda-project">{task.originalTask.project.name}</p>
                                                )}
                                            </div>
                                            <div className="apple-agenda-meta">
                                                {task.originalTask?.assignments && task.originalTask.assignments.length > 0 && (
                                                    <div className="apple-agenda-assignees">
                                                        {task.originalTask.assignments.slice(0, 3).map((assignment: any, idx: number) => (
                                                            assignment.user && (
                                                                <div key={assignment.id || idx} className="apple-agenda-avatar" title={assignment.user.name}>
                                                                    {assignment.user.avatar ? (
                                                                        <img src={assignment.user.avatar} alt={assignment.user.name} />
                                                                    ) : (
                                                                        <span>{assignment.user.name?.charAt(0).toUpperCase() || '?'}</span>
                                                                    )}
                                                                </div>
                                                            )
                                                        ))}
                                                        {task.originalTask.assignments.length > 3 && (
                                                            <div className="apple-agenda-avatar-more" title={`+${task.originalTask.assignments.length - 3} altri`}>
                                                                +{task.originalTask.assignments.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div 
                                                    className="apple-agenda-status-badge"
                                                    style={{
                                                        backgroundColor: task.color || getItemTypeColor(task.type)
                                                    }}
                                                >
                                                    {task.taskStatus === 'pending' ? 'In Attesa' :
                                                     task.taskStatus === 'in_progress' ? 'In Corso' :
                                                     task.taskStatus === 'review' ? 'In Revisione' :
                                                     task.taskStatus === 'completed' ? 'Completato' :
                                                     task.taskStatus === 'cancelled' ? 'Cancellato' : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Details Modal - Apple Calendar Style */}
            {showItemDetailsModal && selectedItem && (
                <div className="apple-modal-overlay" onClick={() => {
                    if (!isEditingItem) {
                        setShowItemDetailsModal(false);
                        setSelectedItem(null);
                        setIsEditingItem(false);
                        setEditFormData(null);
                        setEditTaskFormData(null);
                    }
                }}>
                    <div className="apple-modal-container apple-modal-detail" onClick={(e) => e.stopPropagation()}>
                        <div className="apple-modal-header">
                            <div className="apple-modal-header-content">
                                <h2 className="apple-modal-title-large">
                                    {isEditingItem 
                                        ? (selectedItem.type === 'task' ? 'Modifica Task' : 'Modifica Evento')
                                        : selectedItem.title}
                                </h2>
                            </div>
                            <button 
                                className="apple-modal-close-btn"
                                onClick={() => {
                                    setShowItemDetailsModal(false);
                                    setSelectedItem(null);
                                    setIsEditingItem(false);
                                    setEditFormData(null);
                                    setEditTaskFormData(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="apple-modal-body">
                            {isEditingItem && selectedItem.type === 'task' && editTaskFormData ? (
                                <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="calendar-event-form">
                                    <div className="form-group">
                                        <label>Titolo Task *</label>
                                        <input
                                            type="text"
                                            value={editTaskFormData.title}
                                            onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, title: e.target.value } : null)}
                                            placeholder="Es: Sviluppo landing page"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Descrizione</label>
                                        <textarea
                                            value={editTaskFormData.description}
                                            onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                                            placeholder="Descrizione dettagliata del task..."
                                            className="form-input"
                                            rows={4}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Stato</label>
                                            <select
                                                value={editTaskFormData.status}
                                                onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                                                className="form-input"
                                            >
                                                <option value="pending">In Attesa</option>
                                                <option value="in_progress">In Corso</option>
                                                <option value="review">In Revisione</option>
                                                <option value="completed">Completato</option>
                                                <option value="cancelled">Cancellato</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Priorità</label>
                                            <select
                                                value={editTaskFormData.priority}
                                                onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                                                className="form-input"
                                            >
                                                <option value="low">Bassa</option>
                                                <option value="medium">Media</option>
                                                <option value="high">Alta</option>
                                                <option value="urgent">Urgente</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Data Inizio</label>
                                            <input
                                                type="date"
                                                value={editTaskFormData.start_date}
                                                onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, start_date: e.target.value } : null)}
                                                className="form-input"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Data Scadenza *</label>
                                            <input
                                                type="date"
                                                value={editTaskFormData.due_date}
                                                onChange={(e) => setEditTaskFormData(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-footer-minimal">
                                        <button
                                            type="button"
                                            className="btn-cancel"
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-create"
                                            disabled={saving || !editTaskFormData.title.trim()}
                                        >
                                            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                                        </button>
                                    </div>
                                </form>
                            ) : isEditingItem && editFormData ? (
                                <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="calendar-event-form">
                                    {/* Titolo */}
                                    <div className="form-group-title">
                                        <input
                                            type="text"
                                            value={editFormData.title}
                                            onChange={(e) => handleEditFormChange('title', e.target.value)}
                                            className="form-input-title"
                                            required
                                            placeholder="Titolo evento"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Descrizione */}
                                    <div className="form-group-description">
                                        <textarea
                                            value={editFormData.description || ''}
                                            onChange={(e) => handleEditFormChange('description', e.target.value)}
                                            className="form-input-description"
                                            rows={4}
                                            placeholder="Aggiungi una descrizione (opzionale)"
                                        />
                                    </div>

                                    {/* Checklist (solo per eventi) */}
                                    {editFormData.type === 'event' && (
                                        <div className="form-group-checklist">
                                            <label className="checkbox-option-minimal" style={{ marginBottom: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.has_checklist || false}
                                                    onChange={handleToggleChecklist}
                                                />
                                                <span>Aggiungi Checklist</span>
                                            </label>
                                            
                                            {editFormData.has_checklist && (
                                                <div className="checklist-container">
                                                    <div className="checklist-items">
                                                        {editingChecklist.map(item => (
                                                            <div key={item.id} className="checklist-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.completed}
                                                                    onChange={() => handleToggleChecklistItem(item.id)}
                                                                />
                                                                <span style={{ 
                                                                    textDecoration: item.completed ? 'line-through' : 'none',
                                                                    opacity: item.completed ? 0.6 : 1
                                                                }}>
                                                                    {item.text}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveChecklistItem(item.id)}
                                                                    style={{ 
                                                                        marginLeft: 'auto', 
                                                                        background: 'transparent', 
                                                                        border: 'none', 
                                                                        color: 'rgba(255, 255, 255, 0.6)',
                                                                        cursor: 'pointer',
                                                                        padding: '4px 8px'
                                                                    }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="checklist-add-item">
                                                        <input
                                                            type="text"
                                                            value={newChecklistItem}
                                                            onChange={(e) => setNewChecklistItem(e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddChecklistItem();
                                                                }
                                                            }}
                                                            placeholder="Aggiungi elemento checklist..."
                                                            className="form-input"
                                                            style={{ marginBottom: '8px' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddChecklistItem}
                                                            className="btn-secondary"
                                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                                        >
                                                            <Plus size={14} />
                                                            Aggiungi
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Date e Ora */}
                                    <div className="form-group-datetime">
                                        <div className="form-group-half">
                                            <label className="form-label-minimal">Inizio</label>
                                            <input
                                                type="datetime-local"
                                                value={editFormData.start_time}
                                                onChange={(e) => handleEditFormChange('start_time', e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                        <div className="form-group-half">
                                            <label className="form-label-minimal">Fine</label>
                                            <input
                                                type="datetime-local"
                                                value={editFormData.end_time}
                                                onChange={(e) => handleEditFormChange('end_time', e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Luogo (solo per eventi) */}
                                    {editFormData.type === 'event' && (
                                        <div className="form-group">
                                            <label className="form-label-minimal">Luogo</label>
                                            <input
                                                type="text"
                                                value={editFormData.location || ''}
                                                onChange={(e) => handleEditFormChange('location', e.target.value)}
                                                className="form-input"
                                                placeholder="Luogo dell'evento (opzionale)"
                                            />
                                        </div>
                                    )}

                                    {/* Call Link (solo per call) */}
                                    {editFormData.type === 'call' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label-minimal">Link Call</label>
                                                <input
                                                    type="url"
                                                    value={editFormData.call_link || ''}
                                                    onChange={(e) => handleEditFormChange('call_link', e.target.value)}
                                                    className="form-input"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label-minimal">Note Call</label>
                                                <textarea
                                                    value={editFormData.call_notes || ''}
                                                    onChange={(e) => handleEditFormChange('call_notes', e.target.value)}
                                                    className="form-input-description"
                                                    rows={3}
                                                    placeholder="Note sulla call (opzionale)"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Deadline Type (solo per deadline) */}
                                    {editFormData.type === 'deadline' && (
                                        <div className="form-group">
                                            <label className="form-label-minimal">Tipo Scadenza</label>
                                            <input
                                                type="text"
                                                value={editFormData.deadline_type || ''}
                                                onChange={(e) => handleEditFormChange('deadline_type', e.target.value)}
                                                className="form-input"
                                                placeholder="Tipo di scadenza (opzionale)"
                                            />
                                        </div>
                                    )}

                                    {/* Colore */}
                                    <div className="form-group-color">
                                        <label className="form-label-minimal">Colore</label>
                                        <div className="color-picker-minimal">
                                            {['#5856D6', '#0A84FF', '#FF9500', '#FF3B30', '#34C759', '#8E8E93'].map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`color-option-minimal ${editFormData.color === color ? 'selected' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => handleEditFormChange('color', color)}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Visibilità */}
                                    <div className="form-group-visibility">
                                        <label className="form-label-minimal">Visibilità</label>
                                        <div className="visibility-options-minimal">
                                            <label className="radio-option-minimal">
                                                <input
                                                    type="radio"
                                                    name="edit-visibility"
                                                    value="all"
                                                    checked={editFormData.visibility === 'all'}
                                                    onChange={() => handleEditVisibilityChange('all')}
                                                />
                                                <span>Tutti nel progetto</span>
                                            </label>
                                            <label className="radio-option-minimal">
                                                <input
                                                    type="radio"
                                                    name="edit-visibility"
                                                    value="freelance"
                                                    checked={editFormData.visibility === 'freelance'}
                                                    onChange={() => handleEditVisibilityChange('freelance')}
                                                />
                                                <span>Freelance</span>
                                            </label>
                                            <label className="radio-option-minimal">
                                                <input
                                                    type="radio"
                                                    name="edit-visibility"
                                                    value="specific"
                                                    checked={editFormData.visibility === 'specific'}
                                                    onChange={() => handleEditVisibilityChange('specific')}
                                                />
                                                <span>Utenti specifici</span>
                                            </label>
                                        </div>
                                        <p className="form-hint-minimal" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', marginBottom: 0 }}>
                                            Gli eventi appariranno nel Calendario (/freelance/calendario) delle persone coinvolte.
                                        </p>
                                    </div>

                                    {/* Selezione utenti per visibilità specifica */}
                                    {editFormData.visibility === 'specific' && (
                                        <div className="form-group-users">
                                            {loadingUsers ? (
                                                <div className="loading-users-minimal">Caricamento utenti...</div>
                                            ) : (
                                                <div className="users-checkbox-list-minimal">
                                                    {availableUsers.map(user => (
                                                        <label key={user.id} className="checkbox-option-minimal">
                                                            <input
                                                                type="checkbox"
                                                                checked={editFormData.visible_to?.includes(user.id) || false}
                                                                onChange={(e) => handleEditVisibleToChange(user.id, e.target.checked)}
                                                            />
                                                            <span>{user.name}</span>
                                                        </label>
                                                    ))}
                                                    {availableUsers.length === 0 && (
                                                        <div className="no-users-minimal">Nessun utente disponibile</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="modal-footer-minimal">
                                        <button
                                            type="button"
                                            className="btn-cancel"
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-create"
                                            disabled={saving || !editFormData.title.trim()}
                                        >
                                            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                <div className="apple-detail-content">
                                    {/* Meta-Data Grid (Info Bar) - Compact Horizontal */}
                                    <div className="apple-detail-meta-grid-compact">
                                        {selectedItem.type === 'task' && (
                                            <>
                                                <div className="apple-detail-meta-item-compact">
                                                    <div 
                                                        className="apple-detail-meta-badge-compact"
                                                        style={{
                                                            backgroundColor: selectedItem.color || getItemTypeColor(selectedItem.type)
                                                        }}
                                                    >
                                                        {selectedItem.taskStatus === 'pending' ? 'In Attesa' :
                                                         selectedItem.taskStatus === 'in_progress' ? 'In Corso' :
                                                         selectedItem.taskStatus === 'review' ? 'In Revisione' :
                                                         selectedItem.taskStatus === 'completed' ? 'Completato' :
                                                         selectedItem.taskStatus === 'cancelled' ? 'Cancellato' : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="apple-detail-meta-item-compact">
                                                    <span className="apple-detail-meta-icon-emoji">
                                                        {selectedItem.taskPriority === 'urgent' ? '🔴' :
                                                         selectedItem.taskPriority === 'high' ? '🟠' :
                                                         selectedItem.taskPriority === 'medium' ? '🔵' : '🟣'}
                                                    </span>
                                                    <span className="apple-detail-meta-text-compact">
                                                        {selectedItem.taskPriority === 'low' ? 'Bassa' :
                                                         selectedItem.taskPriority === 'medium' ? 'Media' :
                                                         selectedItem.taskPriority === 'high' ? 'Alta' :
                                                         selectedItem.taskPriority === 'urgent' ? 'Urgente' : 'N/A'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <div className="apple-detail-meta-item-compact">
                                            <CalendarIcon size={14} />
                                            <span className="apple-detail-meta-text-compact">
                                                {selectedItem.isAllDay 
                                                    ? selectedItem.startTime.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : selectedItem.startTime.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {selectedItem.type === 'task' && (
                                            <div className="apple-detail-meta-item-compact">
                                                <CalendarIcon size={14} />
                                                <span className="apple-detail-meta-text-compact">
                                                    Scadenza: {selectedItem.endTime.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Two Column Layout for Better Space Usage */}
                                    <div className="apple-detail-two-column">
                                        {/* Left Column: Description */}
                                        <div className="apple-detail-column-left">
                                            {selectedItem.description && (
                                                <div className="apple-detail-description">
                                                    <p>{selectedItem.description}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Assignees & Additional Info */}
                                        <div className="apple-detail-column-right">
                                            {/* Assignee Section (User Row) */}
                                            {selectedItem.type === 'task' && selectedItem.originalTask?.assignments && selectedItem.originalTask.assignments.length > 0 && (
                                                <div className="apple-detail-assignees">
                                                    <div className="apple-detail-section-label">Assegnata a</div>
                                                    {selectedItem.originalTask.assignments.map((assignment: any, index: number) => (
                                                        <div key={assignment.id || index} className="apple-detail-assignee-row">
                                                            <div className="apple-detail-assignee-avatar">
                                                                {assignment.user?.avatar ? (
                                                                    <img src={assignment.user.avatar} alt={assignment.user.name} />
                                                                ) : (
                                                                    <span>{assignment.user?.name?.charAt(0).toUpperCase() || '?'}</span>
                                                                )}
                                                            </div>
                                                            <div className="apple-detail-assignee-info">
                                                                <span className="apple-detail-assignee-name">{assignment.user?.name || `Utente ${assignment.user_id}`}</span>
                                                                {assignment.user?.email && (
                                                                    <span className="apple-detail-assignee-email">{assignment.user.email}</span>
                                                                )}
                                                                {assignment.payment_method && (
                                                                    <span className="apple-detail-assignee-badge">
                                                                        {assignment.payment_method === 'hourly' ? 'A Ore' :
                                                                         assignment.payment_method === 'per_task' ? 'A Task' :
                                                                         assignment.payment_method === 'per_project' ? 'A Progetto' :
                                                                         assignment.payment_method === 'fixed' ? 'Fisso' :
                                                                         assignment.payment_method === 'no_payment' ? 'Nessun Pagamento' : assignment.payment_method}
                                                                        {assignment.payment_method === 'hourly' && assignment.hours_requested && ` (${assignment.hours_requested}h)`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Additional Info for Events/Calls */}
                                            {selectedItem.type !== 'task' && (
                                                <>
                                                    {selectedItem.eventLocation && (
                                                        <div className="apple-detail-info-row">
                                                            <MapPin size={16} />
                                                            <span>{selectedItem.eventLocation}</span>
                                                        </div>
                                                    )}
                                                    {selectedItem.type === 'call' && selectedItem.callLink && (
                                                        <div className="apple-detail-info-row">
                                                            <Video size={16} />
                                                            <a href={selectedItem.callLink} target="_blank" rel="noopener noreferrer" className="apple-detail-link">
                                                                {selectedItem.callLink}
                                                            </a>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes and Timeline Section (only for tasks) */}
                                    {selectedItem.type === 'task' && (
                                        <div className="apple-detail-notes-timeline">
                                            {/* Notes Section */}
                                            <div className="apple-detail-notes-section">
                                                <div className="apple-detail-section-header">
                                                    <MessageSquare size={18} />
                                                    <h3 className="apple-detail-section-title">Note</h3>
                                                </div>
                                                
                                                {/* Add Note Form */}
                                                <div className="apple-detail-add-note">
                                                    <textarea
                                                        value={newNoteText}
                                                        onChange={(e) => setNewNoteText(e.target.value)}
                                                        placeholder="Aggiungi una nota..."
                                                        className="apple-detail-note-input"
                                                        rows={3}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                e.preventDefault();
                                                                handleAddNote();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="apple-btn-primary apple-btn-small"
                                                        onClick={handleAddNote}
                                                        disabled={savingNote || !newNoteText.trim()}
                                                    >
                                                        {savingNote ? 'Salvataggio...' : 'Aggiungi Nota'}
                                                    </button>
                                                </div>

                                                {/* Notes List */}
                                                {loadingNotes ? (
                                                    <div className="apple-detail-loading">Caricamento note...</div>
                                                ) : taskNotes.length > 0 ? (
                                                    <div className="apple-detail-notes-list">
                                                        {taskNotes.map((note) => (
                                                            <div key={note.id} className="apple-detail-note-item">
                                                                <div className="apple-detail-note-header">
                                                                    <div className="apple-detail-note-author">
                                                                        {note.user?.avatar ? (
                                                                            <img src={note.user.avatar} alt={note.user.name} className="apple-detail-note-avatar" />
                                                                        ) : (
                                                                            <div className="apple-detail-note-avatar">
                                                                                {note.user?.name?.charAt(0).toUpperCase() || '?'}
                                                                            </div>
                                                                        )}
                                                                        <div className="apple-detail-note-author-info">
                                                                            <span className="apple-detail-note-author-name">{note.user?.name || 'Utente'}</span>
                                                                            <span className="apple-detail-note-date">
                                                                                {new Date(note.created_at).toLocaleDateString('it-IT', { 
                                                                                    day: 'numeric', 
                                                                                    month: 'short', 
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="apple-detail-note-content">
                                                                    {note.comment}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="apple-detail-empty-state">Nessuna nota ancora</div>
                                                )}
                                            </div>

                                            {/* Timeline Section */}
                                            <div className="apple-detail-timeline-section">
                                                <div className="apple-detail-section-header">
                                                    <Clock size={18} />
                                                    <h3 className="apple-detail-section-title">Timeline</h3>
                                                </div>

                                                {loadingEvents ? (
                                                    <div className="apple-detail-loading">Caricamento timeline...</div>
                                                ) : taskEvents.length > 0 ? (
                                                    <div className="apple-detail-timeline">
                                                        {taskEvents.map((event) => {
                                                            const getEventIcon = () => {
                                                                switch (event.event_type) {
                                                                    case 'presa_in_carico':
                                                                        return <CheckCircle size={16} className="timeline-icon-success" />;
                                                                    case 'rifiuto_incarico':
                                                                        return <XCircle size={16} className="timeline-icon-danger" />;
                                                                    case 'termine_incarico':
                                                                        return <CheckCircle size={16} className="timeline-icon-success" />;
                                                                    case 'richiesta_spostamento':
                                                                    case 'modifica_scadenza':
                                                                    case 'approvazione_spostamento':
                                                                    case 'rifiuto_spostamento':
                                                                        return <Calendar size={16} className="timeline-icon-info" />;
                                                                    case 'aggiunta_note':
                                                                        return <MessageSquare size={16} className="timeline-icon-info" />;
                                                                    default:
                                                                        return <Clock size={16} className="timeline-icon-default" />;
                                                                }
                                                            };

                                                            const getEventLabel = () => {
                                                                switch (event.event_type) {
                                                                    case 'presa_in_carico':
                                                                        return 'Preso in carico';
                                                                    case 'rifiuto_incarico':
                                                                        return 'Rifiuto incarico';
                                                                    case 'termine_incarico':
                                                                        return 'Consegna completata';
                                                                    case 'richiesta_spostamento':
                                                                        return 'Richiesta spostamento';
                                                                    case 'modifica_scadenza':
                                                                        return 'Scadenza modificata';
                                                                    case 'approvazione_spostamento':
                                                                        return 'Spostamento approvato';
                                                                    case 'rifiuto_spostamento':
                                                                        return 'Spostamento rifiutato';
                                                                    case 'aggiunta_note':
                                                                        return 'Nota aggiunta';
                                                                    default:
                                                                        return event.description || event.event_type;
                                                                }
                                                            };

                                                            return (
                                                                <div key={event.id} className="apple-detail-timeline-item">
                                                                    <div className="apple-detail-timeline-dot">
                                                                        {getEventIcon()}
                                                                    </div>
                                                                    <div className="apple-detail-timeline-content">
                                                                        <div className="apple-detail-timeline-header">
                                                                            <span className="apple-detail-timeline-label">{getEventLabel()}</span>
                                                                            <span className="apple-detail-timeline-date">
                                                                                {new Date(event.created_at).toLocaleDateString('it-IT', { 
                                                                                    day: 'numeric', 
                                                                                    month: 'short', 
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                        {event.description && (
                                                                            <div className="apple-detail-timeline-description">
                                                                                {event.description}
                                                                            </div>
                                                                        )}
                                                                        {event.event_data && (
                                                                            <div className="apple-detail-timeline-data">
                                                                                {event.event_data.old_due_date && event.event_data.new_due_date && (
                                                                                    <div className="apple-detail-timeline-change">
                                                                                        <span className="timeline-change-old">
                                                                                            {new Date(event.event_data.old_due_date).toLocaleDateString('it-IT')}
                                                                                        </span>
                                                                                        <ArrowRight size={12} />
                                                                                        <span className="timeline-change-new">
                                                                                            {new Date(event.event_data.new_due_date).toLocaleDateString('it-IT')}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {event.user && (
                                                                            <div className="apple-detail-timeline-user">
                                                                                <User size={12} />
                                                                                <span>{event.user.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="apple-detail-empty-state">Nessun evento nella timeline</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            {!isEditingItem && (
                                <div className="apple-modal-footer">
                                    <div className="apple-modal-footer-left">
                                        {/* Tasto Indietro se aperto dal popup di selezione */}
                                        {selectedDayTasks.length > 0 && (
                                            <button
                                                type="button"
                                                className="apple-btn-back"
                                                onClick={() => {
                                                    setShowItemDetailsModal(false);
                                                    setSelectedItem(null);
                                                    setIsEditingItem(false);
                                                    setEditFormData(null);
                                                    setEditTaskFormData(null);
                                                    setShowTaskSelectionModal(true);
                                                }}
                                            >
                                                <ChevronLeft size={16} />
                                                Indietro
                                            </button>
                                        )}
                                        {/* Pulsante Elimina */}
                                        <button
                                            type="button"
                                            className="apple-btn-danger"
                                            onClick={handleDeleteItem}
                                            disabled={deletingItem}
                                        >
                                            <Trash2 size={16} />
                                            {deletingItem ? 'Eliminazione...' : 'Elimina'}
                                        </button>
                                    </div>
                                    <div className="apple-modal-footer-right">
                                        {/* Pulsante Contrassegna come completata */}
                                        {canCompleteItem() && (
                                            <button
                                                type="button"
                                                className={`apple-btn-complete ${((selectedItem.type === 'event' || selectedItem.type === 'call') && selectedItem.isCompleted) || 
                                                                               (selectedItem.type === 'task' && selectedItem.taskStatus === 'completed') 
                                                                               ? 'active' : ''}`}
                                                onClick={handleCompleteItem}
                                                disabled={completingItem}
                                            >
                                                {completingItem 
                                                    ? 'Salvataggio...' 
                                                    : ((selectedItem.type === 'event' || selectedItem.type === 'call') && selectedItem.isCompleted) || 
                                                      (selectedItem.type === 'task' && selectedItem.taskStatus === 'completed')
                                                      ? '✓ Completata' 
                                                      : 'Contrassegna come completata'}
                                            </button>
                                        )}
                                        {/* Pulsante Modifica */}
                                        <button
                                            type="button"
                                            className="apple-btn-primary"
                                            onClick={handleStartEdit}
                                        >
                                            <Edit size={16} />
                                            Modifica
                                        </button>
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Esporta CSV */}
            {showExportModal && (
                <div className="modal-overlay" onClick={() => {
                    setShowExportModal(false);
                    setExportStartDate('');
                    setExportEndDate('');
                }}>
                    <div className="modal-content calendar-event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Esporta Calendario CSV</h2>
                            <button onClick={() => {
                                setShowExportModal(false);
                                setExportStartDate('');
                                setExportEndDate('');
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label-minimal">Data Inizio *</label>
                                <input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label-minimal">Data Fine *</label>
                                <input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div style={{ 
                                padding: '12px', 
                                background: 'rgba(10, 132, 255, 0.1)', 
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.8)',
                                marginTop: '16px'
                            }}>
                                Il file CSV includerà: Titolo, Descrizione, Data Inizio, Data Fine, Tipo, Creato da, Visibile a
                            </div>
                        </div>
                        <div className="modal-footer-minimal">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => {
                                    setShowExportModal(false);
                                    setExportStartDate('');
                                    setExportEndDate('');
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                className="btn-create"
                                onClick={handleExportCSV}
                                disabled={!exportStartDate || !exportEndDate}
                            >
                                <Download size={16} />
                                Esporta CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectCalendar;
