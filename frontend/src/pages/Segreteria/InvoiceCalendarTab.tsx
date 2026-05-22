import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { invoicesApi } from '../../api/invoices';
import type { CalendarEvent } from '../../api/invoices';
import './InvoiceCalendarTab.css';

const InvoiceCalendarTab: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clientFilter] = useState<number | null>(null);
  const [paymentPlanFilter] = useState<number | null>(null);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, clientFilter, paymentPlanFilter, paymentTypeFilter]);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const params: any = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      };

      if (clientFilter) {
        params.client_id = clientFilter;
      }
      if (paymentPlanFilter) {
        params.payment_plan_id = paymentPlanFilter;
      }
      if (paymentTypeFilter !== 'all') {
        params.payment_type = paymentTypeFilter;
      }

      console.log('Caricamento calendario con params:', params);
      const response = await invoicesApi.getCalendar(params);
      console.log('Eventi calendario ricevuti:', response.data);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento eventi calendario:', error);
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

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    // Normalizza anche la data dell'evento per il confronto
    const matchingEvents = events.filter(event => {
      if (!event.date) return false;
      // Gestisci sia stringhe che oggetti Date
      const eventDateStr = typeof event.date === 'string' 
        ? event.date.split('T')[0] 
        : new Date(event.date).toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
    return matchingEvents;
  };

  const getColorForPaymentType = (paymentType: string, scheduleType?: string, description?: string) => {
    // Riconosci rinnovo anche dalla descrizione
    const isRenewal = paymentType === 'renewal' || 
      (description && description.toLowerCase().includes('rinnovo'));
    
    if (paymentType === 'reimbursement') return '#FF453A'; // Rosso
    if (isRenewal) return '#FF9500'; // Arancione
    if (scheduleType === '30_40_30') return '#34C759'; // Verde
    if (scheduleType === '30_60_days') return '#5856D6'; // Viola
    return '#0A84FF'; // Blu default
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
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

    // Header giorni settimana
    const weekDaysRow = weekDays.map(day => (
      <div key={day} className="calendar-weekday">
        {day}
      </div>
    ));

    // Giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''}`}
        >
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-day-events">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="calendar-event"
                data-context-menu="event"
                style={{
                  borderLeftColor: event.color_code || getColorForPaymentType(event.payment_type, event.payment_schedule_type, event.description),
                  backgroundColor: `${event.color_code || getColorForPaymentType(event.payment_type, event.payment_schedule_type, event.description)}15`,
                }}
                onClick={() => {
                  setSelectedEvent(event);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="calendar-event-amount" title={formatCurrency(event.amount)}>
                  {formatCurrency(event.amount)}
                </div>
                <div className="calendar-event-description" title={event.description || event.client?.company_name || ''}>
                  {event.description || event.client?.company_name || 'Nessuna descrizione'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-grid">
        {weekDaysRow}
        {days}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="invoice-calendar-tab">
      <div className="venditori-content-card">
        {/* Header con filtri */}
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button
              className="calendar-nav-btn"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="calendar-month-title">
              {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              className="calendar-nav-btn"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-filters">
            <select
              className="filter-select"
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
            >
              <option value="all">Tutti i tipi</option>
              <option value="installment">Rate</option>
              <option value="renewal">Rinnovi</option>
              <option value="reimbursement">Rimborsi</option>
              <option value="one_time">Pagamento Unico</option>
            </select>
            {/* TODO: Aggiungere filtri per cliente e piano pagamento */}
          </div>
        </div>

        {/* Calendario */}
        <div className="calendar-container">
          {renderCalendar()}
        </div>

        {/* Legenda colori */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF453A' }}></div>
            <span>Rimborsi</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF9500' }}></div>
            <span>Rinnovi</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#0A84FF' }}></div>
            <span>Rate Servizi</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#34C759' }}></div>
            <span>30/40/30</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#5856D6' }}></div>
            <span>30/60 giorni</span>
          </div>
        </div>
      </div>

      {/* Modal Dettagli Evento */}
      {selectedEvent && (
        <div className="calendar-event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="calendar-event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-event-modal-header">
              <h3 className="calendar-event-modal-title">Dettagli Rata</h3>
              <button 
                className="calendar-event-modal-close"
                onClick={() => setSelectedEvent(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="calendar-event-modal-content">
              <div className="calendar-event-modal-row">
                <span className="calendar-event-modal-label">Cliente:</span>
                <span className="calendar-event-modal-value">
                  {selectedEvent.client?.company_name || 'N/A'}
                </span>
              </div>
              {selectedEvent.project && (
                <div className="calendar-event-modal-row">
                  <span className="calendar-event-modal-label">Progetto:</span>
                  <span className="calendar-event-modal-value">
                    {selectedEvent.project.name || 'N/A'}
                  </span>
                </div>
              )}
              {selectedEvent.contract && (
                <div className="calendar-event-modal-row">
                  <span className="calendar-event-modal-label">Contratto:</span>
                  <span className="calendar-event-modal-value">
                    {selectedEvent.contract.contract_number || 'N/A'}
                  </span>
                </div>
              )}
              <div className="calendar-event-modal-row">
                <span className="calendar-event-modal-label">Data Scadenza:</span>
                <span className="calendar-event-modal-value">
                  {new Date(selectedEvent.date).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="calendar-event-modal-row">
                <span className="calendar-event-modal-label">Importo:</span>
                <span className="calendar-event-modal-value calendar-event-modal-amount">
                  {formatCurrency(selectedEvent.amount)}
                </span>
              </div>
              {selectedEvent.original_amount && selectedEvent.original_amount !== selectedEvent.amount && (
                <div className="calendar-event-modal-row">
                  <span className="calendar-event-modal-label">Importo Originale:</span>
                  <span className="calendar-event-modal-value">
                    {formatCurrency(selectedEvent.original_amount)}
                  </span>
                </div>
              )}
              {selectedEvent.discount_amount && selectedEvent.discount_amount > 0 && (
                <>
                  <div className="calendar-event-modal-row">
                    <span className="calendar-event-modal-label">Sconto:</span>
                    <span className="calendar-event-modal-value calendar-event-modal-discount">
                      -{formatCurrency(selectedEvent.discount_amount)}
                    </span>
                  </div>
                </>
              )}
              {selectedEvent.description && (
                <div className="calendar-event-modal-row">
                  <span className="calendar-event-modal-label">Descrizione:</span>
                  <span className="calendar-event-modal-value">
                    {selectedEvent.description}
                  </span>
                </div>
              )}
              <div className="calendar-event-modal-row">
                <span className="calendar-event-modal-label">Tipo:</span>
                <span className="calendar-event-modal-value">
                  {(() => {
                    // Riconosci rinnovo anche dalla descrizione se il payment_type non è corretto
                    const isRenewal = selectedEvent.payment_type === 'renewal' || 
                      (selectedEvent.description && selectedEvent.description.toLowerCase().includes('rinnovo'));
                    
                    if (isRenewal) return 'Rinnovo';
                    if (selectedEvent.payment_type === 'one_time') return 'Pagamento Unico';
                    if (selectedEvent.payment_type === 'reimbursement') return 'Rimborso';
                    return 'Rata Servizio';
                  })()}
                </span>
              </div>
              <div className="calendar-event-modal-row">
                <span className="calendar-event-modal-label">Stato:</span>
                <span className={`calendar-event-modal-status calendar-event-modal-status-${selectedEvent.status}`}>
                  {selectedEvent.status === 'pending' ? 'In Attesa' :
                   selectedEvent.status === 'invoiced' ? 'Fatturata' :
                   selectedEvent.status === 'paid' ? 'Pagata' :
                   selectedEvent.status === 'overdue' ? 'Scaduta' :
                   'Cancellata'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCalendarTab;

