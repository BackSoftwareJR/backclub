import React, { useState, useCallback } from 'react';
import { Bot, Check, GitBranch, ListOrdered, Loader2, Sparkles, X } from 'lucide-react';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import ExactPromptCheckbox from '../../../components/Tasks/ExactPromptCheckbox';
import TaskAiPanel from '../../GestioneProgetti/TaskAiPanel';
import type { WorkspaceBranch } from '../../../types/workspace';
import './NewLavorazioneComposer.css';

export interface LavorazioneComposerInitialValues {
  title?: string;
  prompt?: string;
  exact_prompt?: boolean;
  branch_id?: number | null;
}

interface NewLavorazioneComposerProps {
  projectId: number;
  branches: WorkspaceBranch[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
  initialValues?: LavorazioneComposerInitialValues;
}

const NewLavorazioneComposer: React.FC<NewLavorazioneComposerProps> = ({
  projectId,
  branches,
  onCancel,
  onCreated,
  initialValues,
}) => {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? '');
  const [exactPrompt, setExactPrompt] = useState(initialValues?.exact_prompt ?? false);
  const [branchId, setBranchId] = useState<number | null>(initialValues?.branch_id ?? null);
  const [provisionalTitle, setProvisionalTitle] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const displayTitle = provisionalTitle !== null ? provisionalTitle : title;
  const isProvisional = provisionalTitle !== null;
  const canSubmit = title.trim().length > 0 && prompt.trim().length > 0;

  const handleProvisionalTitle = useCallback((t: string | null) => {
    setProvisionalTitle(t);
  }, []);

  const handleAcceptProvisional = () => {
    if (provisionalTitle) {
      setTitle(provisionalTitle);
      setProvisionalTitle(null);
    }
  };

  const handleRejectProvisional = () => {
    setProvisionalTitle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsCreating(true);
      setError(null);
      await workspaceAgentsApi.createAgent(projectId, {
        title: title.trim(),
        prompt: prompt.trim(),
        exact_prompt: exactPrompt,
        branch_id: branchId ?? undefined,
      });
      await onCreated();
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError('Errore nella creazione della lavorazione');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="nlc-shell">
      <form className="nlc-form" onSubmit={handleSubmit}>
        <div className="nlc-form-header">
          <div className="nlc-form-header-left">
            <span className="nlc-form-icon">
              <Bot size={15} />
            </span>
            <div>
              <h3 className="nlc-form-title">Nuova lavorazione</h3>
              <p className="nlc-form-subtitle">Descrivi il lavoro — l&apos;AI ti aiuta a perfezionarlo</p>
            </div>
          </div>
          <button type="button" className="nlc-close-btn" onClick={onCancel} disabled={isCreating}>
            <X size={14} />
          </button>
        </div>

        <div className="nlc-title-zone">
          <div className="nlc-title-wrap">
            <input
              type="text"
              className={`nlc-title-input ${isProvisional ? 'provisional' : ''}`}
              value={displayTitle}
              onChange={(e) => {
                setProvisionalTitle(null);
                setTitle(e.target.value);
              }}
              placeholder="Titolo della lavorazione…"
              disabled={isCreating}
              readOnly={isProvisional}
              autoFocus
            />
            {isProvisional && (
              <div className="nlc-provisional-actions">
                <button
                  type="button"
                  className="nlc-provisional-accept"
                  onClick={handleAcceptProvisional}
                  title="Accetta questo titolo"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="nlc-provisional-reject"
                  onClick={handleRejectProvisional}
                  title="Rifiuta"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          {isProvisional && (
            <span className="nlc-provisional-hint">
              <Sparkles size={10} />
              Titolo suggerito da Groq · accetta o rifiuta
            </span>
          )}
        </div>

        <div className="nlc-prompt-zone">
          <label className="nlc-field-label" htmlFor="nlc-prompt">
            Istruzioni per l&apos;agente
          </label>
          <textarea
            id="nlc-prompt"
            className="nlc-prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Cosa deve fare l'agente? Es. implementa il form di contatto con validazione…"
            rows={4}
            disabled={isCreating}
          />
        </div>

        <div className="nlc-options-row">
          {activeBranches.length > 0 && (
            <div className="nlc-branch-field">
              <label className="nlc-field-label" htmlFor="nlc-branch">
                <GitBranch size={11} />
                Branch
              </label>
              <select
                id="nlc-branch"
                className="nlc-branch-select"
                value={branchId ?? ''}
                onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={isCreating}
              >
                <option value="">Nessun branch</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="nlc-exact-prompt">
            <ExactPromptCheckbox
              checked={exactPrompt}
              onChange={setExactPrompt}
              disabled={isCreating}
              id="nlc-exact-prompt"
            />
          </div>
        </div>

        {error && <p className="nlc-error">{error}</p>}

        <div className="nlc-footer">
          <p className="nlc-footer-hint">
            Verrà aggiunta in coda ed eseguita in sequenza
          </p>
          <div className="nlc-footer-actions">
            <button type="button" className="nlc-btn nlc-btn--ghost" onClick={onCancel} disabled={isCreating}>
              Annulla
            </button>
            <button type="submit" className="nlc-btn nlc-btn--primary" disabled={isCreating || !canSubmit}>
              {isCreating ? <Loader2 size={14} className="spin" /> : <ListOrdered size={14} />}
              {isCreating ? 'Aggiunta…' : 'Aggiungi in coda'}
            </button>
          </div>
        </div>
      </form>

      <TaskAiPanel
        title={title}
        description={prompt}
        onApply={(newTitle, newDesc) => {
          setProvisionalTitle(null);
          setTitle(newTitle);
          setPrompt(newDesc);
        }}
        onProvisionalTitle={handleProvisionalTitle}
        idleHint="Scrivi un titolo (≥3 car.) o le istruzioni (≥10 car.) per ricevere suggerimenti Groq."
        panelTitle="Suggerimenti AI"
        embedded
      />
    </div>
  );
};

export default NewLavorazioneComposer;
