import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, RefreshCw, Zap, AlertTriangle, Shield, Truck,
  MessageSquare, Code2, AlertCircle, FileText, ListChecks,
  Calendar, Paintbrush,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { taskDetailAiApi, type TaskAiBrief, type ChecklistItem, type MissingInfoRequest } from '../../../../api/taskDetailAi';
import TaskDraftCard from './TaskDraftCard';

interface TaskAiRoadmapProps {
  projectId: number;
  taskId: number;
  onBriefLoaded?: (brief: TaskAiBrief) => void;
}

const effortColors: Record<string, string> = {
  low: '#34C759',
  medium: '#FF9F0A',
  high: '#FF3B30',
};

const effortLabel: Record<string, string> = {
  low: 'Facile',
  medium: 'Medio',
  high: 'Intenso',
};

const statusDotBg: Record<string, string> = {
  todo: 'transparent',
  doing: 'rgba(10,132,255,0.15)',
  done: '#34C759',
};

const statusDotBorder: Record<string, string> = {
  todo: 'rgba(255,255,255,0.18)',
  doing: '#0A84FF',
  done: '#34C759',
};

const categoryIcon = (cat: ChecklistItem['category']) => {
  switch (cat) {
    case 'quality': return <Shield size={12} />;
    case 'delivery': return <Truck size={12} />;
    case 'communication': return <MessageSquare size={12} />;
    case 'technical': return <Code2 size={12} />;
  }
};

const categoryColor: Record<string, string> = {
  quality: '#34C759',
  delivery: '#0A84FF',
  communication: '#BF5AF2',
  technical: '#FF9F0A',
};

const severityColor: Record<string, string> = {
  high: '#FF3B30',
  medium: '#FF9F0A',
  low: '#8E8E93',
};

const intentIcon: Record<string, React.ReactNode> = {
  communication: <MessageSquare size={14} />,
  procedure: <ListChecks size={14} />,
  creative: <Paintbrush size={14} />,
  analysis: <FileText size={14} />,
  meeting: <Calendar size={14} />,
  generic: <Zap size={14} />,
};

const intentLabel: Record<string, string> = {
  communication: 'Comunicazione',
  procedure: 'Procedura',
  creative: 'Creativo',
  analysis: 'Analisi',
  meeting: 'Riunione',
  generic: 'Task',
};

// ── Missing-info card ────────────────────────────────────────────────────────

interface MissingInfoCardProps {
  requests: MissingInfoRequest[];
  projectId: number;
  taskId: number;
  onDraftReady: (draftText: string) => void;
}

