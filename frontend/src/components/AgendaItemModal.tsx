import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Plus, Trash2, FileText, Bell, CheckSquare, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { agendaApi } from '../api/agenda';
import type { AgendaItem, AgendaItemType, ChecklistItem } from '../api/agenda';
import './AgendaItemModal.css';

interface AgendaItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: AgendaItem | null;
  type: AgendaItemType;
  defaultDate?: string;
}

const AgendaItemModal: React.FC<AgendaItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  item,
  type,
  defaultDate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form fields
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || '');
  const [time, setTime] = useState('');
  const [reminderDatetime, setReminderDatetime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [endDatetime, setEndDatetime] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');

  // Funzione helper per normalizzare date per input HTML
  const normalizeDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    // Se contiene 'T' o 'Z', estrai solo la parte data
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    // Se è già nel formato corretto, restituisci così
    return dateStr;
  };

  // Funzione helper per normalizzare datetime per input datetime-local
  const normalizeDatetimeForInput = (datetimeStr: string | undefined): string => {
    if (!datetimeStr) return '';
    // Se contiene 'Z' o ha formato ISO completo, converti
    if (datetimeStr.includes('Z')) {
      const date = new Date(datetimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    // Se è già nel formato corretto, restituisci così
    return datetimeStr;
  };

  useEffect(() => {
    if (item) {
      setContent(item.content || '');
      setTitle(item.title || '');
      setDate(normalizeDateForInput(item.date));
      setTime(item.time || '');
      setReminderDatetime(normalizeDatetimeForInput(item.reminder_datetime));
      setAllDay(item.all_day || false);
      setEndDatetime(normalizeDatetimeForInput(item.end_datetime));
      setChecklistItems(item.checklist_items || []);
      setLocation(item.location || '');
      setDescription(item.description || '');
      setIsPinned(item.is_pinned || false);
      setPriority(item.priority || 0);
      setNotes(item.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setContent('');
      setTitle('');
      setDate(defaultDate ? normalizeDateForInput(defaultDate) : (type !== 'memo' ? today : ''));
      setTime('');
      setReminderDatetime('');
      setAllDay(false);
      setEndDatetime('');
      setChecklistItems(type === 'checklist' ? [{ id: Date.now().toString(), text: '', completed: false }] : []);
      setLocation('');
      setDescription('');
      setIsPinned(false);
      setPriority(0);
      setNotes('');
    }
  }, [item, defaultDate, type]);

  // Salvataggio automatico per checklist
  useEffect(() => {
    if (type === 'checklist' && item && checklistItems.length > 0) {
      // Cancella timeout precedente
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Imposta nuovo timeout per salvataggio automatico
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSavingStatus('saving');
          await agendaApi.update(item.id, {
            checklist_items: checklistItems,
          });
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
        } catch (error) {
          setSavingStatus('error');
          setTimeout(() => setSavingStatus('idle'), 2000);
        }
      }, 1000); // Salva dopo 1 secondo di inattività
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [checklistItems, type, item]);

  const handleDelete = async () => {
    if (!item) return;

    const confirmed = window.confirm(`Sei sicuro di voler eliminare questo ${getTypeLabel().toLowerCase()}?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await agendaApi.delete(item.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante l\'eliminazione');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type !== 'memo' && !date) {
      setError('La data è obbligatoria per questo tipo di elemento');
      return;
    }

    if ((type === 'memo' || type === 'reminder') && !content) {
      setError('Il contenuto è obbligatorio');
      return;
    }

    if (type === 'checklist' && checklistItems.length === 0) {
      setError('Aggiungi almeno un elemento alla checklist');
      return;
    }

    try {
      setLoading(true);
      const data: any = {
        type,
        date: date || undefined,
        time: time || undefined,
        reminder_datetime: reminderDatetime || undefined,
        all_day: allDay,
        end_datetime: endDatetime || undefined,
        location: location || undefined,
        description: description || undefined,
        is_pinned: isPinned,
        priority,
        notes: notes || undefined,
      };

      // Memo e Promemoria: solo contenuto
      if (type === 'memo' || type === 'reminder') {
        data.content = content;
      } else {
        data.title = title || content;
        data.content = content || undefined;
      }

      if (type === 'checklist') {
        data.title = title || 'Checklist';
        data.checklist_items = checklistItems;
      }

      if (item) {
        await agendaApi.update(item.id, data);
      } else {
        await agendaApi.create(data);
      }

      onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: '',
      completed: false,
    };
    setChecklistItems([...checklistItems, newItem]);
  };

  const handleUpdateChecklistItem = (id: string, field: 'text' | 'completed', value: string | boolean) => {
    setChecklistItems(checklistItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const handleChecklistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = checklistItems.findIndex(item => item.id === id);
      if (currentIndex === checklistItems.length - 1) {
        handleAddChecklistItem();
      } else {
        // Focus sul prossimo elemento
        const nextInput = document.querySelector(`input[data-checklist-id="${checklistItems[currentIndex + 1]?.id}"]`) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  };

  const getTypeIcon = () => {
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

  const getTypeLabel = () => {
    switch (type) {
      case 'memo':
        return 'Memo';
      case 'reminder':
        return 'Promemoria';
      case 'checklist':
        return 'Checklist';
      case 'event':
        return 'Evento';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'memo':
        return '#8E8E93';
      case 'reminder':
        return '#FF9F0A';
      case 'checklist':
        return '#0A84FF';
      case 'event':
        return '#34C759';
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="modal-agenda-item"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <TypeIcon size={20} style={{ color: getTypeColor() }} />
            <h2>{item ? `Modifica ${getTypeLabel()}` : `Nuovo ${getTypeLabel()}`}</h2>
            {type === 'checklist' && item && savingStatus !== 'idle' && (
              <div className="save-indicator">
                {savingStatus === 'saving' && <span className="save-dot saving"></span>}
                {savingStatus === 'saved' && <CheckCircle2 size={14} className="save-icon saved" />}
                {savingStatus === 'error' && <span className="save-dot error"></span>}
              </div>
            )}
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Memo e Promemoria: solo contenuto */}
          {(type === 'memo' || type === 'reminder') && (
            <div className="form-group">
              <label>Contenuto *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder={type === 'memo' ? 'Scrivi il tuo memo...' : 'Scrivi il tuo promemoria...'}
                required
                autoFocus
              />
            </div>
          )}

          {/* Checklist: lista aperta */}
          {type === 'checklist' && (
            <div className="form-group">
              <label>Titolo (opzionale)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo checklist..."
              />
              <label style={{ marginTop: '16px' }}>Elementi *</label>
              <div className="checklist-items">
                {checklistItems.map((item, index) => (
                  <div key={item.id} className="checklist-item-row">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleUpdateChecklistItem(item.id, 'completed', e.target.checked)}
                    />
                    <input
                      type="text"
                      data-checklist-id={item.id}
                      value={item.text}
                      onChange={(e) => handleUpdateChecklistItem(item.id, 'text', e.target.value)}
                      onKeyDown={(e) => handleChecklistKeyDown(e, item.id)}
                      placeholder={`Elemento ${index + 1}...`}
                      className="checklist-item-input"
                      autoFocus={index === 0 && !item.text}
                    />
                    <button
                      type="button"
                      className="checklist-item-remove"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="checklist-add-btn"
                  onClick={handleAddChecklistItem}
                >
                  <Plus size={16} />
                  Aggiungi Elemento
                </button>
              </div>
            </div>
          )}

          {/* Evento: form completo */}
          {type === 'event' && (
            <>
              <div className="form-group">
                <label>Titolo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo evento..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrizione</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descrizione evento..."
                />
              </div>
            </>
          )}

          {/* Data (tutti tranne memo) - sempre modificabile */}
          {type !== 'memo' && (
            <div className="form-group">
              <label>Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  // Salvataggio automatico se è una modifica
                  if (item && type !== 'checklist') {
                    const saveData = async () => {
                      try {
                        await agendaApi.update(item.id, { date: e.target.value });
                        onSuccess();
                      } catch (error) {
                        console.error('Errore nel salvataggio data:', error);
                      }
                    };
                    saveData();
                  }
                }}
                required
              />
            </div>
          )}

          {/* Time e All Day (per reminder ed event) */}
          {(type === 'reminder' || type === 'event') && (
            <>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Tutto il giorno</span>
                </label>
              </div>
              {!allDay && (
                <div className="form-group">
                  <label>Ora</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* Reminder Datetime (per reminder) */}
          {type === 'reminder' && (
            <div className="form-group">
              <label>Data/Ora Promemoria</label>
              <input
                type="datetime-local"
                value={reminderDatetime}
                onChange={(e) => setReminderDatetime(e.target.value)}
              />
            </div>
          )}

          {/* End Datetime (per event) */}
          {type === 'event' && (
            <div className="form-group">
              <label>Data/Ora Fine</label>
              <input
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
              />
            </div>
          )}

          {/* Location (per event) */}
          {type === 'event' && (
            <div className="form-group">
              <label>Luogo</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Dove si svolge l'evento?"
              />
            </div>
          )}

          {/* Opzioni comuni */}
          <div className="form-section">
            <h3 className="form-section-title">Opzioni</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>Appunta in alto</span>
              </label>
            </div>
            <div className="form-group">
              <label>Priorità</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              >
                <option value={0}>Normale</option>
                <option value={1}>Alta</option>
                <option value={2}>Urgente</option>
              </select>
            </div>
            {type === 'event' && (
              <div className="form-group">
                <label>Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Note aggiuntive..."
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            {item && (
              <button 
                type="button" 
                className="btn-delete" 
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 size={16} />
                Elimina
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            {type !== 'checklist' || !item ? (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvataggio...' : item ? 'Salva Modifiche' : 'Crea'}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onClose}>
                Chiudi
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgendaItemModal;
