import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Save } from 'lucide-react';
import type { CognitiveMoment, UserFocusPreferences } from '../../../../types/focus';

interface FocusPreferencesPanelProps {
  open: boolean;
  initial?: UserFocusPreferences | null;
  onClose: () => void;
  onSave: (data: Partial<UserFocusPreferences>) => Promise<void>;
}

const COGNITIVE_OPTIONS: { value: CognitiveMoment; label: string; icon: string }[] = [
  { value: 'deep_work',   label: 'Deep Work',   icon: '🧠' },
  { value: 'creative',    label: 'Creativo',     icon: '🎨' },
  { value: 'repetitive',  label: 'Ripetitivo',   icon: '🔁' },
  { value: 'meetings',    label: 'Meeting',      icon: '📅' },
  { value: 'admin',       label: 'Admin',        icon: '📋' },
];

const DEFAULTS: UserFocusPreferences = {
  preferred_start_time:           '09:00',
  preferred_end_time:             '18:00',
  max_daily_hours:                8,
  lunch_break_enabled:            true,
  lunch_start_time:               '13:00',
  lunch_duration_minutes:         60,
  preferred_focus_block_duration: 90,
  break_between_focus_blocks:     15,
  working_days:                   [1, 2, 3, 4, 5],
  preferred_cognitive_morning:    'deep_work',
  preferred_cognitive_afternoon:  'repetitive',
  rest_reminder_enabled:          true,
  notes:                          '',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const FocusPreferencesPanel: React.FC<FocusPreferencesPanelProps> = ({
  open,
  initial,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<UserFocusPreferences>(
    initial ? { ...DEFAULTS, ...initial } : { ...DEFAULTS }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (initial) setForm({ ...DEFAULTS, ...initial });
  }, [initial]);

  const set = <K extends keyof UserFocusPreferences>(key: K, value: UserFocusPreferences[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: number) => {
    const days = form.working_days.includes(day)
      ? form.working_days.filter(d => d !== day)
      : [...form.working_days, day].sort();
    set('working_days', days);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="focus-pref-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="focus-pref-panel"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="focus-pref-header">
              <div className="focus-pref-header__left">
                <Settings size={16} />
                <span>Le tue preferenze di lavoro</span>
              </div>
              <button className="focus-pref-close" onClick={onClose} type="button">
                <X size={16} />
              </button>
            </div>

            <div className="focus-pref-body">
              {/* Work hours */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Orario di lavoro</div>
                <div className="focus-pref-row">
                  <label className="focus-pref-label">Inizio</label>
                  <input
                    type="time"
                    className="focus-pref-input focus-pref-input--time"
                    value={form.preferred_start_time}
                    onChange={e => set('preferred_start_time', e.target.value)}
                  />
                  <label className="focus-pref-label">Fine</label>
                  <input
                    type="time"
                    className="focus-pref-input focus-pref-input--time"
                    value={form.preferred_end_time}
                    onChange={e => set('preferred_end_time', e.target.value)}
                  />
                </div>
                <div className="focus-pref-row focus-pref-row--slider">
                  <label className="focus-pref-label">Max ore/giorno: {form.max_daily_hours}h</label>
                  <input
                    type="range"
                    min={1} max={16}
                    value={form.max_daily_hours}
                    onChange={e => set('max_daily_hours', Number(e.target.value))}
                    className="focus-pref-range"
                  />
                </div>
              </section>

              {/* Working days */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Giorni lavorativi</div>
                <div className="focus-pref-days">
                  {DAY_LABELS.map((label, i) => {
                    const day = i + 1;
                    const active = form.working_days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`focus-pref-day${active ? ' focus-pref-day--active' : ''}`}
                        onClick={() => toggleDay(day)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Focus blocks */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Blocchi focus</div>
                <div className="focus-pref-row focus-pref-row--slider">
                  <label className="focus-pref-label">
                    Durata blocco: {form.preferred_focus_block_duration} min
                  </label>
                  <input
                    type="range"
                    min={15} max={240} step={15}
                    value={form.preferred_focus_block_duration}
                    onChange={e => set('preferred_focus_block_duration', Number(e.target.value))}
                    className="focus-pref-range"
                  />
                </div>
                <div className="focus-pref-row focus-pref-row--slider">
                  <label className="focus-pref-label">
                    Pausa tra sessioni: {form.break_between_focus_blocks} min
                  </label>
                  <input
                    type="range"
                    min={5} max={60} step={5}
                    value={form.break_between_focus_blocks}
                    onChange={e => set('break_between_focus_blocks', Number(e.target.value))}
                    className="focus-pref-range"
                  />
                </div>
              </section>

              {/* Lunch */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">
                  <span>Pausa pranzo</span>
                  <label className="focus-pref-toggle">
                    <input
                      type="checkbox"
                      checked={form.lunch_break_enabled}
                      onChange={e => set('lunch_break_enabled', e.target.checked)}
                    />
                    <span className="focus-pref-toggle__slider" />
                  </label>
                </div>
                {form.lunch_break_enabled && (
                  <div className="focus-pref-row">
                    <label className="focus-pref-label">Alle</label>
                    <input
                      type="time"
                      className="focus-pref-input focus-pref-input--time"
                      value={form.lunch_start_time}
                      onChange={e => set('lunch_start_time', e.target.value)}
                    />
                    <label className="focus-pref-label">per {form.lunch_duration_minutes} min</label>
                    <input
                      type="range"
                      min={15} max={120} step={15}
                      value={form.lunch_duration_minutes}
                      onChange={e => set('lunch_duration_minutes', Number(e.target.value))}
                      className="focus-pref-range focus-pref-range--sm"
                    />
                  </div>
                )}
              </section>

              {/* Cognitive preferences */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Preferenza cognitiva mattina</div>
                <div className="focus-pref-cognitive">
                  {COGNITIVE_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      className={`focus-pref-cog-btn${form.preferred_cognitive_morning === o.value ? ' focus-pref-cog-btn--active' : ''}`}
                      onClick={() => set('preferred_cognitive_morning', o.value)}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Preferenza cognitiva pomeriggio</div>
                <div className="focus-pref-cognitive">
                  {COGNITIVE_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      className={`focus-pref-cog-btn${form.preferred_cognitive_afternoon === o.value ? ' focus-pref-cog-btn--active' : ''}`}
                      onClick={() => set('preferred_cognitive_afternoon', o.value)}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section className="focus-pref-section">
                <div className="focus-pref-section__title">Note personali (opzionale)</div>
                <textarea
                  className="focus-pref-textarea"
                  placeholder="Es. lavoro meglio la mattina presto, evito riunioni il venerdì…"
                  value={form.notes ?? ''}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </section>
            </div>

            {/* Footer */}
            <div className="focus-pref-footer">
              <button
                className="focus-btn focus-btn--primary focus-pref-save"
                onClick={handleSave}
                disabled={saving}
                type="button"
              >
                {saved ? '✓ Salvato!' : saving ? 'Salvo…' : (
                  <><Save size={14} /> Salva preferenze</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FocusPreferencesPanel;
