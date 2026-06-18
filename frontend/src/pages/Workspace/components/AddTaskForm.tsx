import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Calendar,
  AlertCircle,
  GitBranch
} from 'lucide-react';
import { workspaceTasksApi } from '../../../api/workspaceTasks';
import { workspaceApi } from '../../../api/workspace';
import type { WorkspaceBranch } from '../../../types/workspace';
import './AddTaskForm.css';

interface AddTaskFormProps {
  projectId: number;
  branches: WorkspaceBranch[];
  onClose: () => void;
  onTaskCreated: () => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ 
  projectId, 
  branches: propBranches, 
  onClose, 
  onTaskCreated 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [branches, setBranches] = useState<WorkspaceBranch[]>(propBranches);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load branches if not provided
    const loadBranches = async () => {
      if (propBranches.length === 0) {
        try {
          const projectData = await workspaceApi.getWorkspaceProject(projectId);
          setBranches(projectData.branches);
        } catch (err) {
          console.error('Failed to load branches:', err);
        }
      }
    };

    loadBranches();
  }, [projectId, propBranches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Il titolo è obbligatorio');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await workspaceTasksApi.createWorkspaceTask(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        branch_id: branchId || undefined,
        due_date: dueDate || undefined
      });

      onTaskCreated();
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Errore nella creazione della task');
      setIsCreating(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Bassa', color: '#8E8E93' },
    { value: 'medium', label: 'Media', color: '#0A84FF' },
    { value: 'high', label: 'Alta', color: '#FF9F0A' },
    { value: 'urgent', label: 'Urgente', color: '#FF3B30' }
  ];

  return (
    <div className="add-task-form-overlay" onClick={onClose}>
      <div className="add-task-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-task-form-header">
          <h2 className="add-task-form-title">
            <Plus size={20} />
            Nuova Task
          </h2>
          <button 
            className="add-task-form-close"
            onClick={onClose}
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-task-form-content">
          {error && (
            <div className="add-task-form-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="add-task-form-field">
            <label className="add-task-form-label">
              Titolo <span className="required">*</span>
            </label>
            <input
              type="text"
              className="add-task-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inserisci il titolo della task"
              required
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="add-task-form-field">
            <label className="add-task-form-label">Descrizione</label>
            <textarea
              className="add-task-form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione opzionale della task..."
              disabled={isCreating}
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="add-task-form-row">
            <div className="add-task-form-field">
              <label className="add-task-form-label">Priorità</label>
              <div className="add-task-form-priority-selector">
                {priorityOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`add-task-form-priority-btn ${priority === option.value ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: priority === option.value ? option.color : 'transparent',
                      color: priority === option.value ? 'white' : option.color,
                      borderColor: option.color
                    }}
                    onClick={() => setPriority(option.value as typeof priority)}
                    disabled={isCreating}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="add-task-form-field">
              <label className="add-task-form-label">
                <Calendar size={16} />
                Scadenza
              </label>
              <input
                type="date"
                className="add-task-form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Branch */}
          {branches.length > 0 && (
            <div className="add-task-form-field">
              <label className="add-task-form-label">
                <GitBranch size={16} />
                Branch
              </label>
              <select
                className="add-task-form-select"
                value={branchId || ''}
                onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isCreating}
              >
                <option value="">Nessun branch specifico</option>
                {branches
                  .filter(branch => branch.is_active)
                  .map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.description && ` - ${branch.description}`}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="add-task-form-actions">
            <button
              type="button"
              className="add-task-form-btn add-task-form-btn-secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="add-task-form-btn add-task-form-btn-primary"
              disabled={isCreating || !title.trim()}
            >
              <Plus size={16} />
              {isCreating ? 'Creazione...' : 'Crea Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskForm;