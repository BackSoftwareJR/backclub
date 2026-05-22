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
    Download
} from 'lucide-react';
import { 
    sellerCalendarApi,
    type SellerCalendarItem,
    type CreateSellerCalendarItemData,
    type ChecklistItem
} from '../../api/sellerCalendar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './SellerCalendar.css';

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
    // Per i seller non serve visibility
    // Metadata per export
    createdBy?: number;
    createdByName?: string;
    originalEvent?: SellerCalendarItem;
    originalTask?: any;
    // Task specific
    taskId?: number;
    taskStatus?: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
    taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
    // Call specific
    callLink?: string;
    callNotes?: string;
    // Per i seller non serve gestire partecipanti call separatamente
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

interface SellerCalendarProps {
    // Nessuna prop necessaria, il calendario è per il seller corrente
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

const SellerCalendar: React.FC<SellerCalendarProps> = () => {
    const { user } = useAuth();
    const { resolvedTheme } = useTheme();
    // Per i seller non serve verificare isAdmin
    
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
    const [editFormData, setEditFormData] = useState<CreateSellerCalendarItemData | null>(null);
    const [deletingItem, setDeletingItem] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<ChecklistItem[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newPopupChecklistItem, setNewPopupChecklistItem] = useState('');
    const [savingChecklist, setSavingChecklist] = useState(false);
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
    const [hourHeight, setHourHeight] = useState(75); // Altezza default per 12 ore visibili
    const [viewportHeight, setViewportHeight] = useState(900);
    const [saving, setSaving] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    
    // Form state per eventi/call/deadline
    const [formData, setFormData] = useState<CreateSellerCalendarItemData>({
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

    // Utenti partecipanti per call
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
    }, []);

    // Verifica se l'utente può completare eventi/call (i seller possono sempre completare i propri eventi)
    const canCompleteItem = (): boolean => {
        return true; // I seller possono sempre completare i propri eventi
    };

    const loadCalendarItems = async () => {
        try {
            const response = await sellerCalendarApi.getItems();
            
            // Converti gli eventi dal formato API al formato CalendarItem
            const eventItems: CalendarItem[] = response.data.events.map((event: SellerCalendarItem) => {
                const item: CalendarItem = {
                    id: event.id,
                    type: event.type as CalendarItemType,
                    title: event.title,
                    description: event.description || undefined,
                    startTime: new Date(event.start_time),
                    endTime: new Date(event.end_time),
                    color: event.color || undefined,
                    eventLocation: event.location || undefined,
                    callLink: event.call_link || undefined,
                    callNotes: event.call_notes || undefined,
                    deadlineType: event.deadline_type || undefined,
                    isAllDay: false,
                    createdBy: event.created_by,
                    originalEvent: event
                };
                
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

            // I seller non hanno task separati, solo eventi
            setCalendarItems(eventItems);
        } catch (error) {
            console.error('Error loading calendar items:', error);
            setCalendarItems([]);
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

    // Per i seller non serve caricare team members o utenti disponibili
    // Ogni seller gestisce solo i propri eventi

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
                checklist_items: [],
                has_checklist: false
            });
        }

        setCreateType(type);
        setCreateStartTime(startTime);
        setContextMenu(null);
        setShowCreateModal(true);
    };

    const handleFormChange = (field: keyof CreateSellerCalendarItemData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

        // Per i seller non serve gestire la visibilità, ogni seller vede solo i propri eventi

        // Per i seller, le call non richiedono partecipanti obbligatori

        try {
            setSaving(true);
            
            // Prepara i dati per l'API
            const submitData: CreateSellerCalendarItemData = {
                type: formData.type,
                title: formData.title.trim(),
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
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
                // Per i seller non serve gestire partecipanti
            }

            if (formData.type === 'deadline' && formData.deadline_type?.trim()) {
                submitData.deadline_type = formData.deadline_type.trim();
            }

            // Per i seller non serve gestire visibility

            // Aggiungi checklist se presente (solo per eventi)
            if (formData.type === 'event' && formData.has_checklist && formChecklist.length > 0) {
                submitData.checklist_items = formChecklist;
                submitData.has_checklist = true;
            }

            await sellerCalendarApi.createItem(submitData);
            
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
                checklist_items: [],
                has_checklist: false
            });
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
            
            // Per i seller, i task sono gestiti come eventi di tipo 'task'
            // Converti il task in un evento
            const taskEventData: CreateSellerCalendarItemData = {
                type: 'task',
                title: taskFormData.title.trim(),
                description: taskFormData.description || '',
                start_time: taskFormData.start_date ? new Date(taskFormData.start_date).toISOString() : new Date().toISOString(),
                end_time: taskFormData.due_date ? new Date(taskFormData.due_date).toISOString() : new Date().toISOString(),
                color: getTaskColor(taskFormData.status, taskFormData.priority)
            };
            await sellerCalendarApi.createItem(taskEventData);
            
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

    // Per i seller non serve gestire partecipanti o visibilità

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
            // Per i seller non serve gestire partecipanti call

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
                formatCSVField('Seller'), // Per i seller non serve gestire creatore o visibilità
                formatCSVField(''),
                formatCSVField(''),
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
        
        // Ottieni il wrapper scrollabile
        const wrapper = daysWrapperRef.current;
        if (!wrapper) return;
        
        // Calcola la posizione Y relativa al wrapper scrollabile
        const wrapperRect = wrapper.getBoundingClientRect();
        const clickYInWrapper = e.clientY - wrapperRect.top;
        
        // Aggiungi lo scroll per ottenere la posizione assoluta nel contenuto scrollabile
        const scrollTop = wrapper.scrollTop;
        const absoluteY = clickYInWrapper + scrollTop;
        
        // Sottrai l'altezza della sezione all-day (30px) per ottenere la posizione Y
        // relativa all'inizio dei time slots
        const ALL_DAY_HEIGHT = 30;
        const y = absoluteY - ALL_DAY_HEIGHT;
        
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

    // Inizia modifica item
    const handleStartEdit = () => {
        if (!selectedItem) return;
        
        // Prepara i dati del form con i valori attuali
        setEditFormData({
            type: selectedItem.type === 'task' ? 'event' : selectedItem.type as 'event' | 'call' | 'deadline' | 'reminder',
            title: selectedItem.title,
            description: selectedItem.description || '',
            start_time: formatDateTimeLocal(selectedItem.startTime),
            end_time: formatDateTimeLocal(selectedItem.endTime),
            location: selectedItem.eventLocation || '',
            call_link: selectedItem.callLink || '',
            call_notes: selectedItem.callNotes || '',
            deadline_type: selectedItem.deadlineType || '',
            color: selectedItem.color || getItemTypeColor(selectedItem.type),
            // Per i seller non serve visibility
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

    // Funzione helper per salvare checklist automaticamente
    const saveChecklistToBackend = async (checklist: ChecklistItem[]) => {
        if (!selectedItem) return;
        
        try {
            setSavingChecklist(true);
            await sellerCalendarApi.updateItem(selectedItem.id, {
                checklist_items: checklist,
                has_checklist: checklist.length > 0
            });
            // Aggiorna anche il calendario per sincronizzare
            await loadCalendarItems();
        } catch (error: any) {
            console.error('Error saving checklist:', error);
            // In caso di errore, ricarica i dati
            await loadCalendarItems();
            // Ricarica l'item selezionato
            const response = await sellerCalendarApi.getItems();
            const updatedItem = response.data.events.find((e: any) => e.id === selectedItem.id);
            if (updatedItem) {
                const item: CalendarItem = {
                    id: updatedItem.id,
                    type: updatedItem.type as CalendarItemType,
                    title: updatedItem.title,
                    description: updatedItem.description || undefined,
                    startTime: new Date(updatedItem.start_time),
                    endTime: new Date(updatedItem.end_time),
                    color: updatedItem.color || undefined,
                    // Per i seller non serve visibility
                    eventLocation: updatedItem.location || undefined,
                    callLink: updatedItem.call_link || undefined,
                    callNotes: updatedItem.call_notes || undefined,
                    deadlineType: updatedItem.deadline_type || undefined,
                    isAllDay: false,
                    createdBy: updatedItem.created_by,
                    originalEvent: updatedItem
                };
                
                if (updatedItem.checklist_items) {
                    try {
                        const checklistData = typeof updatedItem.checklist_items === 'string' 
                            ? JSON.parse(updatedItem.checklist_items) 
                            : updatedItem.checklist_items;
                        item.checklistItems = Array.isArray(checklistData) ? checklistData : [];
                        item.hasChecklist = item.checklistItems.length > 0;
                    } catch (e) {
                        item.checklistItems = [];
                        item.hasChecklist = false;
                    }
                }
                
                setSelectedItem(item);
            }
        } finally {
            setSavingChecklist(false);
        }
    };

    // Toggle checklist item dal popup (non in modifica) - salvataggio automatico
    const handleToggleChecklistItemFromPopup = async (itemId: string) => {
        if (!selectedItem || !selectedItem.checklistItems) return;
        
        const updatedChecklist = selectedItem.checklistItems.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        
        // Aggiorna immediatamente l'item nel state locale (ottimistic update)
        setSelectedItem(prev => prev ? {
            ...prev,
            checklistItems: updatedChecklist
        } : null);
        
        // Salva automaticamente sul backend in background
        await saveChecklistToBackend(updatedChecklist);
    };

    // Aggiungi nuovo item alla checklist dal popup - salvataggio automatico
    const handleAddChecklistItemFromPopup = async () => {
        if (!selectedItem || !newPopupChecklistItem.trim()) return;
        
        const currentChecklist = selectedItem.checklistItems || [];
        const newItem: ChecklistItem = {
            id: Date.now().toString(),
            text: newPopupChecklistItem.trim(),
            completed: false
        };
        
        const updatedChecklist = [...currentChecklist, newItem];
        
        // Aggiorna immediatamente l'item nel state locale
        setSelectedItem(prev => prev ? {
            ...prev,
            checklistItems: updatedChecklist,
            hasChecklist: true
        } : null);
        
        setNewPopupChecklistItem('');
        
        // Salva automaticamente sul backend
        await saveChecklistToBackend(updatedChecklist);
    };

    // Rimuovi item dalla checklist dal popup - salvataggio automatico
    const handleRemoveChecklistItemFromPopup = async (itemId: string) => {
        if (!selectedItem || !selectedItem.checklistItems) return;
        
        const updatedChecklist = selectedItem.checklistItems.filter(item => item.id !== itemId);
        
        // Aggiorna immediatamente l'item nel state locale
        setSelectedItem(prev => prev ? {
            ...prev,
            checklistItems: updatedChecklist,
            hasChecklist: updatedChecklist.length > 0
        } : null);
        
        // Salva automaticamente sul backend
        await saveChecklistToBackend(updatedChecklist);
    };

    // Contrassegna evento/call come completata
    const handleCompleteItem = async () => {
        if (!selectedItem || !user) return;
        
        // Verifica permessi
        if (!canCompleteItem()) {
            alert('Solo gli admin o i project manager possono contrassegnare eventi come completati');
            return;
        }
        
        // Solo eventi e call possono essere completati, non task
        if (selectedItem.type === 'task') {
            alert('I task non possono essere contrassegnati come completati da qui');
            return;
        }
        
        try {
            setCompletingItem(true);
            
            const isCurrentlyCompleted = selectedItem.isCompleted;
            
            // Aggiorna immediatamente lo stato locale
            setSelectedItem(prev => prev ? {
                ...prev,
                isCompleted: !isCurrentlyCompleted,
                completedAt: !isCurrentlyCompleted ? new Date() : undefined,
                completedBy: !isCurrentlyCompleted ? user.id : undefined
            } : null);
            
            // Salva sul backend
            await sellerCalendarApi.completeItem(selectedItem.id);
            
            // Ricarica gli eventi per sincronizzare
            await loadCalendarItems();
        } catch (error: any) {
            console.error('Error completing item:', error);
            alert('Errore nel completamento dell\'evento');
            // Ripristina lo stato
            await loadCalendarItems();
        } finally {
            setCompletingItem(false);
        }
    };

    // Salva modifiche item
    const handleSaveEdit = async () => {
        if (!selectedItem || !editFormData) return;

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

        // Per i seller non serve gestire visibility

        try {
            setSaving(true);
            
            // Prepara i dati per l'API
            const submitData: Partial<CreateSellerCalendarItemData> = {
                type: editFormData.type,
                title: editFormData.title.trim(),
                start_time: new Date(editFormData.start_time).toISOString(),
                end_time: new Date(editFormData.end_time).toISOString(),
                // Per i seller non serve visibility
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

            // Per i seller non serve gestire visibility

            // Aggiungi checklist se presente
            if (editFormData.has_checklist && editingChecklist.length > 0) {
                submitData.checklist_items = editingChecklist;
                submitData.has_checklist = true;
            } else {
                submitData.checklist_items = [];
                submitData.has_checklist = false;
            }

            await sellerCalendarApi.updateItem(selectedItem.id, submitData);
            
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
            await sellerCalendarApi.deleteItem(selectedItem.id);
            
            // Ricarica gli eventi
            await loadCalendarItems();
            
            // Chiudi modal
            setShowItemDetailsModal(false);
            setSelectedItem(null);
            setIsEditingItem(false);
            setEditFormData(null);
        } catch (error: any) {
            console.error('Error deleting calendar item:', error);
            alert(error.response?.data?.message || 'Errore nell\'eliminazione dell\'evento');
        } finally {
            setDeletingItem(false);
        }
    };

    // Gestione cambio form modifica
    const handleEditFormChange = (field: keyof CreateSellerCalendarItemData, value: any) => {
        if (!editFormData) return;
        setEditFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    // Per i seller non serve gestire visibility

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
                    await sellerCalendarApi.dragItem(
                        // Per i seller non serve projectId
                        updatedItem.id,
                        updatedItem.startTime.toISOString(),
                        updatedItem.endTime.toISOString()
                    );
                    
                    // Per i seller non serve onItemDrag callback
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
    }, [dragEnabled, draggedItem, calendarItems]);

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
                await sellerCalendarApi.dragItem(
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
    }, [resizingItem, calendarItems]);

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
            
            // Per i seller non serve filtro per visibilità
            const matchesVisibility = true;
            
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
            className={`project-calendar ${resolvedTheme}`}
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
                        
                        {/* Per i seller non serve filtro admin per visibility */}
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

                                    return (
                                        <div key={dayIndex} className="calendar-day-column">
                                            {/* All day section */}
                                            <div className="calendar-all-day-slots">
                                                {allDayItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="calendar-item calendar-item-all-day"
                                                        style={{
                                                            backgroundColor: item.color || getItemTypeColor(item.type),
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            marginBottom: '2px'
                                                        }}
                                                    >
                                                        {item.title}
                                                    </div>
                                                ))}
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
                                                                <option value="">Per i seller non serve selezionare utenti del team</option>
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
                                                <div className="users-checkbox-list-minimal">
                                                    <div className="no-users-minimal">Per i seller non serve selezionare partecipanti</div>
                                                </div>
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

                                {/* Per i seller non serve gestire visibility - ogni seller vede solo i propri eventi */}
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

            {/* Item Details Modal */}
            {showItemDetailsModal && selectedItem && (
                <div className="modal-overlay" onClick={() => {
                    if (!isEditingItem) {
                    setShowItemDetailsModal(false);
                    setSelectedItem(null);
                        setIsEditingItem(false);
                        setEditFormData(null);
                    }
                }}>
                    <div className="modal-content calendar-event-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {isEditingItem ? 'Modifica Evento' : selectedItem.title}
                            </h2>
                            <button onClick={() => {
                                setShowItemDetailsModal(false);
                                setSelectedItem(null);
                                setIsEditingItem(false);
                                setEditFormData(null);
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {isEditingItem && editFormData ? (
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
                                    {/* Per i seller non serve gestire visibility */}

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
                            <div className="item-details-content">
                                {selectedItem.description && (
                                    <div className="item-detail-section">
                                        <label className="item-detail-label">Descrizione</label>
                                        <p className="item-detail-value">{selectedItem.description}</p>
                                    </div>
                                )}
                                
                                <div className="item-detail-section">
                                    <label className="item-detail-label">Inizio</label>
                                    <p className="item-detail-value">
                                        {selectedItem.startTime.toLocaleString('it-IT', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                
                                <div className="item-detail-section">
                                    <label className="item-detail-label">Fine</label>
                                    <p className="item-detail-value">
                                        {selectedItem.endTime.toLocaleString('it-IT', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                
                                {selectedItem.eventLocation && (
                                    <div className="item-detail-section">
                                        <label className="item-detail-label">Luogo</label>
                                        <p className="item-detail-value">{selectedItem.eventLocation}</p>
                                    </div>
                                )}
                                
                                {selectedItem.type === 'call' && selectedItem.callLink && (
                                    <div className="item-detail-section">
                                        <label className="item-detail-label">Link Call</label>
                                        <a 
                                            href={selectedItem.callLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="item-detail-link"
                                        >
                                            {selectedItem.callLink}
                                        </a>
                                    </div>
                                )}
                                
                                {selectedItem.type === 'call' && selectedItem.callNotes && (
                                    <div className="item-detail-section">
                                        <label className="item-detail-label">Note Call</label>
                                        <p className="item-detail-value">{selectedItem.callNotes}</p>
                                    </div>
                                )}
                                
                                {/* Per i seller non serve mostrare partecipanti */}
                                
                                {/* Checklist (solo per eventi) */}
                                {selectedItem.type === 'event' && (
                                    <div className="item-detail-section">
                                        <label className="item-detail-label">Checklist</label>
                                        {selectedItem.checklistItems && selectedItem.checklistItems.length > 0 && (
                                            <div className="checklist-display">
                                                {selectedItem.checklistItems.map(item => (
                                                    <div key={item.id} className="checklist-item-display-with-remove">
                                                        <label className="checklist-item-display">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.completed}
                                                                onChange={() => handleToggleChecklistItemFromPopup(item.id)}
                                                                disabled={savingChecklist}
                                                            />
                                                            <span style={{ 
                                                                textDecoration: item.completed ? 'line-through' : 'none',
                                                                opacity: item.completed ? 0.6 : 1
                                                            }}>
                                                                {item.text}
                                                            </span>
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveChecklistItemFromPopup(item.id)}
                                                            disabled={savingChecklist}
                                                            style={{ 
                                                                background: 'transparent', 
                                                                border: 'none', 
                                                                color: 'rgba(255, 255, 255, 0.5)',
                                                                cursor: savingChecklist ? 'not-allowed' : 'pointer',
                                                                padding: '4px 8px',
                                                                marginLeft: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                            title="Rimuovi"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Aggiungi nuovo item alla checklist */}
                                        <div className="checklist-add-item-popup" style={{ marginTop: '12px' }}>
                                            <input
                                                type="text"
                                                value={newPopupChecklistItem}
                                                onChange={(e) => setNewPopupChecklistItem(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !savingChecklist) {
                                                        e.preventDefault();
                                                        handleAddChecklistItemFromPopup();
                                                    }
                                                }}
                                                placeholder="Aggiungi elemento checklist..."
                                                className="form-input"
                                                style={{ marginBottom: '8px', fontSize: '13px' }}
                                                disabled={savingChecklist}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddChecklistItemFromPopup}
                                                disabled={savingChecklist || !newPopupChecklistItem.trim()}
                                                className="btn-secondary"
                                                style={{ fontSize: '12px', padding: '6px 12px', opacity: savingChecklist ? 0.5 : 1 }}
                                            >
                                                {savingChecklist ? 'Salvataggio...' : <><Plus size={14} /> Aggiungi</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="item-detail-section">
                                    <label className="item-detail-label">Tipo</label>
                                    <p className="item-detail-value">
                                        {selectedItem.type === 'event' ? 'Evento' :
                                         selectedItem.type === 'call' ? 'Call' :
                                         selectedItem.type === 'deadline' ? 'Scadenza' :
                                         selectedItem.type === 'reminder' ? 'Promemoria' :
                                         selectedItem.type === 'task' ? 'Task' : 'Altro'}
                                    </p>
                                </div>
                                
                                <div className="item-detail-section">
                                    <label className="item-detail-label">Colore</label>
                                    <div className="item-detail-color">
                                        <div 
                                            className="item-detail-color-preview"
                                            style={{ backgroundColor: selectedItem.color || getItemTypeColor(selectedItem.type) }}
                                        />
                                        <span className="item-detail-color-value">
                                            {selectedItem.color || getItemTypeColor(selectedItem.type)}
                                        </span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer-minimal">
                                        {/* Pulsante Contrassegna come completata (solo per eventi e call, solo per admin/PM) */}
                                        {(selectedItem.type === 'event' || selectedItem.type === 'call') && canCompleteItem() && (
                                            <button
                                                type="button"
                                                className={selectedItem.isCompleted ? "btn-complete-active" : "btn-complete"}
                                                onClick={handleCompleteItem}
                                                disabled={completingItem}
                                                style={{
                                                    backgroundColor: selectedItem.isCompleted ? '#34C759' : 'rgba(52, 199, 89, 0.2)',
                                                    color: selectedItem.isCompleted ? '#fff' : '#34C759',
                                                    border: `1px solid ${selectedItem.isCompleted ? '#34C759' : 'rgba(52, 199, 89, 0.3)'}`
                                                }}
                                            >
                                                {completingItem ? 'Salvataggio...' : selectedItem.isCompleted ? '✓ Completata' : 'Contrassegna come completata'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn-delete"
                                            onClick={handleDeleteItem}
                                            disabled={deletingItem}
                                        >
                                            <Trash2 size={16} />
                                            {deletingItem ? 'Eliminazione...' : 'Elimina'}
                                        </button>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => {
                                    setShowItemDetailsModal(false);
                                    setSelectedItem(null);
                                }}
                            >
                                Chiudi
                            </button>
                                            <button
                                                type="button"
                                                className="btn-edit"
                                                onClick={handleStartEdit}
                                            >
                                                <Edit size={16} />
                                                Modifica
                            </button>
                                        </div>
                                    </div>
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

export default SellerCalendar;
