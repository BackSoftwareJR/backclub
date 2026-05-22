import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Bell, CheckSquare, Calendar as CalendarIcon, Pin, ChevronLeft, ChevronRight } from 'lucide-react';
import { agendaApi } from '../../api/agenda';
import type { AgendaItem, AgendaItemType } from '../../api/agenda';
import AgendaItemModal from '../../components/AgendaItemModal';
import './AgendaPage.css';

const AgendaPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<AgendaItemType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [modalType, setModalType] = useState<AgendaItemType | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  
  // Drag & Drop states
  const [draggingType, setDraggingType] = useState<AgendaItemType | null>(null);
  const [draggingItem, setDraggingItem] = useState<AgendaItem | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Funzione per formattare date senza problemi di timezone
  const formatDateForComparison = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadItems();
  }, [currentDate, typeFilter, statusFilter]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const params: any = {
        date_from: formatDateForComparison(startDate),
        date_to: formatDateForComparison(endDate),
        include_memos_without_date: true,
      };

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await agendaApi.getAll(params);
      setItems(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    return items.filter(item => {
      // Elementi con data esplicita
      if (item.date) {
        // Normalizza la data per il confronto (rimuove eventuali parti di ora)
        const itemDateStr = item.date.split('T')[0];
        return itemDateStr === dateStr;
      }
      // Memo senza data: usa la data di creazione
      if (item.type === 'memo' && !item.date && item.created_at) {
        const createdDate = new Date(item.created_at);
        const createdDateStr = formatDateForComparison(createdDate);
        return createdDateStr === dateStr;
      }
      return false;
    });
  };

  const handleDayClick = (date: Date, e?: React.MouseEvent) => {
    if (draggingType || draggingItem) return; // Ignora click durante drag
    
    if (e) {
      e.stopPropagation();
    }
    const dateStr = formatDateForComparison(date);
    navigate(`/segreteria/agenda/${dateStr}`);
  };

  const handleCreateItem = (type: AgendaItemType, date?: string) => {
    setModalType(type);
    setSelectedItem(null);
    setDefaultDate(date);
    setShowModal(true);
  };

  const handleEditItem = (item: AgendaItem) => {
    setSelectedItem(item);
    setModalType(item.type);
    setDefaultDate(item.date);
    setShowModal(true);
  };

  const handleItemSaved = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalType(null);
    setDefaultDate(undefined);
    loadItems();
  };

  // Drag & Drop per creare
  const handleButtonMouseDown = (e: React.MouseEvent, type: AgendaItemType) => {
    e.preventDefault();
    setDraggingType(type);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;
      const distance = Math.sqrt(
        Math.pow(moveEvent.clientX - dragStartPos.current.x, 2) + 
        Math.pow(moveEvent.clientY - dragStartPos.current.y, 2)
      );
      if (distance > 10) {
        // Attiva drag solo dopo 10px
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      
      if (dragOverDay !== null && draggingType) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const targetDate = new Date(year, month, dragOverDay);
        const dateStr = formatDateForComparison(targetDate);
        handleCreateItem(draggingType, dateStr);
      } else if (!dragStartPos.current || 
        Math.abs(upEvent.clientX - dragStartPos.current.x) < 10 &&
        Math.abs(upEvent.clientY - dragStartPos.current.y) < 10) {
        // Click normale, non drag
        handleCreateItem(type);
      }

      setDraggingType(null);
      setDragOverDay(null);
      dragStartPos.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Drag & Drop per spostare
  const handleItemDragStart = (e: React.DragEvent, item: AgendaItem) => {
    e.stopPropagation();
    setDraggingItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id.toString());
  };

  const handleItemDragEnd = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (dragOverDay !== null && draggingItem) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const targetDate = new Date(year, month, dragOverDay);
      const dateStr = formatDateForComparison(targetDate);

      try {
        await agendaApi.update(draggingItem.id, { date: dateStr });
        // Ricarica immediatamente
        await loadItems();
      } catch (error) {
        console.error('Errore nello spostamento:', error);
        alert('Errore nello spostamento dell\'elemento');
      }
    }

    setDraggingItem(null);
    setDragOverDay(null);
  };

  const handleDayDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggingType || draggingItem) {
      setDragOverDay(day);
    }
  };

  const handleDayDragLeave = (e: React.DragEvent) => {
    // Solo se usciamo completamente dal giorno
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDay(null);
    }
  };

  const handleDayDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const targetDate = new Date(year, month, day);
    const dateStr = formatDateForComparison(targetDate);

    if (draggingItem) {
      try {
        await agendaApi.update(draggingItem.id, { date: dateStr });
        // Ricarica immediatamente
        await loadItems();
      } catch (error) {
        console.error('Errore nello spostamento:', error);
        alert('Errore nello spostamento dell\'elemento');
      }
    }

    setDraggingItem(null);
    setDragOverDay(null);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    const weekDaysRow = weekDays.map(day => (
      <div key={day} className="agenda-weekday">
        {day}
      </div>
    ));

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="agenda-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayItems = getItemsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isDragOver = dragOverDay === day;

      days.push(
        <div
          key={day}
          className={`agenda-day ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
          onClick={(e) => handleDayClick(date, e)}
          onDragOver={(e) => handleDayDragOver(e, day)}
          onDragLeave={handleDayDragLeave}
          onDrop={(e) => handleDayDrop(e, day)}
        >
          <div className="agenda-day-number">{day}</div>
          <div className="agenda-day-items">
            {dayItems.length > 0 ? (
              <>
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={`agenda-day-item agenda-item-${item.type}`}
                    style={{ backgroundColor: getColorForType(item.type) }}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragEnd={(e) => handleItemDragEnd(e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditItem(item);
                    }}
                    title={item.title || item.content || `${item.type}`}
                  >
                    {item.title || item.content?.substring(0, 20) || `${item.type}`}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="agenda-day-more" title={`${dayItems.length - 3} altri elementi`}>
                    +{dayItems.length - 3}
                  </div>
                )}
              </>
            ) : (
              <div className="agenda-day-empty-hint" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', padding: '4px' }}>
                {isDragOver && (draggingType || draggingItem) && 'Rilascia qui'}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="agenda-calendar-grid">
        {weekDaysRow}
        {days}
      </div>
    );
  };

  const getColorForType = (type: AgendaItemType) => {
    const colors: Record<AgendaItemType, string> = {
      memo: '#8E8E93',
      reminder: '#FF9F0A',
      checklist: '#0A84FF',
      event: '#34C759',
    };
    return colors[type];
  };

  const getIconForType = (type: AgendaItemType) => {
    switch (type) {
      case 'memo':
        return FileText;
      case 'reminder':
        return Bell;
      case 'checklist':
        return CheckSquare;
      case 'event':
        return CalendarIcon;
    }
  };

  const pinnedItems = items.filter(item => item.is_pinned && item.status === 'active');

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="segreteria-agenda-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Agenda</h1>
          <p className="venditori-page-subtitle">Gestisci memo, promemoria, checklist ed eventi</p>
        </div>
        <div className="agenda-header-actions">
          <div className="agenda-quick-create">
            <button
              className="venditori-btn venditori-btn-secondary agenda-drag-btn"
              onMouseDown={(e) => handleButtonMouseDown(e, 'memo')}
              title="Memo - Trascina sul calendario o clicca per creare"
            >
              <FileText size={16} />
              Memo
            </button>
            <button
              className="venditori-btn venditori-btn-secondary agenda-drag-btn"
              onMouseDown={(e) => handleButtonMouseDown(e, 'reminder')}
              title="Promemoria - Trascina sul calendario o clicca per creare"
            >
              <Bell size={16} />
              Promemoria
            </button>
            <button
              className="venditori-btn venditori-btn-secondary agenda-drag-btn"
              onMouseDown={(e) => handleButtonMouseDown(e, 'checklist')}
              title="Checklist - Trascina sul calendario o clicca per creare"
            >
              <CheckSquare size={16} />
              Checklist
            </button>
            <button
              className="venditori-btn venditori-btn-primary agenda-drag-btn"
              onMouseDown={(e) => handleButtonMouseDown(e, 'event')}
              title="Evento - Trascina sul calendario o clicca per creare"
            >
              <CalendarIcon size={16} />
              Evento
            </button>
          </div>
        </div>
      </div>

      <div className="agenda-filters">
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AgendaItemType | 'all')}
        >
          <option value="all">Tutti i tipi</option>
          <option value="memo">Memo</option>
          <option value="reminder">Promemoria</option>
          <option value="checklist">Checklist</option>
          <option value="event">Eventi</option>
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
        >
          <option value="all">Tutti</option>
          <option value="active">Attivi</option>
          <option value="completed">Completati</option>
        </select>
      </div>

      <div className="segreteria-agenda-container">
        <div className="segreteria-agenda-calendar">
          <div className="agenda-calendar-header">
            <button
              className="agenda-nav-btn"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="agenda-calendar-month">
              {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              className="agenda-nav-btn"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {renderCalendar()}
        </div>

        {pinnedItems.length > 0 && (
          <div className="segreteria-agenda-sidebar">
            <div className="agenda-section">
              <h3 className="agenda-section-title">
                <Pin size={16} />
                Appuntati
              </h3>
              <div className="agenda-items-list">
                {pinnedItems.map((item) => {
                  const Icon = getIconForType(item.type);
                  return (
                    <div
                      key={item.id}
                      className="agenda-item-card"
                      onClick={() => handleEditItem(item)}
                    >
                      <div className="agenda-item-header">
                        <div className="agenda-item-type-icon" style={{ color: getColorForType(item.type) }}>
                          <Icon size={16} />
                        </div>
                        <span className="agenda-item-title">{item.title || item.content?.substring(0, 30)}</span>
                      </div>
                      {item.date && (
                        <div className="agenda-item-date">
                          {new Date(item.date).toLocaleDateString('it-IT')}
                          {item.time && ` • ${item.time}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && modalType && (
        <AgendaItemModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
            setModalType(null);
            setDefaultDate(undefined);
          }}
          onSuccess={handleItemSaved}
          item={selectedItem}
          type={modalType}
          defaultDate={defaultDate}
        />
      )}
    </div>
  );
};

export default AgendaPage;
