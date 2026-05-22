import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Bell, CheckSquare, Calendar as CalendarIcon, Pin, Trash2 } from 'lucide-react';
import { agendaApi } from '../../api/agenda';
import type { AgendaItem, AgendaItemType } from '../../api/agenda';
import AgendaItemModal from '../../components/AgendaItemModal';
import './AgendaDayDetailPage.css';

const AgendaDayDetailPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [modalType, setModalType] = useState<AgendaItemType | null>(null);

  useEffect(() => {
    if (date) {
      loadItems();
    }
  }, [date]);

  const loadItems = async () => {
    if (!date) return;
    
    try {
      setLoading(true);
      const response = await agendaApi.getAll({
        date: date,
        status: 'active',
      });
      setItems(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento elementi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = (type: AgendaItemType) => {
    setModalType(type);
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEditItem = (item: AgendaItem) => {
    setSelectedItem(item);
    setModalType(item.type);
    setShowModal(true);
  };

  const handleItemSaved = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalType(null);
    loadItems();
  };

  const handleDelete = async (item: AgendaItem) => {
    if (window.confirm('Sei sicuro di voler eliminare questo elemento?')) {
      try {
        await agendaApi.delete(item.id);
        loadItems();
      } catch (error) {
        console.error('Errore nell\'eliminazione:', error);
      }
    }
  };

  const handleTogglePin = async (item: AgendaItem) => {
    try {
      await agendaApi.togglePin(item.id);
      loadItems();
    } catch (error) {
      console.error('Errore nel toggle pin:', error);
    }
  };

  const handleComplete = async (item: AgendaItem) => {
    try {
      await agendaApi.complete(item.id);
      loadItems();
    } catch (error) {
      console.error('Errore nel completamento:', error);
    }
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!date) {
    return <div>Data non valida</div>;
  }

  const groupedItems = {
    memo: items.filter(item => item.type === 'memo'),
    reminder: items.filter(item => item.type === 'reminder'),
    checklist: items.filter(item => item.type === 'checklist'),
    event: items.filter(item => item.type === 'event'),
  };

  return (
    <div className="agenda-day-detail-page">
      <div className="agenda-day-header">
        <button className="btn-back" onClick={() => navigate('/segreteria/agenda')}>
          <ArrowLeft size={20} />
          Indietro
        </button>
        <div className="agenda-day-title">
          <h1>{formatDate(date)}</h1>
        </div>
        <div className="agenda-day-actions">
          <button
            className="btn-create btn-create-memo"
            onClick={() => handleCreateItem('memo')}
          >
            <FileText size={16} />
            Memo
          </button>
          <button
            className="btn-create btn-create-reminder"
            onClick={() => handleCreateItem('reminder')}
          >
            <Bell size={16} />
            Promemoria
          </button>
          <button
            className="btn-create btn-create-checklist"
            onClick={() => handleCreateItem('checklist')}
          >
            <CheckSquare size={16} />
            Checklist
          </button>
          <button
            className="btn-create btn-create-event"
            onClick={() => handleCreateItem('event')}
          >
            <CalendarIcon size={16} />
            Evento
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="agenda-day-content">
          {/* Memo */}
          {groupedItems.memo.length > 0 && (
            <div className="agenda-day-section">
              <h2 className="section-title">
                <FileText size={18} />
                Memo ({groupedItems.memo.length})
              </h2>
              <div className="items-grid">
                {groupedItems.memo.map((item) => {
                  const Icon = getIconForType(item.type);
                  return (
                    <div key={item.id} className="agenda-item-card">
                      <div className="item-header">
                        <div className="item-type-icon" style={{ color: item.color || getColorForType(item.type) }}>
                          <Icon size={18} />
                        </div>
                        <div className="item-content">
                          <h3>{item.title || item.content?.substring(0, 50)}</h3>
                          {item.content && item.title && (
                            <p>{item.content}</p>
                          )}
                        </div>
                        {item.is_pinned && <Pin size={16} className="item-pin" />}
                      </div>
                      <div className="item-actions">
                        <button onClick={() => handleTogglePin(item)} title="Appunta">
                          <Pin size={14} />
                        </button>
                        <button onClick={() => handleEditItem(item)} title="Modifica">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(item)} title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Promemoria */}
          {groupedItems.reminder.length > 0 && (
            <div className="agenda-day-section">
              <h2 className="section-title">
                <Bell size={18} />
                Promemoria ({groupedItems.reminder.length})
              </h2>
              <div className="items-grid">
                {groupedItems.reminder.map((item) => {
                  const Icon = getIconForType(item.type);
                  return (
                    <div key={item.id} className="agenda-item-card">
                      <div className="item-header">
                        <div className="item-type-icon" style={{ color: item.color || getColorForType(item.type) }}>
                          <Icon size={18} />
                        </div>
                        <div className="item-content">
                          <h3>{item.title}</h3>
                          {item.time && <p className="item-time">{item.time}</p>}
                        </div>
                        {item.is_pinned && <Pin size={16} className="item-pin" />}
                      </div>
                      <div className="item-actions">
                        <button onClick={() => handleComplete(item)} title="Completa">
                          ✓
                        </button>
                        <button onClick={() => handleTogglePin(item)} title="Appunta">
                          <Pin size={14} />
                        </button>
                        <button onClick={() => handleEditItem(item)} title="Modifica">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(item)} title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checklist */}
          {groupedItems.checklist.length > 0 && (
            <div className="agenda-day-section">
              <h2 className="section-title">
                <CheckSquare size={18} />
                Checklist ({groupedItems.checklist.length})
              </h2>
              <div className="items-grid">
                {groupedItems.checklist.map((item) => {
                  const Icon = getIconForType(item.type);
                  const completed = item.checklist_items?.filter(i => i.completed).length || 0;
                  const total = item.checklist_items?.length || 0;
                  return (
                    <div key={item.id} className="agenda-item-card">
                      <div className="item-header">
                        <div className="item-type-icon" style={{ color: item.color || getColorForType(item.type) }}>
                          <Icon size={18} />
                        </div>
                        <div className="item-content">
                          <h3>{item.title}</h3>
                          <div className="checklist-progress">
                            {completed} / {total} completati
                          </div>
                        </div>
                        {item.is_pinned && <Pin size={16} className="item-pin" />}
                      </div>
                      <div className="item-actions">
                        <button onClick={() => handleComplete(item)} title="Completa">
                          ✓
                        </button>
                        <button onClick={() => handleTogglePin(item)} title="Appunta">
                          <Pin size={14} />
                        </button>
                        <button onClick={() => handleEditItem(item)} title="Modifica">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(item)} title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eventi */}
          {groupedItems.event.length > 0 && (
            <div className="agenda-day-section">
              <h2 className="section-title">
                <CalendarIcon size={18} />
                Eventi ({groupedItems.event.length})
              </h2>
              <div className="items-grid">
                {groupedItems.event.map((item) => {
                  const Icon = getIconForType(item.type);
                  return (
                    <div key={item.id} className="agenda-item-card">
                      <div className="item-header">
                        <div className="item-type-icon" style={{ color: item.color || getColorForType(item.type) }}>
                          <Icon size={18} />
                        </div>
                        <div className="item-content">
                          <h3>{item.title}</h3>
                          {item.time && <p className="item-time">{item.time}</p>}
                          {item.location && <p className="item-location">📍 {item.location}</p>}
                          {item.description && <p className="item-description">{item.description}</p>}
                        </div>
                        {item.is_pinned && <Pin size={16} className="item-pin" />}
                      </div>
                      <div className="item-actions">
                        <button onClick={() => handleComplete(item)} title="Completa">
                          ✓
                        </button>
                        <button onClick={() => handleTogglePin(item)} title="Appunta">
                          <Pin size={14} />
                        </button>
                        <button onClick={() => handleEditItem(item)} title="Modifica">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(item)} title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="empty-state">
              <CalendarIcon size={64} />
              <h3>Nessun elemento per questa data</h3>
              <p>Crea il tuo primo elemento usando i pulsanti in alto</p>
            </div>
          )}
        </div>
      )}

      {showModal && modalType && (
        <AgendaItemModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
            setModalType(null);
          }}
          onSuccess={handleItemSaved}
          item={selectedItem}
          type={modalType}
          defaultDate={date}
        />
      )}
    </div>
  );
};

export default AgendaDayDetailPage;

