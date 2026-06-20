import React, { useState, useCallback } from 'react';
import { X, Plus, Bot, BotMessageSquare, User, ChevronDown, ChevronUp, Zap, Check } from 'lucide-react';
import type { TaskExecutionMode } from '../../api/crmProjects';
import ExactPromptCheckbox from '../../components/Tasks/ExactPromptCheckbox';
import TaskAiPanel from './TaskAiPanel';
import './CreateTaskModal.css';

interface Assignment {
  user_id?: number;
  payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
  hourly_rate_cocchi?: number;
  hours_requested?: number;
  task_rate_cocchi?: number;
  project_rate_cocchi?: number;
}

interface ProjectBudgetInfo {
  budget_cocchi?: number;
  spent_cocchi?: number;
}

interface CrmOption {
  id: number;
  name: string;
  code?: string;
}

interface CreateTaskModalProps {
  taskTitle: string;
  setTaskTitle: (v: string) => void;
  taskDescription: string;
  setTaskDescription: (v: string) => void;
  taskStatus: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  setTaskStatus: (v: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled') => void;
  taskPriority: 'low' | 'medium' | 'high' | 'urgent';
  setTaskPriority: (v: 'low' | 'medium' | 'high' | 'urgent') => void;
  taskStartDate: string;
  setTaskStartDate: (v: string) => void;
  taskDueDate: string;
  setTaskDueDate: (v: string) => void;
  taskCrmLabelId: number | null;
  setTaskCrmLabelId: (v: number | null) => void;
  taskExecutionMode: TaskExecutionMode;
  setTaskExecutionMode: (v: TaskExecutionMode) => void;
  taskExactPrompt: boolean;
  setTaskExactPrompt: (v: boolean) => void;
  taskAssignments: Assignment[];
  handleAddAssignment: () => void;
  handleRemoveAssignment: (index: number) => void;
  handleUpdateAssignment: (index: number, field: string, value: any) => void;
  creatingTask: boolean;
  project: ProjectBudgetInfo | null;
  assignedCrms: CrmOption[];
  remainingBudget: number;
  totalAssignmentsBudget: number;
  teamUsers: Array<{ id: number; name: string; email?: string; role?: string }>;
  getPreferredPaymentMethodsForUser: (userId: number | undefined) => string[];
  getDefaultProjectRateForUser: (userId: number | undefined) => number | null;
  onClose: () => void;
  onSubmit: () => void;
}

const EXECUTION_MODES: Array<{ mode: TaskExecutionMode; label: string; icon: React.ReactNode }> = [
  { mode: 'agent', label: 'Agente', icon: <Bot size={14} /> },
  { mode: 'agent_human', label: 'Agente + Umano', icon: <BotMessageSquare size={14} /> },
  { mode: 'human', label: 'Umano', icon: <User size={14} /> },
];

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Bassa', color: '#8E8E93' },
  { value: 'medium' as const, label: 'Media', color: '#0A84FF' },
  { value: 'high' as const, label: 'Alta', color: '#FF9F0A' },
  { value: 'urgent' as const, label: 'Urgente', color: '#FF3B30' },
];

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  taskTitle, setTaskTitle,
  taskDescription, setTaskDescription,
  taskStatus, setTaskStatus,
  taskPriority, setTaskPriority,
  taskStartDate, setTaskStartDate,
  taskDueDate, setTaskDueDate,
  taskCrmLabelId, setTaskCrmLabelId,
  taskExecutionMode, setTaskExecutionMode,
  taskExactPrompt, setTaskExactPrompt,
  taskAssignments,
  handleAddAssignment, handleRemoveAssignment, handleUpdateAssignment,
  creatingTask,
  project,
  assignedCrms,
  remainingBudget,
  totalAssignmentsBudget,
  teamUsers,
  getPreferredPaymentMethodsForUser,
  getDefaultProjectRateForUser,
  onClose,
  onSubmit,
}) => {
  const [showAssignments, setShowAssignments] = useState(false);
  const [provisionalTitle, setProvisionalTitle] = useState<string | null>(null);

  const budgetOver = totalAssignmentsBudget > remainingBudget && taskAssignments.length > 0;
  const isAgentMode = taskExecutionMode === 'agent';
  const hasAgentMode = taskExecutionMode === 'agent' || taskExecutionMode === 'agent_human';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleAcceptProvisional = () => {
    if (provisionalTitle) {
      setTaskTitle(provisionalTitle);
      setProvisionalTitle(null);
    }
  };

  const handleRejectProvisional = () => {
    setProvisionalTitle(null);
  };

  const handleProvisionalTitle = useCallback((t: string | null) => {
    setProvisionalTitle(t);
  }, []);

  // The displayed value in the title input: provisional overrides real value when title is empty
  const displayTitle = provisionalTitle !== null ? provisionalTitle : taskTitle;
  const isProvisional = provisionalTitle !== null;

  return (
    <div className="ctm-overlay" onClick={handleOverlayClick}>
      <div className="ctm-row" onClick={(e) => e.stopPropagation()}>
      <div className="ctm-modal">

        {/* ── Header ── */}
        <div className="ctm-header">
          <div className="ctm-header-left">
            <Zap size={16} className="ctm-header-icon" />
            <span className="ctm-header-title">Crea Task</span>
          </div>
          <button className="ctm-close" onClick={onClose} type="button" disabled={creatingTask}>
            <X size={16} />
          </button>
        </div>

        {/* ── Fast Zone: Title ── */}
        <div className="ctm-fast-zone">
          <div className="ctm-title-wrap">
            <input
              type="text"
              className={`ctm-title-input ${isProvisional ? 'provisional' : ''}`}
              value={displayTitle}
              onChange={(e) => {
                setProvisionalTitle(null);
                setTaskTitle(e.target.value);
              }}
              placeholder="Titolo della task…"
              autoFocus
              disabled={creatingTask}
              readOnly={isProvisional}
            />
            {isProvisional && (
              <div className="ctm-provisional-actions">
                <button
                  type="button"
                  className="ctm-provisional-accept"
                  onClick={handleAcceptProvisional}
                  title="Accetta questo titolo"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="ctm-provisional-reject"
                  onClick={handleRejectProvisional}
                  title="Rifiuta"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          {isProvisional && (
            <span className="ctm-provisional-hint">Titolo suggerito dall'AI · tocca ✓ per accettare</span>
          )}
        </div>

        {/* ── Control Zone: Description + Execution Mode ── */}
        <div className="ctm-control-zone">
          <textarea
            className="ctm-description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Descrizione opzionale…"
            rows={2}
            disabled={creatingTask}
          />

          {/* Segmented Control */}
          <div className="ctm-segmented" role="radiogroup" aria-label="Modalità esecuzione">
            {EXECUTION_MODES.map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={taskExecutionMode === mode}
                className={`ctm-seg-btn ${taskExecutionMode === mode ? 'active' : ''}`}
                onClick={() => setTaskExecutionMode(mode)}
                disabled={creatingTask}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {hasAgentMode && (
            <div className="ctm-exact-prompt-row">
              <ExactPromptCheckbox
                checked={taskExactPrompt}
                onChange={setTaskExactPrompt}
                disabled={creatingTask}
                id="ctm-exact-prompt"
              />
            </div>
          )}
        </div>

        {/* ── Detail Zone: 2×2 grid ── */}
        <div className="ctm-detail-zone">
          {!isAgentMode && (
            <div className="ctm-detail-field">
              <label className="ctm-detail-label">Stato</label>
              <select
                className="ctm-detail-select"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as typeof taskStatus)}
                disabled={creatingTask}
              >
                <option value="pending">In Attesa</option>
                <option value="in_progress">In Corso</option>
                <option value="review">In Revisione</option>
                <option value="completed">Completato</option>
                <option value="cancelled">Cancellato</option>
              </select>
            </div>
          )}

          <div className="ctm-detail-field">
            <label className="ctm-detail-label">Priorità</label>
            <div className="ctm-priority-pills">
              {PRIORITY_OPTIONS.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  className={`ctm-priority-pill ${taskPriority === value ? 'active' : ''}`}
                  style={{ '--pill-color': color } as React.CSSProperties}
                  onClick={() => setTaskPriority(value)}
                  disabled={creatingTask}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ctm-detail-field">
            <label className="ctm-detail-label">Inizio</label>
            <input
              type="date"
              className="ctm-detail-select"
              value={taskStartDate}
              onChange={(e) => setTaskStartDate(e.target.value)}
              disabled={creatingTask}
            />
          </div>

          <div className="ctm-detail-field">
            <label className="ctm-detail-label">Scadenza</label>
            <input
              type="date"
              className="ctm-detail-select"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              disabled={creatingTask}
            />
          </div>

          {assignedCrms.length > 0 && (
            <div className="ctm-detail-field ctm-detail-full">
              <label className="ctm-detail-label">Etichetta CRM</label>
              <select
                className="ctm-detail-select"
                value={taskCrmLabelId || ''}
                onChange={(e) => setTaskCrmLabelId(e.target.value ? Number(e.target.value) : null)}
                disabled={creatingTask}
              >
                <option value="">Visibile a tutti</option>
                {assignedCrms.map((crm) => (
                  <option key={crm.id} value={crm.id}>
                    {crm.name}{crm.code ? ` (${crm.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Assignments collapsible ── */}
        <div className="ctm-assignments-section">
          <button
            type="button"
            className="ctm-assignments-toggle"
            onClick={() => setShowAssignments((v) => !v)}
            disabled={creatingTask}
          >
            <div className="ctm-assignments-toggle-left">
              <User size={14} />
              <span>Assegnazioni</span>
              {taskAssignments.length > 0 && (
                <span className="ctm-badge">{taskAssignments.length}</span>
              )}
            </div>
            <div className="ctm-assignments-toggle-right">
              <button
                type="button"
                className="ctm-add-assignment-btn"
                onClick={(e) => { e.stopPropagation(); handleAddAssignment(); setShowAssignments(true); }}
                disabled={creatingTask}
              >
                <Plus size={12} />
              </button>
              {showAssignments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {showAssignments && taskAssignments.length > 0 && (
            <div className="ctm-assignments-list">
              {taskAssignments.map((assignment, index) => (
                <AssignmentRow
                  key={index}
                  index={index}
                  assignment={assignment}
                  teamUsers={teamUsers}
                  getPreferredPaymentMethodsForUser={getPreferredPaymentMethodsForUser}
                  getDefaultProjectRateForUser={getDefaultProjectRateForUser}
                  onUpdate={handleUpdateAssignment}
                  onRemove={handleRemoveAssignment}
                  disabled={creatingTask}
                />
              ))}
            </div>
          )}

          {showAssignments && taskAssignments.length === 0 && (
            <p className="ctm-assignments-empty">Nessuna assegnazione. Premi + per aggiungere.</p>
          )}
        </div>

        {/* ── Budget info strip ── */}
        {project && (
          <div className={`ctm-budget-strip ${budgetOver ? 'over' : ''}`}>
            <span>Budget rimanente: <strong>{remainingBudget.toFixed(2)} ¢</strong></span>
            {taskAssignments.length > 0 && (
              <span>
                {' · '}Richiesto: <strong style={{ color: budgetOver ? '#FF3B30' : '#34C759' }}>
                  {totalAssignmentsBudget.toFixed(2)} ¢
                </strong>
                {budgetOver && ' ⚠️'}
              </span>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="ctm-footer">
          <button
            type="button"
            className="ctm-btn-cancel"
            onClick={onClose}
            disabled={creatingTask}
          >
            Annulla
          </button>
          <button
            type="button"
            className="ctm-btn-create"
            onClick={onSubmit}
            disabled={creatingTask || !taskTitle.trim()}
          >
            {creatingTask ? (
              <span className="ctm-spinner" />
            ) : (
              <Plus size={15} />
            )}
            {creatingTask
              ? hasAgentMode ? 'Avvio agente…' : 'Creazione…'
              : 'Crea Task'}
          </button>
        </div>
      </div>

      {/* ── AI Panel (sibling, right side) ── */}
      <TaskAiPanel
        title={taskTitle}
        description={taskDescription}
        onApply={(newTitle, newDesc) => {
          setProvisionalTitle(null);
          setTaskTitle(newTitle);
          setTaskDescription(newDesc);
        }}
        onProvisionalTitle={handleProvisionalTitle}
      />
      </div>
    </div>
  );
};

/* ── Inline assignment row subcomponent ── */

interface AssignmentRowProps {
  index: number;
  assignment: Assignment;
  teamUsers: Array<{ id: number; name: string; email?: string; role?: string }>;
  getPreferredPaymentMethodsForUser: (userId: number | undefined) => string[];
  getDefaultProjectRateForUser: (userId: number | undefined) => number | null;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  hourly: 'A Ore',
  per_task: 'A Task',
  per_project: 'A Progetto',
  fixed: 'Fisso',
  no_payment: 'Nessun Pagamento',
};

const AssignmentRow: React.FC<AssignmentRowProps> = ({
  index, assignment, teamUsers,
  getPreferredPaymentMethodsForUser, getDefaultProjectRateForUser,
  onUpdate, onRemove, disabled,
}) => {
  const preferredMethods = getPreferredPaymentMethodsForUser(assignment.user_id);
  const defaultRate = getDefaultProjectRateForUser(assignment.user_id);

  const handleUserChange = (userId: number | undefined) => {
    onUpdate(index, 'user_id', userId);
    if (userId) {
      const preferred = getPreferredPaymentMethodsForUser(userId);
      if (preferred.length > 0) {
        onUpdate(index, 'payment_method', preferred[0]);
        if (preferred[0] === 'per_project') {
          const rate = getDefaultProjectRateForUser(userId);
          if (rate !== null) onUpdate(index, 'project_rate_cocchi', rate);
        }
      }
    }
  };

  const handleMethodChange = (method: string) => {
    onUpdate(index, 'payment_method', method);
    if (method !== 'hourly') { onUpdate(index, 'hourly_rate_cocchi', undefined); onUpdate(index, 'hours_requested', undefined); }
    if (method !== 'per_task') onUpdate(index, 'task_rate_cocchi', undefined);
    if (method === 'per_project' && defaultRate !== null) onUpdate(index, 'project_rate_cocchi', defaultRate);
    if (method !== 'per_project' && method !== 'per_task' && method !== 'hourly') onUpdate(index, 'project_rate_cocchi', undefined);
  };

  return (
    <div className="ctm-assignment-row">
      <div className="ctm-assignment-row-header">
        <span className="ctm-assignment-index">#{index + 1}</span>
        <button type="button" className="ctm-assignment-remove" onClick={() => onRemove(index)} disabled={disabled}>
          <X size={12} />
        </button>
      </div>

      <div className="ctm-assignment-fields">
        <select
          className="ctm-detail-select"
          value={assignment.user_id ? String(assignment.user_id) : ''}
          onChange={(e) => handleUserChange(e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
        >
          <option value="">Seleziona utente…</option>
          {teamUsers.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.name}{u.role ? ` · ${u.role}` : ''}
            </option>
          ))}
        </select>

        <select
          className="ctm-detail-select"
          value={assignment.payment_method || 'hourly'}
          onChange={(e) => handleMethodChange(e.target.value)}
          disabled={disabled}
        >
          <option value="hourly">A Ore</option>
          <option value="per_task">A Task</option>
          <option value="per_project">A Progetto</option>
          <option value="fixed">Fisso (no ¢)</option>
          <option value="no_payment">Nessun Pagamento</option>
        </select>
      </div>

      {assignment.payment_method === 'hourly' && (
        <div className="ctm-assignment-fields">
          <input
            type="number" step="0.01" min="0"
            className="ctm-detail-select"
            value={assignment.hourly_rate_cocchi || ''}
            onChange={(e) => onUpdate(index, 'hourly_rate_cocchi', parseFloat(e.target.value) || 0)}
            placeholder="Tariffa/ora (¢)"
            disabled={disabled}
          />
          <input
            type="number" step="0.5" min="0"
            className="ctm-detail-select"
            value={assignment.hours_requested || ''}
            onChange={(e) => onUpdate(index, 'hours_requested', parseFloat(e.target.value) || 0)}
            placeholder="Ore"
            disabled={disabled}
          />
        </div>
      )}

      {assignment.payment_method === 'per_task' && (
        <input
          type="number" step="0.01" min="0"
          className="ctm-detail-select"
          value={assignment.task_rate_cocchi || ''}
          onChange={(e) => onUpdate(index, 'task_rate_cocchi', parseFloat(e.target.value) || 0)}
          placeholder="Tariffa per task (¢)"
          disabled={disabled}
        />
      )}

      {assignment.payment_method === 'per_project' && (
        <input
          type="number" step="0.01" min="0"
          className="ctm-detail-select"
          value={assignment.project_rate_cocchi || ''}
          onChange={(e) => onUpdate(index, 'project_rate_cocchi', parseFloat(e.target.value) || 0)}
          placeholder={`Tariffa progetto (¢)${defaultRate !== null ? ` · default: ${defaultRate}` : ''}`}
          disabled={disabled}
        />
      )}

      {preferredMethods.length > 0 && (
        <p className="ctm-assignment-hint">
          Preferisce: {preferredMethods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ')}
        </p>
      )}
    </div>
  );
};

export default CreateTaskModal;