const MissingInfoCard: React.FC<MissingInfoCardProps> = ({ requests, projectId, taskId, onDraftReady }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const filledInfo = requests
      .map((r) => `${r.field}: ${values[r.field]?.trim() || 'non specificato'}`)
      .join('; ');

    setLoading(true);
    try {
      const res = await taskDetailAiApi.ask(
        projectId,
        taskId,
        `Genera la bozza completa del messaggio o email con queste informazioni aggiuntive: ${filledInfo}. ` +
        'Rispondi SOLO con il testo del messaggio/email, in italiano, pronto per essere copiato. Non aggiungere spiegazioni.'
      );
      onDraftReady(res.data.answer);
    } catch {
      // noop — user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arm-missing-info-card">
      <div className="arm-missing-info-header">
        <AlertCircle size={14} />
        <span>Info mancanti per generare la bozza</span>
      </div>
      <div className="arm-missing-info-fields">
        {requests.map((req) => (
          <div key={req.field} className="arm-missing-info-field">
            <label className="arm-missing-info-label">{req.question}</label>
            <input
              type="text"
              className="arm-missing-info-input"
              value={values[req.field] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [req.field]: e.target.value }))}
              placeholder="Scrivi qui..."
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="arm-generate-draft-btn"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <RefreshCw size={13} className="arm-spin" />
            <span>Generazione...</span>
          </>
        ) : (
          <>
            <Sparkles size={13} />
            <span>Genera bozza</span>
          </>
        )}
      </button>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const TaskAiRoadmap: React.FC<TaskAiRoadmapProps> = ({ projectId, taskId, onBriefLoaded }) => {
  const [brief, setBrief] = useState<TaskAiBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [overrideDraft, setOverrideDraft] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setOverrideDraft(null);
    try {
      const response = await taskDetailAiApi.getBrief(projectId, taskId);
      if (response.data) {
        setBrief(response.data);
        onBriefLoaded?.(response.data);
      }
    } catch (error) {
      console.error('Error loading AI roadmap:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, onBriefLoaded]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await taskDetailAiApi.getBrief(projectId, taskId);
        if (!cancelled && response.data) {
          setBrief(response.data);
          onBriefLoaded?.(response.data);
        }
      } catch (error) {
        console.error('Error loading AI roadmap:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [projectId, taskId, onBriefLoaded]);

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderSkeleton = () => (
    <div className="arm-skeleton">
      {[80, 65, 75, 55].map((w, i) => (
        <div key={i} className="arm-skeleton-item">
          <div className="arm-skeleton-circle" />
          <div className="arm-skeleton-lines">
            <div className="arm-skeleton-line" style={{ width: `${w}%` }} />
            <div className="arm-skeleton-line" style={{ width: `${w - 20}%` }} />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Communication intent ────────────────────────────────────────────────────
  const renderCommunication = () => {
    if (overrideDraft) {
      return (
        <TaskDraftCard
          draft={{
            type: 'message',
            body: overrideDraft,
            variables_used: [],
            missing_info: [],
          }}
        />
      );
    }

    const hasMissingInfo =
      (brief?.missing_info_requests?.length ?? 0) > 0 && !brief?.ready_to_use;

    if (hasMissingInfo) {
      return (
        <MissingInfoCard
          requests={brief!.missing_info_requests!}
          projectId={projectId}
          taskId={taskId}
          onDraftReady={setOverrideDraft}
        />
      );
    }

    if (brief?.ready_to_use) {
      return <TaskDraftCard draft={brief.ready_to_use} />;
    }

    return (
      <div className="arm-empty">
        <div className="arm-empty-icon"><Sparkles size={20} /></div>
        <p>Nessuna bozza generata.</p>
        <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera adesso</button>
      </div>
    );
  };

  // ── Steps (procedure / creative / meeting) ─────────────────────────────────
  const renderSteps = () => {
    const steps = brief?.steps ?? [];
    if (!steps.length) {
      return (
        <div className="arm-empty">
          <div className="arm-empty-icon"><Sparkles size={20} /></div>
          <p>Nessun piano generato.</p>
          <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera adesso</button>
        </div>
      );
    }

    return (
      <div className="arm-steps">
        {steps.map((step, idx) => {
          const isDone = step.status === 'done';
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.step} className={`arm-step arm-step-${step.status}`}>
              <div className="arm-step-spine">
                <motion.div
                  className="arm-step-circle"
                  animate={{
                    backgroundColor: statusDotBg[step.status],
                    borderColor: statusDotBorder[step.status],
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.svg
                        key="check"
                        width="11" height="9" viewBox="0 0 10 8" fill="none"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      >
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    ) : (
                      <motion.span
                        key="num"
                        className="arm-step-num"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {idx + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                {!isLast && <div className="arm-step-connector" />}
              </div>
              <div className="arm-step-content">
                <div className="arm-step-action">{step.action}</div>
                {step.why && <div className="arm-step-why">{step.why}</div>}
                <div className="arm-step-badges">
                  <span
                    className="arm-effort-badge"
                    style={{
                      color: effortColors[step.effort],
                      borderColor: `${effortColors[step.effort]}35`,
                      background: `${effortColors[step.effort]}12`,
                    }}
                  >
                    {effortLabel[step.effort]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {brief?.blockers && brief.blockers.length > 0 && (
          <div className="arm-blockers">
            <div className="arm-blockers-label">
              <AlertTriangle size={12} />
              Possibili blocchi
            </div>
            {brief.blockers.map((b, i) => (
              <div key={i} className="arm-blocker-item" style={{ borderLeftColor: severityColor[b.severity] }}>
                <span className="arm-blocker-text">{b.message}</span>
                <span className="arm-blocker-sev" style={{ color: severityColor[b.severity] }}>{b.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Analysis: checklist ─────────────────────────────────────────────────────
  const renderChecklist = () => {
    const checklist = brief?.checklist ?? [];
    if (!checklist.length) {
      return (
        <div className="arm-empty">
          <div className="arm-empty-icon"><Sparkles size={20} /></div>
          <p>Nessuna checklist generata.</p>
          <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera adesso</button>
        </div>
      );
    }

    const byCategory = checklist.reduce<Record<string, typeof checklist>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const doneCount = checklist.filter((i) => checkedItems.has(i.id)).length;
    const totalCount = checklist.length;

    return (
      <div className="arm-checklist">
        <div className="arm-checklist-progress-row">
          <div className="arm-checklist-bar">
            <motion.div
              className="arm-checklist-bar-fill"
              animate={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
          <span className="arm-checklist-progress-label">{doneCount}/{totalCount} verificati</span>
        </div>

        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="arm-checklist-group">
            <div className="arm-checklist-group-label" style={{ color: categoryColor[cat] }}>
              {categoryIcon(cat as ChecklistItem['category'])}
              <span>{cat}</span>
            </div>
            {items.map((item) => {
              const checked = checkedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`arm-checklist-item${checked ? ' checked' : ''}`}
                  onClick={() => toggleCheckItem(item.id)}
                  role="checkbox"
                  aria-checked={checked}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleCheckItem(item.id); } }}
                >
                  <motion.div
                    className="arm-checkbox"
                    animate={{
                      backgroundColor: checked ? '#34C759' : 'transparent',
                      borderColor: checked ? '#34C759' : 'rgba(255,255,255,0.22)',
                    }}
                    whileTap={{ scale: 0.82 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AnimatePresence>
                      {checked && (
                        <motion.div
                          key="ck"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="arm-checklist-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── Generic: single next step ───────────────────────────────────────────────
  const renderGeneric = () => {
    if (!brief?.next_step) {
      return (
        <div className="arm-empty">
          <div className="arm-empty-icon"><Sparkles size={20} /></div>
          <p>Nessuna azione suggerita.</p>
          <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera adesso</button>
        </div>
      );
    }
    return (
      <div className="arm-generic-next-step">
        <div className="arm-generic-next-step-label">
          <Zap size={12} />
          Prossima azione
        </div>
        <p className="arm-generic-next-step-text">{brief.next_step}</p>
      </div>
    );
  };

  // ── Legacy fallback (old cached data without intent or with roadmap) ─────────
  const renderLegacyRoadmap = () => {
    const roadmap = brief?.roadmap ?? [];
    if (!roadmap.length) {
      return (
        <div className="arm-empty">
          <div className="arm-empty-icon"><Sparkles size={20} /></div>
          <p>Nessuna roadmap generata.</p>
          <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera adesso</button>
        </div>
      );
    }
    return (
      <div className="arm-roadmap">
        {brief?.next_step && (
          <div className="arm-next-step">
            <div className="arm-next-step-label">
              <Zap size={11} />
              Prossimo passo urgente
            </div>
            <p className="arm-next-step-text">{brief.next_step}</p>
          </div>
        )}
        <div className="arm-steps">
          {roadmap.map((step, idx) => {
            const isDone = step.status === 'done';
            const isLast = idx === roadmap.length - 1;
            return (
              <div key={step.step} className={`arm-step arm-step-${step.status}`}>
                <div className="arm-step-spine">
                  <motion.div
                    className="arm-step-circle"
                    animate={{
                      backgroundColor: statusDotBg[step.status],
                      borderColor: statusDotBorder[step.status],
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence mode="wait">
                      {isDone ? (
                        <motion.svg
                          key="check"
                          width="11" height="9" viewBox="0 0 10 8" fill="none"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        >
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      ) : (
                        <motion.span
                          key="num"
                          className="arm-step-num"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {idx + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  {!isLast && <div className="arm-step-connector" />}
                </div>
                <div className="arm-step-content">
                  <div className="arm-step-action">{step.action}</div>
                  {step.why && <div className="arm-step-why">{step.why}</div>}
                  <div className="arm-step-badges">
                    <span
                      className="arm-effort-badge"
                      style={{
                        color: effortColors[step.effort],
                        borderColor: `${effortColors[step.effort]}35`,
                        background: `${effortColors[step.effort]}12`,
                      }}
                    >
                      {effortLabel[step.effort]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {brief?.blockers && brief.blockers.length > 0 && (
          <div className="arm-blockers">
            <div className="arm-blockers-label">
              <AlertTriangle size={12} />
              Possibili blocchi
            </div>
            {brief.blockers.map((b, i) => (
              <div key={i} className="arm-blocker-item" style={{ borderLeftColor: severityColor[b.severity] }}>
                <span className="arm-blocker-text">{b.message}</span>
                <span className="arm-blocker-sev" style={{ color: severityColor[b.severity] }}>{b.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Dispatch by intent ──────────────────────────────────────────────────────
  const renderBody = () => {
    if (loading) return renderSkeleton();
    if (!brief) return null;

    const intent = brief.intent;

    switch (intent) {
      case 'communication':
        return renderCommunication();
      case 'procedure':
      case 'creative':
      case 'meeting':
        return renderSteps();
      case 'analysis':
        return renderChecklist();
      case 'generic':
        return renderGeneric();
      default:
        // legacy cached responses that have roadmap but no intent
        if ((brief.roadmap?.length ?? 0) > 0) return renderLegacyRoadmap();
        if ((brief.checklist?.length ?? 0) > 0) return renderChecklist();
        return renderGeneric();
    }
  };

  const hasContent = loading || (brief !== null && (
    (brief.ready_to_use != null) ||
    (brief.missing_info_requests?.length ?? 0) > 0 ||
    (brief.steps?.length ?? 0) > 0 ||
    (brief.checklist?.length ?? 0) > 0 ||
    (brief.roadmap?.length ?? 0) > 0 ||
    brief.next_step != null
  ));

  if (!hasContent) {
    return (
      <div className="arm-card arm-card-empty">
        <div className="arm-header">
          <div className="arm-header-title">
            <Sparkles size={15} className="arm-sparkle" />
            <span>AI Copilot</span>
          </div>
          <button type="button" className="arm-refresh-btn" onClick={fetchBrief} disabled={loading} aria-label="Genera analisi AI">
            <RefreshCw size={13} className={loading ? 'arm-spin' : ''} />
          </button>
        </div>
        <div className="arm-empty">
          <div className="arm-empty-icon"><Sparkles size={22} /></div>
          <p>Analisi AI non ancora generata</p>
          <button type="button" className="arm-empty-btn" onClick={fetchBrief}>Genera ora</button>
        </div>
      </div>
    );
  }

  return (
    <div className="arm-card">
      <div className="arm-header">
        <div className="arm-header-title">
          <Sparkles size={15} className="arm-sparkle" />
          <span>AI Copilot</span>
          {brief?.intent && brief.intent !== 'generic' && (
            <span className="arm-intent-badge">
              {intentIcon[brief.intent]}
              {intentLabel[brief.intent]}
            </span>
          )}
          {brief?.confidence && (
            <span className={`arm-confidence arm-confidence-${brief.confidence}`}>
              {brief.confidence}
            </span>
          )}
        </div>
        <button
          type="button"
          className="arm-refresh-btn"
          onClick={fetchBrief}
          disabled={loading}
          aria-label="Aggiorna analisi AI"
          title="Aggiorna analisi"
        >
          <RefreshCw size={13} className={loading ? 'arm-spin' : ''} />
        </button>
      </div>

      {brief?.hint && (
        <div className="arm-hint-bar">
          <Sparkles size={11} />
          <span>{brief.hint}</span>
        </div>
      )}

      <div className="arm-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={brief?.intent ?? 'loading'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderBody()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskAiRoadmap;
