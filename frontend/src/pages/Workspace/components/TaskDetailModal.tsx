import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Calendar, 
  AlertCircle, 
  Save,
  CheckCircle2,
  GitBranch,
  Clock
} from 'lucide-react';
import { workspaceTasksApi } from '../../../api/workspaceTasks';
import { workspaceApi } from '../../../api/workspace';
import type { WorkspaceUserTask, WorkspaceProject, WorkspaceBranch } from '../../../types/workspace';
import './TaskDetailModal.css';

interface TaskDetailModalProps {
  task: WorkspaceUserTask;
  project: (WorkspaceProject & { branches?: WorkspaceBranch[] }) | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  task, 
  project, 
  onClose, 
  onTaskUpdated 
}) => {
  const [editedTask, setEditedTask] = useState<Partial<WorkspaceUserTask>>(task);
  const [branches, setBranches] = useState<WorkspaceBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      if (!project) {
        try {
          setIsLoading(true);
          const projectData = await workspaceApi.getWorkspaceProject(task.project_id);
          setBranches(projectData.branches);
        } catch (err) {
          console.error('Failed to load branches:', err);
          setError('Errore nel caricamento dei branch');
        } finally {
          setIsLoading(false);
        }
      } else {
        setBranches(project?.branches || []);
      }
    };

    loadBranches();
  }, [task.project_id, project]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await workspaceTasksApi.updateWorkspaceTask(task.project_id, task.id, editedTask);
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Errore nel salvataggio della task');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    setSaving(true);
    setError(null);

    try {
      await workspaceTasksApi.updateWorkspaceTask(task.project_id, task.id, { 
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('Errore nel completare la task');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: 'todo', label: 'Da fare' },
    { value: 'in_progress', label: 'In corso' },
    { value: 'review', label: 'In revisione' },
    { value: 'completed', label: 'Completato' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Bassa' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'todo': return '#8E8E93';
      case 'in_progress': return '#0A84FF';
      case 'review': return '#FF9F0A';
      case 'completed': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return '#8E8E93';
      case 'medium': return '#0A84FF';
      case 'high': return '#FF9F0A';
      case 'urgent': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  return (
    <motion.div
      className="task-detail-modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="task-detail-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
      >
        <div className="task-detail-modal-header">
          <h2 className="task-detail-modal-title">Dettagli Task</h2>
          <button 
            className="task-detail-modal-close"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>

        <div className="task-detail-modal-content">
          {error && (
            <div className="task-detail-modal-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="task-detail-modal-form">
            {/* Title */}
            <div className="task-detail-modal-field">
              <label className="task-detail-modal-label">Titolo</label>
              <input
                type="text"
                className="task-detail-modal-input"
                value={editedTask.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                placeholder="Inserisci il titolo della task"
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div className="task-detail-modal-field">
              <label className="task-detail-modal-label">Descrizione</label>
              <textarea
                className="task-detail-modal-textarea"
                rows={4}
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                placeholder="Descrizione dettagliata della task..."
                disabled={isSaving}
              />
            </div>

            {/* Status and Priority Row */}
            <div className="task-detail-modal-row">
              <div className="task-detail-modal-field">
                <label className="task-detail-modal-label">Status</label>
                <select
                  className="task-detail-modal-select"
                  value={editedTask.status || task.status}
                  onChange={(e) => setEditedTask({ 
                    ...editedTask, 
                    status: e.target.value as WorkspaceUserTask['status']
                  })}
                  disabled={isSaving}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div 
                  className="task-detail-modal-status-preview"
                  style={{ backgroundColor: getStatusColor(editedTask.status || task.status) }}
                />
              </div>

              <div className="task-detail-modal-field">
                <label className="task-detail-modal-label">Priorità</label>
                <select
                  className="task-detail-modal-select"
                  value={editedTask.priority || task.priority}
                  onChange={(e) => setEditedTask({ 
                    ...editedTask, 
                    priority: e.target.value as WorkspaceUserTask['priority']
                  })}
                  disabled={isSaving}
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div 
                  className="task-detail-modal-priority-preview"
                  style={{ backgroundColor: getPriorityColor(editedTask.priority || task.priority) }}
                />
              </div>
            </div>

            {/* Due Date and Branch Row */}
            <div className="task-detail-modal-row">
              <div className="task-detail-modal-field">
                <label className="task-detail-modal-label">
                  <Calendar size={16} />
                  Scadenza
                </label>
                <input
                  type="date"
                  className="task-detail-modal-input"
                  value={editedTask.due_date ? editedTask.due_date.split('T')[0] : task.due_date?.split('T')[0] || ''}
                  onChange={(e) => setEditedTask({ 
                    ...editedTask, 
                    due_date: e.target.value ? e.target.value + 'T23:59:59.000Z' : null
                  })}
                  disabled={isSaving}
                />
              </div>

              <div className="task-detail-modal-field">
                <label className="task-detail-modal-label">
                  <GitBranch size={16} />
                  Branch
                </label>
                {isLoading ? (
                  <div className="task-detail-modal-loading">Caricamento branch...</div>
                ) : (
                  <select
                    className="task-detail-modal-select"
                    value={editedTask.branch_id || task.branch_id || ''}
                    onChange={(e) => setEditedTask({ 
                      ...editedTask, 
                      branch_id: e.target.value ? parseInt(e.target.value) : null
                    })}
                    disabled={isSaving}
                  >
                    <option value="">Nessun branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Task Info */}
            <div className="task-detail-modal-info">
              <div className="task-detail-modal-info-item">
                <Clock size={16} />
                <span>Task ID: {task.id}</span>
              </div>
              {task.completed_at && (
                <div className="task-detail-modal-info-item">
                  <CheckCircle2 size={16} />
                  <span>Completata il {new Date(task.completed_at).toLocaleDateString('it-IT')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="task-detail-modal-actions">
          <button
            type="button"
            className="task-detail-modal-btn task-detail-modal-btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Annulla
          </button>
          
          {task.status !== 'completed' && (
            <button
              type="button"
              className="task-detail-modal-btn task-detail-modal-btn-success"
              onClick={handleMarkCompleted}
              disabled={isSaving}
            >
              <CheckCircle2 size={16} />
              {isSaving ? 'Completamento...' : 'Segna Completata'}
            </button>
          )}
          
          <button
            type="button"
            className="task-detail-modal-btn task-detail-modal-btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TaskDetailModal;