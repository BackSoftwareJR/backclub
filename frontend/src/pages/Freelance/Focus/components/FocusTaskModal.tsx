import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Minus, Plus, CalendarDays, Tag, Clock, ArrowRight,
  CheckCircle2, Trash2, AlertCircle,
} from 'lucide-react';
import type { CognitiveLoad, DeadlineType, FocusTask, FocusTaskStatus } from '../../../../types/focus';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FocusTaskModalProps {
  open:      boolean;
  onClose:   () => void;
  onSubmit:  (data: Partial<FocusTask>) => Promise<void>;
  task?:     FocusTask; // If provided → edit mode
  onUpdate?: (id: number, data: Partial<FocusTask>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

interface CognitiveOption { value: CognitiveLoad; emoji: string; label: string; }
interface DeadlineOption  { value: DeadlineType;  label: string; }
interface StatusOption    { value: FocusTaskStatus; label: string; color: string; }

const COGNITIVE_OPTIONS: CognitiveOption[] = [
  { value: 'deep_work',  emoji: '🧠', label: 'Deep Work'  },
  { value: 'creative',   emoji: '🎨', label: 'Creativo'   },
  { value: 'repetitive', emoji: '🔁', label: 'Ripetitivo' },
  { value: 'meetings',   emoji: '📅', label: 'Meeting'    },
  { value: 'admin',      emoji: '📋', label: 'Admin'      },
];

const DEADLINE_OPTIONS: DeadlineOption[] = [
  { value: 'hard', label: 'Hard'    },
  { value: 'soft', label: 'Soft'    },
  { value: 'none', label: 'Nessuna' },
];

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending',     label: 'Da fare',      color: '#6b7280' },
  { value: 'in_progress', label: 'In corso',     color: '#7C3AED' },
  { value: 'completed',   label: 'Completata',   color: '#22c55e' },
  { value: 'skipped',     label: 'Saltata',      color: '#f59e0b' },
];

const PRIORITY_OPTIONS = [
  { value: 'high'   as const, label: 'Alta',  color: '#ef4444' },
  { value: 'medium' as const, label: 'Media', color: '#f59e0b' },
  { value: 'low'    as const, label: 'Bassa', color: '#22c55e' },
];

const STEP = 15;
const MIN_MINUTES = 15;
const MAX_MINUTES = 480;

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

const FocusTaskModal: React.FC<FocusTaskModalProps> = ({
  open, onClose, onSubmit, task, onUpdate, onDelete,
}) => {
  const isEditMode = !!task;

  // Form state
  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [cognitiveLoad,   setCognitiveLoad]   = useState<CognitiveLoad | null>(null);
  const [estimatedMinutes, setEstimated]      = useState(60);
  const [deadlineType,    setDeadlineType]    = useState<DeadlineType>('none');
  const [dueDate,         setDueDate]         = useState('');
  const [weekPlanDate,    setWeekPlanDate]    = useState('');
  const [priority,        setPriority]        = useState<'high'|'medium'|'low'>('medium');
  const [status,          setStatus]          = useState<FocusTaskStatus>('pending');
  const [tags,            setTags]            = useState<string[]>([]);
  const [newTag,          setNewTag]          = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [errors,          setErrors]          = useState<{ title?: string; cognitive?: string }>({});

  const tagInputRef = useRef<HTMLInputElement>(null);

  // ── Reset/populate form ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title ?? '');
      setDescription(task.description ?? '');
      setCognitiveLoad(task.cognitive_load ?? null);
      setEstimated(task.estimated_minutes ?? 60);
      setDeadlineType(task.deadline_type ?? 'none');
      setDueDate(task.due_date ?? '');
      setWeekPlanDate(task.week_plan_date ?? '');
      setPriority(task.priority ?? (task.priority_score >= 80 ? 'high' : task.priority_score >= 40 ? 'medium' : 'low'));
      setStatus(task.status ?? 'pending');
      setTags(task.tags ?? []);
    } else {
      setTitle('');
      setDescription('');
      setCognitiveLoad(null);
      setEstimated(60);
      setDeadlineType('none');
      setDueDate('');
      setWeekPlanDate('');
      setPriority('medium');
      setStatus('pending');
      setTags([]);
    }
    setNewTag('');
    setErrors({});
  }, [open, task]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: { title?: string; cognitive?: string } = {};
    if (!title.trim())    errs.title    = 'Il titolo è obbligatorio.';
    if (!cognitiveLoad)   errs.cognitive = 'Seleziona un tipo di lavoro.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, cognitiveLoad]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    const data: Partial<FocusTask> = {
      title:              title.trim(),
      description:        description.trim() || undefined,
      cognitive_load:     cognitiveLoad as CognitiveLoad,
      estimated_minutes:  estimatedMinutes,
      deadline_type:      deadlineType,
      due_date:           dueDate || undefined,
      week_plan_date:     weekPlanDate || undefined,
      priority:           priority,
      status,
      tags:               tags.length > 0 ? tags : undefined,
    };
    try {
      setSubmitting(true);
      if (isEditMode && onUpdate && task) {
        await onUpdate(task.id, data);
      } else {
        await onSubmit(data);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick actions ───────────────────────────────────────────────────────────

  const handleMoveToTomorrow = async () => {
    if (!task || !onUpdate) return;
    try {
      setSubmitting(true);
      await onUpdate(task.id, { due_date: tomorrowIso() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!task || !onUpdate) return;
    try {
      setSubmitting(true);
      await onUpdate(task.id, { status: 'completed' });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFromToday = async () => {
    if (!task || !onUpdate) return;
    try {
      setSubmitting(true);
      await onUpdate(task.id, { week_plan_date: undefined });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!window.confirm(`Eliminare definitivamente "${task.title}"?`)) return;
    try {
      setDeleting(true);
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  // ── Tags ────────────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setNewTag('');
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const stepDown = () => setEstimated(m => Math.max(MIN_MINUTES, m - STEP));
  const stepUp   = () => setEstimated(m => Math.min(MAX_MINUTES, m + STEP));

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="focus-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="focus-modal focus-modal--wide"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="focus-modal-title"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="focus-modal__header">
              <span id="focus-modal-title" className="focus-modal__title">
                {isEditMode ? 'Dettaglio task' : 'Nuova task'}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isEditMode && onDelete && (
                  <button
                    className="focus-modal__close"
                    onClick={handleDelete}
                    type="button"
                    aria-label="Elimina task"
                    title="Elimina task"
                    disabled={deleting}
                    style={{ color: deleting ? undefined : 'rgba(239,68,68,0.7)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  className="focus-modal__close"
                  onClick={onClose}
                  type="button"
                  aria-label="Chiudi"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="focus-modal__body">

              {/* Titolo */}
              <div className="focus-modal__field">
                <label className="focus-modal__label" htmlFor="task-title">Titolo</label>
                <input
                  id="task-title"
                  className={`focus-modal__input${errors.title ? ' focus-modal__input--error' : ''}`}
                  type="text"
                  placeholder="Es. Scrivere proposta cliente…"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors(p => ({ ...p, title: undefined }));
                  }}
                  autoFocus={!isEditMode}
                  maxLength={255}
                />
                {errors.title && <span className="focus-modal__error">{errors.title}</span>}
              </div>

              {/* Descrizione */}
              <div className="focus-modal__field">
                <label className="focus-modal__label" htmlFor="task-desc">Descrizione</label>
                <textarea
                  id="task-desc"
                  className="focus-modal__input"
                  style={{ minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                  placeholder="Dettagli, contesto, note…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Two-col row: Tipo lavoro + Priorità */}
              <div className="focus-modal__row-2">
                <div className="focus-modal__field">
                  <label className="focus-modal__label">
                    Tipo di lavoro
                    {errors.cognitive && (
                      <span className="focus-modal__error focus-modal__error--inline">{errors.cognitive}</span>
                    )}
                  </label>
                  <div className="focus-load-chips focus-load-chips--sm">
                    {COGNITIVE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={[
                          'focus-load-chip',
                          `focus-load-chip--${opt.value}`,
                          cognitiveLoad === opt.value ? 'focus-load-chip--active' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          setCognitiveLoad(opt.value);
                          if (errors.cognitive) setErrors(p => ({ ...p, cognitive: undefined }));
                        }}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="focus-modal__field">
                  <label className="focus-modal__label">Priorità</label>
                  <div className="ftm-priority-row">
                    {PRIORITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`ftm-priority-btn${priority === opt.value ? ' ftm-priority-btn--active' : ''}`}
                        style={priority === opt.value ? { borderColor: opt.color, color: opt.color } : undefined}
                        onClick={() => setPriority(opt.value)}
                      >
                        <span
                          className="ftm-priority-dot"
                          style={{ background: opt.color }}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stima tempo */}
              <div className="focus-modal__field">
                <label className="focus-modal__label">
                  <Clock size={11} /> Stima di tempo
                </label>
                <div className="focus-stepper focus-stepper--modal">
                  <button
                    className="focus-stepper__btn"
                    onClick={stepDown}
                    disabled={estimatedMinutes <= MIN_MINUTES}
                    type="button"
                    aria-label="Riduci"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="focus-stepper__value">{formatMinutes(estimatedMinutes)}</span>
                  <button
                    className="focus-stepper__btn"
                    onClick={stepUp}
                    disabled={estimatedMinutes >= MAX_MINUTES}
                    type="button"
                    aria-label="Aumenta"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Stato (edit mode only) */}
              {isEditMode && (
                <div className="focus-modal__field">
                  <label className="focus-modal__label">Stato</label>
                  <div className="ftm-status-row">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`ftm-status-btn${status === opt.value ? ' ftm-status-btn--active' : ''}`}
                        style={status === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}18` } : undefined}
                        onClick={() => setStatus(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scadenza + Data settimana */}
              <div className="focus-modal__row-2">
                <div className="focus-modal__field">
                  <label className="focus-modal__label">Scadenza</label>
                  <div className="focus-deadline-radios">
                    {DEADLINE_OPTIONS.map(opt => (
                      <label key={opt.value} className="focus-deadline-radio">
                        <input
                          type="radio"
                          name="deadline_type"
                          value={opt.value}
                          checked={deadlineType === opt.value}
                          onChange={() => setDeadlineType(opt.value)}
                        />
                        <span className={`focus-deadline-radio__label${deadlineType === opt.value ? ' focus-deadline-radio__label--active' : ''}`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {deadlineType !== 'none' && (
                    <div className="focus-modal__date-row">
                      <CalendarDays size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                      <input
                        className="focus-modal__input focus-modal__input--date"
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="focus-modal__field">
                  <label className="focus-modal__label">
                    <CalendarDays size={11} /> Pianificata il
                  </label>
                  <input
                    className="focus-modal__input focus-modal__input--date"
                    type="date"
                    value={weekPlanDate}
                    onChange={e => setWeekPlanDate(e.target.value)}
                    placeholder="Giorno nella settimana"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="focus-modal__field">
                <label className="focus-modal__label">
                  <Tag size={11} /> Tag
                </label>
                <div className="ftm-tags-wrap">
                  {tags.map(tag => (
                    <span key={tag} className="ftm-tag">
                      {tag}
                      <button
                        type="button"
                        className="ftm-tag__remove"
                        onClick={() => removeTag(tag)}
                        aria-label={`Rimuovi tag ${tag}`}
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    className="ftm-tag-input"
                    placeholder="+ tag"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Metadata (edit mode) */}
              {isEditMode && (task?.created_at || task?.updated_at) && (
                <div className="ftm-metadata">
                  {task.created_at && (
                    <span>Creata: {formatDateTime(task.created_at)}</span>
                  )}
                  {task.updated_at && (
                    <span>Aggiornata: {formatDateTime(task.updated_at)}</span>
                  )}
                </div>
              )}

              {/* Quick actions (edit mode) */}
              {isEditMode && (
                <div className="ftm-quick-actions">
                  <span className="ftm-quick-actions__label">Azioni rapide</span>
                  <div className="ftm-quick-actions__row">
                    <button
                      type="button"
                      className="ftm-quick-btn ftm-quick-btn--complete"
                      onClick={handleMarkComplete}
                      disabled={submitting || task?.status === 'completed'}
                    >
                      <CheckCircle2 size={13} />
                      Segna completata
                    </button>
                    <button
                      type="button"
                      className="ftm-quick-btn"
                      onClick={handleMoveToTomorrow}
                      disabled={submitting}
                    >
                      <ArrowRight size={13} />
                      Sposta a domani
                    </button>
                    {task?.week_plan_date && (
                      <button
                        type="button"
                        className="ftm-quick-btn ftm-quick-btn--remove"
                        onClick={handleRemoveFromToday}
                        disabled={submitting}
                      >
                        <AlertCircle size={13} />
                        Rimuovi da oggi
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="focus-modal__footer">
              <button
                className="focus-btn focus-btn--outline"
                onClick={onClose}
                type="button"
                disabled={submitting || deleting}
              >
                {isEditMode ? 'Chiudi' : 'Annulla'}
              </button>
              <button
                className="focus-btn focus-btn--primary"
                onClick={handleSubmit}
                type="button"
                disabled={submitting || deleting}
              >
                {submitting && (
                  <span className="focus-spinner" style={{ width: 14, height: 14 }} />
                )}
                {isEditMode ? 'Salva modifiche' : 'Aggiungi Task →'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FocusTaskModal;
