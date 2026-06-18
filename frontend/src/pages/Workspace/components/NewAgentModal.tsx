import React, { useState } from 'react';
import { X, Bot, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import ExactPromptCheckbox from '../../../components/Tasks/ExactPromptCheckbox';
import type { WorkspaceAgent, WorkspaceBranch } from '../../../types/workspace';
import './NewAgentModal.css';

interface NewAgentModalProps {
  projectId: number;
  branches: WorkspaceBranch[];
  onClose: () => void;
  onAgentCreated: (agent: WorkspaceAgent) => void;
  cloneFrom?: WorkspaceAgent; // Per clonare un agente esistente
}

const NewAgentModal: React.FC<NewAgentModalProps> = ({
  projectId,
  branches,
  onClose,
  onAgentCreated,
  cloneFrom
}) => {
  const [formData, setFormData] = useState({
    title: cloneFrom?.title ? `${cloneFrom.title} (copia)` : '',
    prompt: cloneFrom?.prompt || '',
    exact_prompt: cloneFrom?.exact_prompt ?? false,
    branch_id: cloneFrom?.branch_id || null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeBranches = branches.filter(branch => branch.is_active);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Il titolo è obbligatorio';
    }
    
    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Le istruzioni sono obbligatorie';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setErrors({});
      
      // Crea l'agente
      const newAgent = await workspaceAgentsApi.createAgent(projectId, {
        title: formData.title.trim(),
        prompt: formData.prompt.trim(),
        exact_prompt: formData.exact_prompt,
        branch_id: formData.branch_id || undefined
      });
      
      onAgentCreated(newAgent);
      
    } catch (err: any) {
      console.error('Failed to create agent:', err);
      
      // Gestisci errori di validazione dal backend
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: 'Errore nella creazione dell\'agente' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      className="new-agent-modal-overlay"
      onClick={handleOverlayClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="new-agent-modal"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
      >
        <div className="new-agent-modal-header">
          <div className="new-agent-modal-title">
            <Bot size={24} />
            <h2>{cloneFrom ? 'Clona Agente' : 'Nuovo Agente'}</h2>
          </div>
          <button
            className="new-agent-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="new-agent-modal-content">
          {errors.general && (
            <div className="new-agent-modal-error">
              {errors.general}
            </div>
          )}

          {/* Titolo */}
          <div className="new-agent-modal-field">
            <label htmlFor="agent-title">
              Titolo <span className="required">*</span>
            </label>
            <input
              id="agent-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="es. Implementa autenticazione Google"
              className={errors.title ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.title && (
              <div className="new-agent-modal-field-error">{errors.title}</div>
            )}
          </div>

          {/* Prompt/Istruzioni */}
          <div className="new-agent-modal-field">
            <label htmlFor="agent-prompt">
              Istruzioni all'agente <span className="required">*</span>
            </label>
            <textarea
              id="agent-prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Descrivi cosa deve fare l'agente..."
              rows={4}
              className={errors.prompt ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.prompt && (
              <div className="new-agent-modal-field-error">{errors.prompt}</div>
            )}
          </div>

          <ExactPromptCheckbox
            checked={formData.exact_prompt}
            onChange={(checked) => setFormData(prev => ({ ...prev, exact_prompt: checked }))}
            disabled={isLoading}
            id="agent-exact-prompt"
          />

          {/* Branch */}
          <div className="new-agent-modal-field">
            <label htmlFor="agent-branch">Branch (opzionale)</label>
            <select
              id="agent-branch"
              value={formData.branch_id || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                branch_id: e.target.value ? parseInt(e.target.value) : null 
              }))}
              disabled={isLoading}
            >
              <option value="">-- Nessun branch specifico --</option>
              {activeBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {errors.branch_id && (
              <div className="new-agent-modal-field-error">{errors.branch_id}</div>
            )}
          </div>

          <p className="new-agent-modal-hint">
            La lavorazione verrà aggiunta in coda. Se nessun altro agente è in esecuzione, partirà automaticamente.
          </p>

          {/* Actions */}
          <div className="new-agent-modal-actions">
            <button
              type="button"
              className="new-agent-modal-btn secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="new-agent-modal-btn primary"
              disabled={isLoading || !formData.title.trim() || !formData.prompt.trim()}
            >
              {isLoading ? <Loader2 size={16} /> : <Bot size={16} />}
              {isLoading ? 'Creazione...' : 'Aggiungi in coda'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewAgentModal;