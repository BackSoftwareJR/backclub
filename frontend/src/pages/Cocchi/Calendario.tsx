import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    AlertCircle
} from 'lucide-react';
import './Calendario.css';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarEvent {
    id: number;
    tipo: 'pagamento' | 'scadenza' | 'nota' | 'promemoria';
    titolo: string;
    descrizione?: string;
    importo?: number;
    data: string;
    ora?: string;
    progetto?: string;
    categoria: 'entrata' | 'uscita' | 'admin' | 'generale';
    completato: boolean;
}

const Calendario: React.FC = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedProject, setSelectedProject] = useState<string>('all');

    // Mock data
    const projects = ['Tutti', 'Progetto Alpha', 'Progetto Beta', 'Progetto Gamma'];

    const events: CalendarEvent[] = [
        {
            id: 1,
            tipo: 'pagamento',
            titolo: 'Saldo Progetto Alpha',
            importo: 15000,
            data: '2025-01-15',
            ora: '09:00',
            progetto: 'Progetto Alpha',
            categoria: 'entrata',
            completato: false
        },
        {
            id: 2,
            tipo: 'scadenza',
            titolo: 'Affitto ufficio',
            importo: 2200,
            data: '2025-01-05',
            progetto: undefined,
            categoria: 'uscita',
            completato: false
        },
        {
            id: 3,
            tipo: 'nota',
            titolo: 'Meeting cliente Beta',
            descrizione: 'Discussione milestone progetto',
            data: '2025-01-10',
            ora: '14:30',
            progetto: 'Progetto Beta',
            categoria: 'admin',
            completato: false
        },
        {
            id: 4,
            tipo: 'promemoria',
            titolo: 'Preparare report mensile',
            data: '2025-01-31',
            ora: '10:00',
            categoria: 'generale',
            completato: false
        },
    ];

    // KPI calculations
    const totalEntrate = events
        .filter(e => e.categoria === 'entrata' && !e.completato)
        .reduce((sum, e) => sum + (e.importo || 0), 0);

    const totalUscite = events
        .filter(e => e.categoria === 'uscita' && !e.completato)
        .reduce((sum, e) => sum + (e.importo || 0), 0);

    const scadenzeInAttesa = events.filter(e =>
        (e.tipo === 'pagamento' || e.tipo === 'scadenza') && !e.completato
    ).length;

    const promemoria = events.filter(e =>
        e.tipo === 'promemoria' && !e.completato
    ).length;

    const formatCocchi = (amount: number) => amount.toLocaleString('it-IT');

    const getMonthName = (date: Date) => {
        return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Padding days from previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ date: null, events: [] });
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.data === dateStr);
            days.push({ date: day, events: dayEvents });
        }

        return days;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setSelectedDate(newDate);
    };

    return (
        <div className="calendario-advanced">
            {/* Back & Header */}
            <button className="btn-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
                Indietro
            </button>

            <div className="calendar-header-advanced">
                <div className="header-left-cal">
                    <h1>Calendario</h1>
                    <p className="subtitle">Gestione pagamenti, scadenze e promemoria</p>
                </div>
                <button className="btn-add">
                    <Plus size={18} />
                    Nuovo Evento
                </button>
            </div>

            {/* KPI Cards */}
            <div className="calendar-kpi-row">
                <div className="kpi-mini-card entrate">
                    <div className="kpi-mini-icon">
                        <DollarSign size={16} />
                    </div>
                    <div className="kpi-mini-content">
                        <div className="kpi-mini-label">Entrate Previste</div>
                        <div className="kpi-mini-value">+{formatCocchi(totalEntrate)}</div>
                    </div>
                </div>

                <div className="kpi-mini-card uscite">
                    <div className="kpi-mini-icon">
                        <DollarSign size={16} />
                    </div>
                    <div className="kpi-mini-content">
                        <div className="kpi-mini-label">Uscite Previste</div>
                        <div className="kpi-mini-value">−{formatCocchi(totalUscite)}</div>
                    </div>
                </div>

                <div className="kpi-mini-card scadenze">
                    <div className="kpi-mini-icon">
                        <AlertCircle size={16} />
                    </div>
                    <div className="kpi-mini-content">
                        <div className="kpi-mini-label">Scadenze</div>
                        <div className="kpi-mini-value">{scadenzeInAttesa}</div>
                    </div>
                </div>

                <div className="kpi-mini-card promemoria">
                    <div className="kpi-mini-icon">
                        <Clock size={16} />
                    </div>
                    <div className="kpi-mini-content">
                        <div className="kpi-mini-label">Promemoria</div>
                        <div className="kpi-mini-value">{promemoria}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="calendar-controls">
                <div className="view-mode-toggle">
                    <button
                        className={viewMode === 'day' ? 'active' : ''}
                        onClick={() => setViewMode('day')}
                    >
                        Giorno
                    </button>
                    <button
                        className={viewMode === 'week' ? 'active' : ''}
                        onClick={() => setViewMode('week')}
                    >
                        Settimana
                    </button>
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        Mese
                    </button>
                </div>

                <div className="calendar-nav">
                    <button className="nav-btn" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft size={18} />
                    </button>
                    <span className="current-month">{getMonthName(selectedDate)}</span>
                    <button className="nav-btn" onClick={() => navigateMonth('next')}>
                        <ChevronRight size={18} />
                    </button>
                </div>

                <select
                    className="project-filter"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                >
                    {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            {/* Calendar Views */}
            {viewMode === 'month' && (
                <div className="calendar-month-view">
                    <div className="calendar-weekdays">
                        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
                            <div key={day} className="weekday-label">{day}</div>
                        ))}
                    </div>

                    <div className="calendar-days-grid">
                        {getDaysInMonth(selectedDate).map((day, index) => (
                            <div
                                key={index}
                                className={`calendar-day-cell ${!day.date ? 'empty' : ''} ${day.events.length > 0 ? 'has-events' : ''}`}
                            >
                                {day.date && (
                                    <>
                                        <div className="day-number">{day.date}</div>
                                        {day.events.length > 0 && (
                                            <div className="day-events">
                                                {day.events.slice(0, 3).map(event => (
                                                    <div
                                                        key={event.id}
                                                        className={`mini-event ${event.categoria}`}
                                                        onClick={() => navigate(`/cocchi/transazione/${event.id}`)}
                                                    >
                                                        <div className="mini-event-dot" />
                                                        <div className="mini-event-title">{event.titolo}</div>
                                                    </div>
                                                ))}
                                                {day.events.length > 3 && (
                                                    <div className="more-events">+{day.events.length - 3} altri</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'week' && (
                <div className="calendar-coming-soon">
                    <CalendarIcon size={48} />
                    <p>Vista settimanale in arrivo...</p>
                </div>
            )}

            {viewMode === 'day' && (
                <div className="calendar-coming-soon">
                    <CalendarIcon size={48} />
                    <p>Vista giornaliera in arrivo...</p>
                </div>
            )}
        </div>
    );
};

export default Calendario;
