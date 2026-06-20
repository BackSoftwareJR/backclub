import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, AlertCircle, FolderOpen,
  Clock3, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { focusApi } from '../../../../api/focus';
import type {
  CheckinBriefing,
  CheckinBriefingItem,
  CheckinBriefingProject,
  CheckinPayload,
  DailyCheckin,
} from '../../../../types/focus';
import './FocusDailyCheckin.css';

export interface FocusDailyCheckinProps {
  onComplete: (checkin: DailyCheckin) => void;
  onSkip: () => void;
  existingCheckin: DailyCheckin | null;
}

const ENERGY_OPTIONS = [
  { value: 1 as const, emoji: '😴', label: 'Esausto' },
  { value: 2 as const, emoji: '😕', label: 'Stanco' },
  { value: 3 as const, emoji: '😐', label: 'Regolare' },
  { value: 4 as const, emoji: '😊', label: 'Bene' },
  { value: 5 as const, emoji: '💪', label: 'In forma' },
];

const HOUR_PRESETS = [2, 4, 6, 8];
const STEP_LABELS = ['Energia', 'Resoconto', 'Tempo'];
const TOTAL_STEPS = 3;

const REASON_COLORS: Record<string, string> = {
  overdue:  '#ef4444',
  today:    '#f59e0b',
  project:  '#7C3AED',
  priority: '#60a5fa',
};

const PROJECTS_PREVIEW = 5;
const PRIORITY_PREVIEW = 5;

function truncateText(text: string, max = 48): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function PriorityRow({ item }: { item: CheckinBriefingItem }) {
  return (
    <div className="fdci-priority-item">
      <span
        className="fdci-priority-badge"
        style={{
          color: REASON_COLORS[item.reason_type] ?? '#a78bfa',
          borderColor: `${REASON_COLORS[item.reason_type] ?? '#a78bfa'}44`,
          background: `${REASON_COLORS[item.reason_type] ?? '#a78bfa'}18`,
        }}
      >
        {item.reason}
      </span>
      <div className="fdci-priority-body">
        <span className="fdci-priority-title" title={item.title}>
          {truncateText(item.title, 72)}
        </span>
        {item.project_name && (
          <span className="fdci-priority-project" title={item.project_name}>
            {truncateText(item.project_name, 52)}
          </span>
        )}
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: CheckinBriefingProject }) {
  return (
    <div className="fdci-project-row">
      <span className="fdci-project-row-icon"><FolderOpen size={12} /></span>
      <div className="fdci-project-row-body">
        <span className="fdci-project-row-name" title={project.name}>
          {truncateText(project.name, 56)}
        </span>
        {project.top_tasks[0] && (
          <span className="fdci-project-row-task" title={project.top_tasks[0]}>
            → {truncateText(project.top_tasks[0], 44)}
          </span>
        )}
      </div>
      <div className="fdci-project-row-meta">
        {project.overdue_count > 0 && (
          <span className="fdci-project-row-overdue">
            <AlertTriangle size={10} />
            {project.overdue_count}
          </span>
        )}
        <span className="fdci-project-row-count">{project.tasks_count}</span>
      </div>
    </div>
  );
}

