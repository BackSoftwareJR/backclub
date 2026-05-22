import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  CalendarDays,
  LayoutList,
  Grid3X3,
} from 'lucide-react';
import { sellerCalendarApi, type SellerCalendarItem, type CreateSellerCalendarItemData } from '../../api/sellerCalendar';
import { useTheme } from '../../context/ThemeContext';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerAgendaMobile.css';

type ViewMode = 'day' | 'week' | 'month';

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];

const SellerAgendaMobile: React.FC = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  const [allItems, setAllItems] = useState<SellerCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedItem, setSelectedItem] = useState<SellerCalendarItem | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => new Date());
  const [showEventFormSheet, setShowEventFormSheet] = useState(false);
  const [eventFormMode, setEventFormMode] = useState<'create' | 'edit'>('create');
  const [eventFormSaving, setEventFormSaving] = useState(false);
  const [eventFormData, setEventFormData] = useState<CreateSellerCalendarItemData>({
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
    has_checklist: false,
  });

  useEffect(() => {
    if (showDatePicker) setDatePickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [showDatePicker]);

  useEffect(() => {
    loadAllItems();
  }, []);

  const loadAllItems = async () => {
    try {
      setLoading(true);
      const response = await sellerCalendarApi.getItems();
      const events = response.data.events || [];
      setAllItems(events);
    } catch (error) {
      console.error('Errore nel caricamento eventi:', error);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const getEndOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const itemsForDay = useCallback((date: Date): SellerCalendarItem[] => {
    const start = getStartOfDay(date);
    const end = getEndOfDay(date);
    return allItems
      .filter((item) => {
        const itemStart = new Date(item.start_time);
        return itemStart >= start && itemStart <= end;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [allItems]);

  const weekDates = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthDatesForPicker = useMemo(() => {
    const year = datePickerMonth.getFullYear();
    const month = datePickerMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstDay = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [datePickerMonth]);

  const monthDatesForView = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstDay = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [selectedDate]);

  const hasEventsOnDay = (date: Date) => {
    const start = getStartOfDay(date);
    const end = getEndOfDay(date);
    return allItems.some((item) => {
      const itemStart = new Date(item.start_time);
      return itemStart >= start && itemStart <= end;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return Video;
      case 'event': return Calendar;
      case 'task': return CheckCircle;
      case 'deadline': return Clock;
      case 'reminder': return Circle;
      default: return Calendar;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call': return '#FF9500';
      case 'event': return '#5856D6';
      case 'task': return '#0A84FF';
      case 'deadline': return '#FF3B30';
      case 'reminder': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const handleComplete = async (item: SellerCalendarItem) => {
    try {
      await sellerCalendarApi.completeItem(item.id);
      await loadAllItems();
      setShowActionsSheet(false);
    } catch (error) {
      console.error('Errore nel completamento:', error);
      alert("Errore nel completamento dell'evento");
    }
  };

  const handleDelete = async (item: SellerCalendarItem) => {
    if (!confirm('Vuoi eliminare questo evento?')) return;
    try {
      await sellerCalendarApi.deleteItem(item.id);
      await loadAllItems();
      setShowActionsSheet(false);
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      alert("Errore nell'eliminazione dell'evento");
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    if (viewMode === 'month') setViewMode('day');
  };

  const toDatetimeLocal = (iso: string): string => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  const openCreateEvent = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    setEventFormData({
      type: 'event',
      title: '',
      description: '',
      start_time: toDatetimeLocal(start.toISOString()),
      end_time: toDatetimeLocal(end.toISOString()),
      location: '',
      call_link: '',
      call_notes: '',
      deadline_type: '',
      color: '',
      has_checklist: false,
    });
    setEventFormMode('create');
    setShowEventFormSheet(true);
  };

  const openEditEvent = () => {
    if (!selectedItem) return;
    setEventFormData({
      type: selectedItem.type,
      title: selectedItem.title,
      description: selectedItem.description || '',
      start_time: toDatetimeLocal(selectedItem.start_time),
      end_time: toDatetimeLocal(selectedItem.end_time),
      location: selectedItem.location || '',
      call_link: selectedItem.call_link || '',
      call_notes: selectedItem.call_notes || '',
      deadline_type: selectedItem.deadline_type || '',
      color: selectedItem.color || '',
      has_checklist: selectedItem.has_checklist || false,
    });
    setEventFormMode('edit');
    setShowActionsSheet(false);
    setShowEventFormSheet(true);
  };

  const setEventFormField = (field: keyof CreateSellerCalendarItemData, value: string | boolean | undefined) => {
    setEventFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'start_time' && typeof value === 'string' && value) {
        const start = new Date(value);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        next.end_time = toDatetimeLocal(end.toISOString());
      }
      return next;
    });
  };

  const handleEventFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim()) {
      alert('Inserisci un titolo');
      return;
    }
    if (!eventFormData.start_time || !eventFormData.end_time) {
      alert('Inserisci data e ora di inizio e fine');
      return;
    }
    if (new Date(eventFormData.end_time) <= new Date(eventFormData.start_time)) {
      alert('La data di fine deve essere successiva alla data di inizio');
      return;
    }
    try {
      setEventFormSaving(true);
      const payload: CreateSellerCalendarItemData = {
        type: eventFormData.type,
        title: eventFormData.title.trim(),
        start_time: new Date(eventFormData.start_time).toISOString(),
        end_time: new Date(eventFormData.end_time).toISOString(),
        description: eventFormData.description?.trim() || undefined,
        location: eventFormData.type === 'event' ? eventFormData.location?.trim() : undefined,
        call_link: eventFormData.type === 'call' ? eventFormData.call_link?.trim() : undefined,
        call_notes: eventFormData.type === 'call' ? eventFormData.call_notes?.trim() : undefined,
        deadline_type: eventFormData.type === 'deadline' ? eventFormData.deadline_type?.trim() : undefined,
        color: eventFormData.color || undefined,
        has_checklist: eventFormData.has_checklist || false,
      };
      if (eventFormMode === 'create') {
        await sellerCalendarApi.createItem(payload);
        await loadAllItems();
        setShowEventFormSheet(false);
      } else if (selectedItem) {
        await sellerCalendarApi.updateItem(selectedItem.id, payload);
        await loadAllItems();
        setShowEventFormSheet(false);
        setSelectedItem(null);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : eventFormMode === 'create'
          ? 'Errore nella creazione dell\'evento'
          : 'Errore nel salvataggio';
      alert(msg);
    } finally {
      setEventFormSaving(false);
    }
  };

  const dayItems = itemsForDay(selectedDate);

  return (
    <PullToRefresh onRefresh={loadAllItems}>
      <div className={`seller-agenda-mobile seller-agenda-mobile--${resolvedTheme}`}>
        {/* Header */}
        <header className="seller-agenda-mobile__header">
          <div className="seller-agenda-mobile__header-top">
            <div>
              <h1 className="seller-agenda-mobile__title">Agenda</h1>
              <button
                type="button"
                className="seller-agenda-mobile__date-btn"
                onClick={() => setShowDatePicker(true)}
                aria-label="Seleziona data"
              >
                {formatDate(selectedDate)}
              </button>
            </div>
            <button
              type="button"
              className="seller-agenda-mobile__add-btn"
              onClick={openCreateEvent}
              aria-label={t('agenda.new_event')}
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>

          {/* View mode: Giorno | Settimana | Mese */}
          <div className="seller-agenda-mobile__view-switcher" role="tablist" aria-label="Vista calendario">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'day'}
              className={`seller-agenda-mobile__view-tab ${viewMode === 'day' ? 'seller-agenda-mobile__view-tab--active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              <LayoutList size={18} />
              <span>Giorno</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'week'}
              className={`seller-agenda-mobile__view-tab ${viewMode === 'week' ? 'seller-agenda-mobile__view-tab--active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              <CalendarDays size={18} />
              <span>Settimana</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'month'}
              className={`seller-agenda-mobile__view-tab ${viewMode === 'month' ? 'seller-agenda-mobile__view-tab--active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 size={18} />
              <span>Mese</span>
            </button>
          </div>

          {/* Date strip: solo in vista Giorno */}
          {viewMode === 'day' && (
            <div className="seller-agenda-mobile__date-strip">
              <button type="button" className="seller-agenda-mobile__date-nav" onClick={() => changeDate(-1)} aria-label="Giorno precedente">
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className={`seller-agenda-mobile__date-today ${isToday(selectedDate) ? 'seller-agenda-mobile__date-today--active' : ''}`}
                onClick={goToToday}
              >
                {isToday(selectedDate) ? 'Oggi' : 'Vai a oggi'}
              </button>
              <button type="button" className="seller-agenda-mobile__date-nav" onClick={() => changeDate(1)} aria-label="Giorno successivo">
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </header>

        {/* Content */}
        {loading ? (
          <div className="seller-agenda-mobile__content seller-agenda-mobile__content--loading">
            <SkeletonLoader type="card" count={5} />
          </div>
        ) : viewMode === 'day' ? (
          <div className="seller-agenda-mobile__content">
            {dayItems.length === 0 ? (
              <div className="seller-agenda-mobile__empty">
                <Calendar size={48} className="seller-agenda-mobile__empty-icon" />
                <p className="seller-agenda-mobile__empty-title">{t('agenda.no_event')}</p>
                <p className="seller-agenda-mobile__empty-text">Non ci sono eventi per questa data</p>
              </div>
            ) : (
              <ul className="seller-agenda-mobile__list">
                {dayItems.map((item) => {
                  const Icon = getTypeIcon(item.type);
                  const color = getTypeColor(item.type);
                  const isCompleted = !!item.completed_at;
                  return (
                    <li key={item.id} className="seller-agenda-mobile__card-wrap">
                      <button
                        type="button"
                        className={`seller-agenda-mobile__card ${isCompleted ? 'seller-agenda-mobile__card--completed' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setShowActionsSheet(true);
                        }}
                      >
                        <div className="seller-agenda-mobile__card-time" style={{ borderLeftColor: color }}>
                          <span className="seller-agenda-mobile__card-time-start">{formatTime(item.start_time)}</span>
                          {item.end_time && (
                            <span className="seller-agenda-mobile__card-time-end">{formatTime(item.end_time)}</span>
                          )}
                        </div>
                        <div className="seller-agenda-mobile__card-body">
                          <div className="seller-agenda-mobile__card-head">
                            <span className="seller-agenda-mobile__card-icon" style={{ backgroundColor: `${color}20`, color }}>
                              <Icon size={20} />
                            </span>
                            <span className="seller-agenda-mobile__card-title">{item.title}</span>
                            {isCompleted && <CheckCircle size={20} className="seller-agenda-mobile__card-check" />}
                          </div>
                          {item.description && (
                            <p className="seller-agenda-mobile__card-desc">{item.description}</p>
                          )}
                          <div className="seller-agenda-mobile__card-meta">
                            {item.location && (
                              <span className="seller-agenda-mobile__card-meta-item">
                                <MapPin size={12} /> {item.location}
                              </span>
                            )}
                            {item.call_link && (
                              <span className="seller-agenda-mobile__card-meta-item seller-agenda-mobile__card-meta-item--link">
                                <Video size={12} /> Videochiamata
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : viewMode === 'week' ? (
          <div className="seller-agenda-mobile__content seller-agenda-mobile__week">
            <div className="seller-agenda-mobile__week-nav">
              <button type="button" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}>
                <ChevronLeft size={20} />
              </button>
              <span className="seller-agenda-mobile__week-label">
                {formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])}
              </span>
              <button type="button" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="seller-agenda-mobile__week-days">
              {weekDates.map((day) => {
                const items = itemsForDay(day);
                const isSelectedDay = selectedDate.toDateString() === day.toDateString();
                return (
                  <section key={day.toISOString()} className="seller-agenda-mobile__week-day">
                    <button
                      type="button"
                      className={`seller-agenda-mobile__week-day-header ${isSelectedDay ? 'seller-agenda-mobile__week-day-header--selected' : ''} ${isToday(day) ? 'seller-agenda-mobile__week-day-header--today' : ''}`}
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode('day');
                      }}
                    >
                      <span className="seller-agenda-mobile__week-day-name">{WEEKDAYS[day.getDay()]}</span>
                      <span className="seller-agenda-mobile__week-day-num">{day.getDate()}</span>
                      {items.length > 0 && <span className="seller-agenda-mobile__week-day-dot" />}
                    </button>
                    <ul className="seller-agenda-mobile__week-day-list">
                      {items.length === 0 ? (
                        <li className="seller-agenda-mobile__week-day-empty">Nessun evento</li>
                      ) : (
                        items.slice(0, 3).map((item) => {
                          const Icon = getTypeIcon(item.type);
                          const color = getTypeColor(item.type);
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                className="seller-agenda-mobile__week-item"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowActionsSheet(true);
                                }}
                              >
                                <span className="seller-agenda-mobile__week-item-icon" style={{ backgroundColor: `${color}20`, color }}>
                                  <Icon size={14} />
                                </span>
                                <span className="seller-agenda-mobile__week-item-time">{formatTime(item.start_time)}</span>
                                <span className="seller-agenda-mobile__week-item-title">{item.title}</span>
                              </button>
                            </li>
                          );
                        })
                      )}
                      {items.length > 3 && (
                        <li className="seller-agenda-mobile__week-day-more">
                          +{items.length - 3} altri
                        </li>
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        ) : (
          /* Month view */
          <div className="seller-agenda-mobile__content seller-agenda-mobile__month">
            <div className="seller-agenda-mobile__month-header">
              <button
                type="button"
                className="seller-agenda-mobile__month-nav"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
              >
                <ChevronLeft size={22} />
              </button>
              <span className="seller-agenda-mobile__month-title">
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <button
                type="button"
                className="seller-agenda-mobile__month-nav"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
              >
                <ChevronRight size={22} />
              </button>
            </div>
            <div className="seller-agenda-mobile__month-weekdays">
              {WEEKDAYS.map((wd) => (
                <span key={wd} className="seller-agenda-mobile__month-weekday">{wd}</span>
              ))}
            </div>
            <div className="seller-agenda-mobile__month-grid">
              {monthDatesForView.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="seller-agenda-mobile__month-cell seller-agenda-mobile__month-cell--empty" />;
                }
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const hasEvents = hasEventsOnDay(date);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`seller-agenda-mobile__month-cell ${isSelected ? 'seller-agenda-mobile__month-cell--selected' : ''} ${isToday(date) ? 'seller-agenda-mobile__month-cell--today' : ''} ${hasEvents ? 'seller-agenda-mobile__month-cell--has-events' : ''}`}
                    onClick={() => selectDay(date)}
                  >
                    <span className="seller-agenda-mobile__month-cell-num">{date.getDate()}</span>
                    {hasEvents && <span className="seller-agenda-mobile__month-cell-dot" />}
                  </button>
                );
              })}
            </div>
            <p className="seller-agenda-mobile__month-hint">Tocca un giorno per vedere gli eventi</p>
          </div>
        )}

        {/* Bottom sheet: dettaglio evento + azioni */}
        <BottomSheet
          isOpen={showActionsSheet}
          onClose={() => { setShowActionsSheet(false); setSelectedItem(null); }}
          title={selectedItem?.title || 'Dettaglio'}
          snapPoints={[50]}
        >
          {selectedItem && (
            <>
              <div className="seller-agenda-mobile__event-detail">
                <div className="seller-agenda-mobile__event-detail-row seller-agenda-mobile__event-detail-time">
                  <Clock size={16} />
                  <span>
                    {formatTime(selectedItem.start_time)}
                    {selectedItem.end_time && ` – ${formatTime(selectedItem.end_time)}`}
                  </span>
                </div>
                <div className="seller-agenda-mobile__event-detail-row">
                  <Calendar size={16} />
                  <span>{formatDate(new Date(selectedItem.start_time))}</span>
                </div>
                <div className="seller-agenda-mobile__event-detail-row">
                  <span
                    className="seller-agenda-mobile__event-type-badge"
                    style={{ backgroundColor: `${getTypeColor(selectedItem.type)}20`, color: getTypeColor(selectedItem.type) }}
                  >
                    {selectedItem.type === 'task' && 'Task'}
                    {selectedItem.type === 'event' && 'Evento'}
                    {selectedItem.type === 'call' && 'Call'}
                    {selectedItem.type === 'deadline' && 'Scadenza'}
                    {selectedItem.type === 'reminder' && 'Promemoria'}
                    {!['task', 'event', 'call', 'deadline', 'reminder'].includes(selectedItem.type) && selectedItem.type}
                  </span>
                </div>
                {selectedItem.completed_at && (
                  <div className="seller-agenda-mobile__event-detail-row seller-agenda-mobile__event-detail-completed">
                    <CheckCircle size={16} />
                    <span>Completato</span>
                  </div>
                )}
                {selectedItem.description && (
                  <div className="seller-agenda-mobile__event-detail-desc">
                    <p>{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.location && (
                  <div className="seller-agenda-mobile__event-detail-row">
                    <MapPin size={16} />
                    <span>{selectedItem.location}</span>
                  </div>
                )}
                {selectedItem.call_link && (
                  <div className="seller-agenda-mobile__event-detail-row seller-agenda-mobile__event-detail-link">
                    <Video size={16} />
                    <span>Videochiamata</span>
                  </div>
                )}
              </div>
              <div className="seller-agenda-mobile__actions">
                {!selectedItem.completed_at && (
                  <button
                    type="button"
                    className="seller-agenda-mobile__action-btn seller-agenda-mobile__action-btn--complete"
                    onClick={() => handleComplete(selectedItem)}
                  >
                    <CheckCircle size={18} />
                    <span>Completato</span>
                  </button>
                )}
              <button
                type="button"
                className="seller-agenda-mobile__action-btn"
                onClick={openEditEvent}
              >
                <Edit size={18} />
                <span>Modifica</span>
              </button>
                <button
                  type="button"
                  className="seller-agenda-mobile__action-btn seller-agenda-mobile__action-btn--delete"
                  onClick={() => handleDelete(selectedItem)}
                >
                  <Trash2 size={18} />
                  <span>Elimina</span>
                </button>
              </div>
            </>
          )}
        </BottomSheet>

        {/* Bottom sheet: seleziona giorno */}
        <BottomSheet
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          title="Seleziona giorno"
          snapPoints={[50]}
        >
          <div className="seller-agenda-mobile__date-picker">
            <div className="seller-agenda-mobile__date-picker-header">
              <button
                type="button"
                className="seller-agenda-mobile__date-picker-nav"
                onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
              >
                <ChevronLeft size={24} />
              </button>
              <span className="seller-agenda-mobile__date-picker-month">
                {MONTHS[datePickerMonth.getMonth()]} {datePickerMonth.getFullYear()}
              </span>
              <button
                type="button"
                className="seller-agenda-mobile__date-picker-nav"
                onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="seller-agenda-mobile__date-picker-weekdays">
              {WEEKDAYS.map((wd) => (
                <span key={wd}>{wd}</span>
              ))}
            </div>
            <div className="seller-agenda-mobile__date-picker-grid">
              {monthDatesForPicker.map((date, idx) => {
                if (!date) {
                  return <div key={`e-${idx}`} className="seller-agenda-mobile__date-picker-cell seller-agenda-mobile__date-picker-cell--empty" />;
                }
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const hasEvents = hasEventsOnDay(date);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`seller-agenda-mobile__date-picker-cell ${isSelected ? 'seller-agenda-mobile__date-picker-cell--selected' : ''} ${isToday(date) ? 'seller-agenda-mobile__date-picker-cell--today' : ''} ${hasEvents ? 'seller-agenda-mobile__date-picker-cell--has-events' : ''}`}
                    onClick={() => selectDay(date)}
                  >
                    {date.getDate()}
                    {hasEvents && <span className="seller-agenda-mobile__date-picker-dot" />}
                  </button>
                );
              })}
            </div>
            <button type="button" className="seller-agenda-mobile__date-picker-today" onClick={goToToday}>
              Vai a oggi
            </button>
          </div>
        </BottomSheet>

        {/* Bottom sheet: form nuovo / modifica evento */}
        <BottomSheet
          isOpen={showEventFormSheet}
          onClose={() => {
            setShowEventFormSheet(false);
            if (eventFormMode === 'edit') setSelectedItem(null);
          }}
          title={eventFormMode === 'create' ? 'Nuovo evento' : 'Modifica evento'}
          snapPoints={[90]}
        >
          <div className="seller-agenda-mobile__event-form-wrap">
          <form className="seller-agenda-mobile__event-form" onSubmit={handleEventFormSubmit}>
            <div className="seller-agenda-mobile__event-form-body">
              <div className="seller-agenda-mobile__form-group">
                <label>Tipo</label>
                <select
                  value={eventFormData.type}
                  onChange={(e) => setEventFormField('type', e.target.value as CreateSellerCalendarItemData['type'])}
                  className="seller-agenda-mobile__form-input"
                >
                  <option value="event">Evento</option>
                  <option value="call">Call</option>
                  <option value="deadline">Scadenza</option>
                  <option value="task">Task</option>
                  <option value="reminder">Promemoria</option>
                </select>
              </div>
              <div className="seller-agenda-mobile__form-group">
                <label>Titolo *</label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => setEventFormField('title', e.target.value)}
                  placeholder="Titolo"
                  className="seller-agenda-mobile__form-input"
                  required
                />
              </div>
              <div className="seller-agenda-mobile__form-group">
                <label>Descrizione</label>
                <textarea
                  value={eventFormData.description || ''}
                  onChange={(e) => setEventFormField('description', e.target.value)}
                  placeholder="Descrizione (opzionale)"
                  className="seller-agenda-mobile__form-input seller-agenda-mobile__form-textarea"
                  rows={3}
                />
              </div>
              <div className="seller-agenda-mobile__form-datetime">
                <div className="seller-agenda-mobile__form-group seller-agenda-mobile__form-group--full">
                  <label className="seller-agenda-mobile__form-datetime-label">Inizio *</label>
                  <input
                    type="datetime-local"
                    value={eventFormData.start_time}
                    onChange={(e) => setEventFormField('start_time', e.target.value)}
                    className="seller-agenda-mobile__form-input seller-agenda-mobile__form-datetime-input"
                    required
                  />
                </div>
                <div className="seller-agenda-mobile__form-group seller-agenda-mobile__form-group--full">
                  <label className="seller-agenda-mobile__form-datetime-label">Fine * <span className="seller-agenda-mobile__form-datetime-hint">(1 ora dopo l’inizio)</span></label>
                  <input
                    type="datetime-local"
                    value={eventFormData.end_time}
                    onChange={(e) => setEventFormField('end_time', e.target.value)}
                    className="seller-agenda-mobile__form-input seller-agenda-mobile__form-datetime-input"
                    required
                  />
                </div>
              </div>
              {eventFormData.type === 'event' && (
                <div className="seller-agenda-mobile__form-group">
                  <label>Luogo</label>
                  <input
                    type="text"
                    value={eventFormData.location || ''}
                    onChange={(e) => setEventFormField('location', e.target.value)}
                    placeholder="Luogo (opzionale)"
                    className="seller-agenda-mobile__form-input"
                  />
                </div>
              )}
              {eventFormData.type === 'call' && (
                <>
                  <div className="seller-agenda-mobile__form-group">
                    <label>Link call</label>
                    <input
                      type="url"
                      value={eventFormData.call_link || ''}
                      onChange={(e) => setEventFormField('call_link', e.target.value)}
                      placeholder="https://..."
                      className="seller-agenda-mobile__form-input"
                    />
                  </div>
                  <div className="seller-agenda-mobile__form-group">
                    <label>Note call</label>
                    <textarea
                      value={eventFormData.call_notes || ''}
                      onChange={(e) => setEventFormField('call_notes', e.target.value)}
                      placeholder="Note (opzionale)"
                      className="seller-agenda-mobile__form-input seller-agenda-mobile__form-textarea"
                      rows={2}
                    />
                  </div>
                </>
              )}
              {eventFormData.type === 'deadline' && (
                <div className="seller-agenda-mobile__form-group">
                  <label>Tipo scadenza</label>
                  <input
                    type="text"
                    value={eventFormData.deadline_type || ''}
                    onChange={(e) => setEventFormField('deadline_type', e.target.value)}
                    placeholder="Es. Preventivo, Contratto"
                    className="seller-agenda-mobile__form-input"
                  />
                </div>
              )}
            </div>
            <div className="seller-agenda-mobile__event-form-footer">
              <button
                type="button"
                className="seller-agenda-mobile__form-btn seller-agenda-mobile__form-btn--cancel"
                onClick={() => {
                  setShowEventFormSheet(false);
                  if (eventFormMode === 'edit') setSelectedItem(null);
                }}
                disabled={eventFormSaving}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="seller-agenda-mobile__form-btn seller-agenda-mobile__form-btn--submit"
                disabled={eventFormSaving || !eventFormData.title.trim()}
              >
                {eventFormSaving ? 'Salvataggio...' : eventFormMode === 'create' ? 'Crea' : 'Salva'}
              </button>
            </div>
          </form>
          </div>
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
};

export default SellerAgendaMobile;
