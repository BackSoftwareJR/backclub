import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Clock, Check, Minus, Plus } from 'lucide-react';
import type { AgendaItem, FocusSessionSlot, CognitiveLoad } from '../../../../types/focus';

interface FocusSpotlightProps {
  activeSlot: FocusSessionSlot | null;
  nextSlot: FocusSessionSlot | null;
  inProgressItem?: AgendaItem | null;
  onComplete: (taskId: number, actualMinutes: number, fatigue: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  onStartNow?: (agendaItemId: string) => void;
}

const FATIGUE_EMOJIS: { value: 1 | 2 | 3 | 4 | 5; label: string; title: string }[] = [
  { value: 1, label: '😴', title: 'Esausto' },
  { value: 2, label: '🥱', title: 'Stanco' },
  { value: 3, label: '😐', title: 'Neutro' },
  { value: 4, label: '😊', title: 'Bene' },
  { value: 5, label: '⚡', title: 'Carico' },
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

function getCognitiveBadgeLabel(load: CognitiveLoad): string {
  const map: Record<CognitiveLoad, string> = {
    deep_work:  'Deep Work',
    creative:   'Creativo',
    repetitive: 'Ripetitivo',
    meetings:   'Meeting',
    admin:      'Admin',
  };
  return map[load] ?? load;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '00:00';
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const FocusSpotlight: React.FC<FocusSpotlightProps> = ({
  activeSlot,
  nextSlot,
  inProgressItem,
  onComplete,
  onStartNow: _onStartNow,
}) => {
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [actualMinutes, setActualMinutes] = useState(30);
  const [fatigue, setFatigue] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Compute remaining seconds from slot times
  const computeRemaining = useCallback(() => {
    if (!activeSlot) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowSec = now.getSeconds();
    const endMin = parseTime(activeSlot.end_time);
    const diff = (endMin - nowMin) * 60 - nowSec;
    return Math.max(diff, 0);
  }, [activeSlot]);

  useEffect(() => {
    if (!activeSlot) {
      setRemainingSeconds(null);
      return;
    }
    setRemainingSeconds(computeRemaining());
    setShowCompleteForm(false);
    setShowSuccess(false);
    setActualMinutes(activeSlot.task?.estimated_minutes ?? activeSlot.duration_minutes);
    setFatigue(null);

    const interval = setInterval(() => {
      setRemainingSeconds(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSlot, computeRemaining]);

  const handleSubmit = async () => {
    if (!activeSlot?.focus_task_id || !fatigue) return;

    try {
      setSubmitting(true);
      await onComplete(activeSlot.focus_task_id, actualMinutes, fatigue);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowCompleteForm(false);
      }, 1400);
    } finally {
      setSubmitting(false);
    }
  };

  const stepDown = () => setActualMinutes(m => Math.max(MIN_MINUTES, m - STEP));
  const stepUp   = () => setActualMinutes(m => Math.min(MAX_MINUTES, m + STEP));

  const cogLoad = activeSlot?.task?.cognitive_load;
  const cardClass = `focus-spotlight__card${cogLoad ? ` focus-spotlight__card--${cogLoad}` : ''}`;

  const progressPct = (() => {
    if (!activeSlot || remainingSeconds === null) return 0;
    const totalSec = activeSlot.duration_minutes * 60;
    const elapsed  = totalSec - remainingSeconds;
    return Math.min(Math.round((elapsed / totalSec) * 100), 100);
  })();

  if (!activeSlot) {
    // Show in-progress task from backlog if any
    if (inProgressItem) {
      const SOURCE_COLORS: Record<string, string> = {
        focus_task:     '#7C3AED',
        crm_task:       '#EA580C',
        workspace_task: '#2563EB',
        calendar_event: '#10B981',
      };
      const SOURCE_LABELS: Record<string, string> = {
        focus_task:     'Focus',
        crm_task:       'CRM',
        workspace_task: 'WS',
        calendar_event: 'Cal',
      };
      const borderColor = SOURCE_COLORS[inProgressItem.source] ?? '#7C3AED';

      return (
        <div className="focus-spotlight">
          <div className="focus-spotlight__header">
            <div className="focus-spotlight__label">In lavorazione adesso ▶</div>
          </div>
          <motion.div
            key={inProgressItem.id}
            className="focus-spotlight__card focus-spotlight__card--in-progress"
            style={{ borderLeftColor: borderColor }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="focus-spotlight__card-body">
              <div className="focus-spotlight__badges">
                <span
                  className="focus-badge"
                  style={{ background: `${borderColor}30`, color: borderColor }}
                >
                  {SOURCE_LABELS[inProgressItem.source]}
                </span>
                {inProgressItem.project_name && (
                  <span className="focus-badge" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                    {inProgressItem.project_name}
                  </span>
                )}
              </div>
              <div className="focus-spotlight__title">{inProgressItem.title}</div>
              {inProgressItem.due_date && (
                <div className="focus-spotlight__desc" style={{ opacity: 0.55 }}>
                  Scadenza: {new Date(inProgressItem.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </div>
              )}
            </div>
          </motion.div>
          {nextSlot && (
            <div className="focus-spotlight__next">
              <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <span className="focus-spotlight__next-label">Prossima slot</span>
              <span className="focus-spotlight__next-title">{nextSlot.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {nextSlot.start_time.substring(0, 5)}
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="focus-spotlight">
        <div className="focus-spotlight__header">
          <div className="focus-spotlight__label">Focus attuale</div>
        </div>
        <motion.div
          className="focus-spotlight__free"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <span className="focus-spotlight__free-icon">🎉</span>
          <div className="focus-spotlight__free-title">Tutto libero!</div>
          <div className="focus-spotlight__free-sub">
            Nessun blocco attivo in questo momento.<br />
            Goditi la pausa o pianifica nuove attività.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="focus-spotlight">
      <div className="focus-spotlight__header">
        <div className="focus-spotlight__label">Focus attuale</div>
      </div>

      <motion.div
        key={activeSlot.id}
        className={cardClass}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        layout
      >
        <div className="focus-spotlight__card-body">
          {/* Badges */}
          <div className="focus-spotlight__badges">
            {cogLoad && (
              <span className={`focus-badge focus-badge--${cogLoad}`}>
                {getCognitiveBadgeLabel(cogLoad)}
              </span>
            )}
            {activeSlot.task?.deadline_type === 'hard' && (
              <span className="focus-badge focus-badge--meetings">
                Scadenza dura
              </span>
            )}
          </div>

          {/* Title */}
          <div className="focus-spotlight__title">{activeSlot.title}</div>

          {/* Description */}
          {activeSlot.task?.description && (
            <div className="focus-spotlight__desc">{activeSlot.task.description}</div>
          )}

          {/* Countdown timer */}
          {remainingSeconds !== null && (
            <div className="focus-spotlight__timer">
              <Clock size={16} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <span className="focus-spotlight__timer-value">
                {formatCountdown(remainingSeconds)}
              </span>
              <span className="focus-spotlight__timer-label">rimanenti</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="focus-progress-wrap">
            <div className="focus-progress-meta">
              <span>{progressPct}% completato</span>
              <span>{activeSlot.duration_minutes} min totali</span>
            </div>
            <div className="focus-progress-track">
              <motion.div
                className={`focus-progress-fill focus-progress-fill--${cogLoad ?? 'task'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Inline complete form */}
          <AnimatePresence mode="wait">
            {showCompleteForm && !showSuccess && (
              <motion.div
                key="complete-form"
                className="focus-complete-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {/* Estimated hint + stepper */}
                <div>
                  <div className="focus-complete-form__hint">
                    ✓ Fatto! Quanto ci hai messo?
                    {activeSlot.task?.estimated_minutes && (
                      <span className="focus-complete-form__estimated">
                        Stimato: {formatMinutes(activeSlot.task.estimated_minutes)}
                      </span>
                    )}
                  </div>
                  <div className="focus-stepper">
                    <button
                      className="focus-stepper__btn"
                      onClick={stepDown}
                      disabled={actualMinutes <= MIN_MINUTES}
                      type="button"
                      aria-label="Riduci"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="focus-stepper__value">{formatMinutes(actualMinutes)}</span>
                    <button
                      className="focus-stepper__btn"
                      onClick={stepUp}
                      disabled={actualMinutes >= MAX_MINUTES}
                      type="button"
                      aria-label="Aumenta"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Fatigue picker */}
                <div>
                  <span className="focus-complete-form__label">Come ti senti?</span>
                  <div className="focus-fatigue-picker">
                    {FATIGUE_EMOJIS.map(({ value, label, title }) => (
                      <button
                        key={value}
                        className={[
                          'focus-fatigue-btn',
                          fatigue === value ? 'focus-fatigue-btn--active' : '',
                          fatigue !== null && fatigue !== value ? 'focus-fatigue-btn--dim' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setFatigue(value)}
                        title={title}
                        type="button"
                      >
                        {label}
                        <span className="focus-fatigue-btn__num">{value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="focus-complete-form__actions">
                  <button
                    className="focus-btn focus-btn--primary"
                    onClick={handleSubmit}
                    disabled={submitting || !fatigue}
                    type="button"
                  >
                    {submitting ? (
                      <span className="focus-spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Conferma e vai avanti
                  </button>
                  <button
                    className="focus-btn focus-btn--outline"
                    onClick={() => setShowCompleteForm(false)}
                    type="button"
                  >
                    Annulla
                  </button>
                </div>
              </motion.div>
            )}

            {showSuccess && (
              <motion.div
                key="success"
                className="focus-success-anim"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <div className="focus-success-anim__icon">
                  <Check size={28} strokeWidth={3} />
                </div>
                <span className="focus-success-anim__label">Ottimo lavoro!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ho Finito CTA */}
        {!showCompleteForm && !showSuccess && activeSlot.focus_task_id && (
          <motion.button
            className="focus-done-btn"
            onClick={() => setShowCompleteForm(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
          >
            <CheckCircle2 size={18} />
            Ho Finito
          </motion.button>
        )}
      </motion.div>

      {/* Next task hint */}
      {nextSlot && (
        <div className="focus-spotlight__next">
          <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <span className="focus-spotlight__next-label">Prossima</span>
          <span className="focus-spotlight__next-title">{nextSlot.title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {nextSlot.start_time.substring(0, 5)}
          </span>
        </div>
      )}
    </div>
  );
};

export default FocusSpotlight;