const FocusDailyCheckin: React.FC<FocusDailyCheckinProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [energyLevel, setEnergyLevel] = useState<1|2|3|4|5>(3);
  const [availableHours, setAvailableHours] = useState(6);
  const [briefing, setBriefing] = useState<CheckinBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState(false);
  const [startChoice, setStartChoice] = useState<string>('flexible');
  const [otherPriorities, setOtherPriorities] = useState('');
  const [freeNote, setFreeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllPriorities, setShowAllPriorities] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [prioritiesExpanded, setPrioritiesExpanded] = useState(true);

  const sortedProjects = useMemo(
    () => [...(briefing?.projects ?? [])].sort(
      (a, b) => b.overdue_count - a.overdue_count || b.tasks_count - a.tasks_count,
    ),
    [briefing?.projects],
  );

  const priorityGroups = useMemo(() => {
    const items = briefing?.priority_items ?? [];
    return {
      overdue: items.filter(i => i.reason_type === 'overdue'),
      today:   items.filter(i => i.reason_type === 'today'),
      other:   items.filter(i => !['overdue', 'today'].includes(i.reason_type)),
    };
  }, [briefing?.priority_items]);

  const flatPriorities = useMemo(
    () => [...priorityGroups.overdue, ...priorityGroups.today, ...priorityGroups.other],
    [priorityGroups],
  );

  const visiblePriorities = showAllPriorities
    ? flatPriorities
    : flatPriorities.slice(0, PRIORITY_PREVIEW);

  const visibleProjects = showAllProjects
    ? sortedProjects
    : sortedProjects.slice(0, PROJECTS_PREVIEW);

  const hiddenProjectsCount = Math.max(0, sortedProjects.length - PROJECTS_PREVIEW);
  const hiddenPrioritiesCount = Math.max(0, flatPriorities.length - PRIORITY_PREVIEW);

  // Load briefing once on mount
  useEffect(() => {
    let cancelled = false;
    setBriefingLoading(true);
    setBriefingError(false);

    focusApi.getCheckinBriefing()
      .then(data => {
        if (cancelled) return;
        setBriefing(data);
        setAvailableHours(data.default_hours || 6);
        if (data.start_options.length > 0) {
          setStartChoice(data.start_options[0].id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBriefingError(true);
      })
      .finally(() => {
        if (!cancelled) setBriefingLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const selectedProjectIds = (briefing?.projects ?? [])
    .map(p => p.id)
    .filter((id): id is number => id != null);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  }, []);

  const buildSpecialPriority = (): string | null => {
    const parts: string[] = [];
    const startLabel = briefing?.start_options.find(o => o.id === startChoice)?.label;
    if (startLabel) parts.push(`Partenza: ${startLabel}`);
    if (otherPriorities.trim()) parts.push(otherPriorities.trim());
    return parts.length > 0 ? parts.join('\n') : null;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload: CheckinPayload = {
        energy_level: energyLevel,
        available_hours: availableHours,
        selected_project_ids: selectedProjectIds,
        fixed_events: [],
        special_priority: buildSpecialPriority(),
        free_note: freeNote.trim() || null,
      };
      const checkin = await focusApi.storeCheckin(payload);
      onComplete(checkin);
    } catch {
      const mockCheckin: DailyCheckin = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        energy_level: energyLevel,
        available_hours: availableHours,
        selected_project_ids: selectedProjectIds,
        fixed_events: [],
        special_priority: buildSpecialPriority(),
        free_note: freeNote.trim() || null,
      };
      onComplete(mockCheckin);
    } finally {
      setSubmitting(false);
    }
  };

  const variants = {
    enter:  (dir: number) => ({ x: dir * 36, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: -dir * 36, opacity: 0 }),
  };

  const isSummary = step === TOTAL_STEPS;

  return (
    <div className="fdci-overlay" role="dialog" aria-modal="true" aria-label="Check-in giornaliero">
      <motion.div
        className="fdci-modal fdci-modal--wide"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ duration: 0.26, ease: 'easeOut' }}
      >
        <button className="fdci-close" onClick={onSkip} type="button" aria-label="Salta check-in">
          <X size={16} />
        </button>

        <div className="fdci-stepper">
          {!isSummary ? (
            STEP_LABELS.map((label, idx) => (
              <div
                key={label}
                className={[
                  'fdci-dot',
                  idx === step ? 'fdci-dot--active' : '',
                  idx < step ? 'fdci-dot--done' : '',
                ].filter(Boolean).join(' ')}
                title={label}
              >
                {idx < step ? '✓' : idx + 1}
              </div>
            ))
          ) : (
            <span className="fdci-summary-header-label">Riepilogo giornata</span>
          )}
        </div>

        <div className="fdci-content">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fdci-step"
            >
              {step === 0 && (
                <div className="fdci-step-wrap">
                  <h2 className="fdci-step-title">Come ti senti oggi?</h2>
                  <p className="fdci-step-sub">Il tuo livello di energia ci aiuta ad adattare la giornata.</p>
                  <div className="fdci-energy-row">
                    {ENERGY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`fdci-energy-btn${energyLevel === opt.value ? ' fdci-energy-btn--active' : ''}`}
                        onClick={() => setEnergyLevel(opt.value)}
                      >
                        <span className="fdci-energy-emoji">{opt.emoji}</span>
                        <span className="fdci-energy-num">{opt.value}</span>
                        <span className="fdci-energy-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="fdci-step-wrap fdci-briefing">
                  <h2 className="fdci-step-title">
                    {briefing?.greeting ?? 'Buongiorno'}! Ecco il resoconto
                  </h2>

                  {briefingLoading && (
                    <div className="fdci-briefing-loading">
                      <div className="fdci-spinner" />
                      <p>Analizzo task, progetti e scadenze…</p>
                    </div>
                  )}

                  {!briefingLoading && briefingError && (
                    <div className="fdci-briefing-error">
                      <AlertCircle size={16} />
                      <p>Non riesco a caricare il resoconto. Puoi continuare comunque.</p>
                    </div>
                  )}

                  {!briefingLoading && briefing && (
                    <div className="fdci-briefing-scroll">
                      <p className="fdci-briefing-intro">{briefing.intro}</p>

                      {briefing.stats.open_tasks > 0 && (
                        <div className="fdci-stats-row">
                          {briefing.stats.overdue_tasks > 0 && (
                            <span className="fdci-stat fdci-stat--danger">
                              {briefing.stats.overdue_tasks} in ritardo
                            </span>
                          )}
                          {briefing.stats.today_tasks > 0 && (
                            <span className="fdci-stat fdci-stat--warn">
                              {briefing.stats.today_tasks} oggi
                            </span>
                          )}
                          <span className="fdci-stat">{briefing.stats.open_tasks} aperte</span>
                          {briefing.stats.projects_count > 0 && (
                            <span className="fdci-stat">
                              {briefing.stats.projects_count} progetti
                            </span>
                          )}
                          {briefing.stats.total_estimated_hours > 0 && (
                            <span className="fdci-stat">~{briefing.stats.total_estimated_hours}h</span>
                          )}
                        </div>
                      )}

                      {flatPriorities.length > 0 && (
                        <section className="fdci-section">
                          <button
                            type="button"
                            className="fdci-section-header"
                            onClick={() => setPrioritiesExpanded(v => !v)}
                          >
                            <span className="fdci-section-title">
                              Priorità ({flatPriorities.length})
                            </span>
                            <ChevronDown
                              size={14}
                              className={`fdci-section-chevron${prioritiesExpanded ? ' fdci-section-chevron--open' : ''}`}
                            />
                          </button>
                          {prioritiesExpanded && (
                            <div className="fdci-priority-list">
                              {priorityGroups.overdue.length > 0 && (
                                <div className="fdci-priority-group">
                                  <span className="fdci-priority-group-label fdci-priority-group-label--danger">
                                    In ritardo
                                  </span>
                                  {(showAllPriorities
                                    ? priorityGroups.overdue
                                    : priorityGroups.overdue.slice(0, 3)
                                  ).map(item => (
                                    <PriorityRow key={item.id} item={item} />
                                  ))}
                                </div>
                              )}
                              {priorityGroups.today.length > 0 && (
                                <div className="fdci-priority-group">
                                  <span className="fdci-priority-group-label fdci-priority-group-label--warn">
                                    Scadenza oggi
                                  </span>
                                  {(showAllPriorities
                                    ? priorityGroups.today
                                    : priorityGroups.today.slice(0, 2)
                                  ).map(item => (
                                    <PriorityRow key={item.id} item={item} />
                                  ))}
                                </div>
                              )}
                              {visiblePriorities
                                .filter(i => i.reason_type !== 'overdue' && i.reason_type !== 'today')
                                .map(item => (
                                  <PriorityRow key={item.id} item={item} />
                                ))}
                              {hiddenPrioritiesCount > 0 && !showAllPriorities && (
                                <button
                                  type="button"
                                  className="fdci-expand-btn"
                                  onClick={() => setShowAllPriorities(true)}
                                >
                                  Mostra altre {hiddenPrioritiesCount} priorità
                                </button>
                              )}
                            </div>
                          )}
                        </section>
                      )}

                      {sortedProjects.length > 0 && (
                        <section className="fdci-section">
                          <button
                            type="button"
                            className="fdci-section-header"
                            onClick={() => setProjectsExpanded(v => !v)}
                          >
                            <span className="fdci-section-title">
                              Progetti attivi ({sortedProjects.length})
                            </span>
                            <ChevronDown
                              size={14}
                              className={`fdci-section-chevron${projectsExpanded ? ' fdci-section-chevron--open' : ''}`}
                            />
                          </button>
                          {projectsExpanded && (
                            <div className="fdci-project-list">
                              {visibleProjects.map(p => (
                                <ProjectRow key={p.id} project={p} />
                              ))}
                              {hiddenProjectsCount > 0 && !showAllProjects && (
                                <button
                                  type="button"
                                  className="fdci-expand-btn"
                                  onClick={() => setShowAllProjects(true)}
                                >
                                  Mostra altri {hiddenProjectsCount} progetti
                                </button>
                              )}
                              {showAllProjects && sortedProjects.length > PROJECTS_PREVIEW && (
                                <button
                                  type="button"
                                  className="fdci-expand-btn fdci-expand-btn--muted"
                                  onClick={() => setShowAllProjects(false)}
                                >
                                  Mostra meno
                                </button>
                              )}
                            </div>
                          )}
                        </section>
                      )}

                      <div className="fdci-question-block">
                        <h3 className="fdci-question-title">Da cosa vuoi partire?</h3>
                        <div className="fdci-start-options">
                          {briefing.start_options.map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              className={`fdci-start-option${startChoice === opt.id ? ' fdci-start-option--active' : ''}`}
                              onClick={() => setStartChoice(opt.id)}
                            >
                              {truncateText(opt.label, 80)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="fdci-question-block">
                        <h3 className="fdci-question-title">Hai altre priorità oggi?</h3>
                        <textarea
                          className="fdci-textarea fdci-textarea--compact"
                          placeholder="Es. Devo finire la call con il cliente prima delle 15…"
                          value={otherPriorities}
                          onChange={e => setOtherPriorities(e.target.value)}
                          rows={2}
                          maxLength={400}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="fdci-step-wrap">
                  <h2 className="fdci-step-title">Quante ore hai disponibili?</h2>
                  <p className="fdci-step-sub">
                    {briefing?.stats.total_estimated_hours
                      ? `Hai ~${briefing.stats.total_estimated_hours}h di lavoro stimato nel backlog.`
                      : 'Escludi pause e impegni fissi già in agenda.'}
                  </p>
                  <div className="fdci-hours-display">{availableHours}h</div>
                  <input
                    type="range"
                    className="fdci-range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={availableHours}
                    onChange={e => setAvailableHours(parseFloat(e.target.value))}
                    aria-label="Ore disponibili"
                  />
                  <div className="fdci-range-labels">
                    <span>1h</span>
                    <span>12h</span>
                  </div>
                  <div className="fdci-presets">
                    {HOUR_PRESETS.map(h => (
                      <button
                        key={h}
                        type="button"
                        className={`fdci-preset-btn${availableHours === h ? ' fdci-preset-btn--active' : ''}`}
                        onClick={() => setAvailableHours(h)}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="fdci-textarea fdci-textarea--compact"
                    placeholder="Nota libera (opzionale)…"
                    value={freeNote}
                    onChange={e => setFreeNote(e.target.value)}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="fdci-step-wrap fdci-summary">
                  <div className="fdci-summary-grid">
                    <div className="fdci-summary-card">
                      <span className="fdci-summary-icon">
                        {ENERGY_OPTIONS.find(e => e.value === energyLevel)?.emoji}
                      </span>
                      <span className="fdci-summary-val">
                        {ENERGY_OPTIONS.find(e => e.value === energyLevel)?.label}
                      </span>
                      <span className="fdci-summary-key">Energia</span>
                    </div>
                    <div className="fdci-summary-card">
                      <span className="fdci-summary-icon"><Clock3 size={18} /></span>
                      <span className="fdci-summary-val">{availableHours}h</span>
                      <span className="fdci-summary-key">Disponibili</span>
                    </div>
                    <div className="fdci-summary-card">
                      <span className="fdci-summary-icon">📋</span>
                      <span className="fdci-summary-val">{briefing?.stats.open_tasks ?? 0}</span>
                      <span className="fdci-summary-key">Task aperte</span>
                    </div>
                    <div className="fdci-summary-card">
                      <span className="fdci-summary-icon">🎯</span>
                      <span className="fdci-summary-val fdci-summary-val--small">
                        {briefing?.start_options.find(o => o.id === startChoice)?.label ?? 'Flessibile'}
                      </span>
                      <span className="fdci-summary-key">Partenza</span>
                    </div>
                  </div>

                  {(otherPriorities.trim() || freeNote.trim()) && (
                    <div className="fdci-summary-note">
                      <span className="fdci-summary-note-icon">💬</span>
                      <span className="fdci-summary-note-text">
                        {[otherPriorities.trim(), freeNote.trim()].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="fdci-start-btn"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? <span className="fdci-spinner-sm" /> : <span>🚀</span>}
                    Organizza la mia giornata
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="fdci-nav">
          <button
            type="button"
            className="fdci-btn fdci-btn--ghost"
            onClick={step === 0 ? onSkip : goPrev}
          >
            {step === 0 ? 'Salta per ora' : <><ChevronLeft size={14} /> Indietro</>}
          </button>

          {!isSummary && (
            <button
              type="button"
              className="fdci-btn fdci-btn--primary"
              onClick={goNext}
              disabled={step === 1 && briefingLoading}
            >
              {step === TOTAL_STEPS - 1 ? 'Vedi riepilogo' : 'Avanti'}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FocusDailyCheckin;
