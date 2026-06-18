import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  Edit3,
  Save,
  MessageSquare,
  Copy,
  Loader2,
  Clock,
  Calendar,
  Hash
} from 'lucide-react';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import type { WorkspaceAgent, WorkspaceBranch, WorkspaceAgentStatus } from '../../../types/workspace';
import './AgentDetailDrawer.css';

interface AgentDetailDrawerProps {
  agent: WorkspaceAgent;
  projectId: number;
  branches: WorkspaceBranch[];
  onClose: () => void;
  onAgentUpdated: (agent: WorkspaceAgent) => void;
}

const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  agent,
  projectId,
  onClose,
  onAgentUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: agent.title,
    prompt: agent.prompt,
    review_message: agent.review_message || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStatusConfig = (status: WorkspaceAgentStatus) => {
    const configs = {
      pending: { color: '#8E8E93', label: 'In attesa', pulse: false },
      running: { color: '#0A84FF', label: 'In esecuzione', pulse: true },
      review: { color: '#FF9F0A', label: 'In revisione', pulse: false },
      completed: { color: '#34C759', label: 'Completato', pulse: false },
      failed: { color: '#FF3B30', label: 'Fallito', pulse: false },
      stopped: { color: '#8E8E93', label: 'Fermato', pulse: false },
    };
    return configs[status] || configs.pending;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedAgent = await workspaceAgentsApi.updateAgent(projectId, agent.id, editData);
      onAgentUpdated(updatedAgent);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update agent:', err);
      alert('Errore nel salvare le modifiche');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'complete') => {
    try {
      setActionLoading(action);
      const updatedAgent = await workspaceAgentsApi.agentAction(projectId, agent.id, action);
      onAgentUpdated(updatedAgent);
    } catch (err) {
      console.error(`Failed to ${action} agent:`, err);
      alert(`Errore nell'eseguire l'azione: ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReview = async () => {
    if (!editData.review_message.trim()) {
      alert('Inserisci un messaggio di review');
      return;
    }

    try {
      setActionLoading('review');
      // Prima aggiorna il review_message
      await workspaceAgentsApi.updateAgent(projectId, agent.id, {
        review_message: editData.review_message
      });
      
      // Poi riavvia l'agente
      const restartedAgent = await workspaceAgentsApi.agentAction(projectId, agent.id, 'restart');
      onAgentUpdated(restartedAgent);
      
      // Reset del messaggio
      setEditData(prev => ({ ...prev, review_message: '' }));
    } catch (err) {
      console.error('Failed to send review:', err);
      alert('Errore nell\'invio della review');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClone = () => {
    // TODO: Integrate with NewAgentModal to pre-populate data
    alert('Funzionalità di clonazione verrà implementata nel NewAgentModal');
  };

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'N/D';
    return new Date(timestamp).toLocaleString('it-IT');
  };

  const formatLogs = (logs: string | null): string => {
    if (!logs) return 'Nessun log disponibile';
    
    try {
      // Try to parse as JSON if it looks like JSON
      if (logs.trim().startsWith('[') || logs.trim().startsWith('{')) {
        const parsed = JSON.parse(logs);
        if (Array.isArray(parsed)) {
          return parsed.join('\n');
        }
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Fall through to string handling
    }
    
    return logs;
  };

  const formatResult = (result: string | null): string => {
    if (!result) return 'Nessun risultato disponibile';
    
    try {
      if (result.trim().startsWith('{') || result.trim().startsWith('[')) {
        const parsed = JSON.parse(result);
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Fall through to string handling
    }
    
    return result;
  };

  const statusConfig = getStatusConfig(agent.status);

  return (
    <div className="agent-detail-drawer-overlay">
      <div className="agent-detail-drawer">
        {/* Header */}
        <div className="agent-detail-header">
          <div className="agent-detail-title-section">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className="agent-detail-title-input"
                placeholder="Titolo agente..."
              />
            ) : (
              <h2>{agent.title}</h2>
            )}
            
            <div className="agent-detail-header-meta">
              <div 
                className={`agent-detail-status-badge ${statusConfig.pulse ? 'pulse' : ''}`}
                style={{ backgroundColor: statusConfig.color }}
              >
                {statusConfig.label}
              </div>
              
              {agent.branch && (
                <div className="agent-detail-branch">
                  {agent.branch.name}
                </div>
              )}
            </div>
          </div>
          
          <div className="agent-detail-header-actions">
            {isEditing ? (
              <>
                <button
                  className="agent-detail-action-btn secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      title: agent.title,
                      prompt: agent.prompt,
                      review_message: agent.review_message || ''
                    });
                  }}
                  disabled={isSaving}
                >
                  Annulla
                </button>
                <button
                  className="agent-detail-action-btn primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} /> : <Save size={16} />}
                  Salva
                </button>
              </>
            ) : (
              <>
                {(agent.status === 'pending' || agent.status === 'stopped') && (
                  <button
                    className="agent-detail-action-btn secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 size={16} />
                    Modifica
                  </button>
                )}
                
                {/* Main action based on status */}
                {agent.status === 'pending' && (
                  <button
                    className="agent-detail-action-btn primary"
                    onClick={() => handleAction('start')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'start' ? <Loader2 size={16} /> : <Play size={16} />}
                    Avvia
                  </button>
                )}
                
                {agent.status === 'running' && (
                  <button
                    className="agent-detail-action-btn danger"
                    onClick={() => handleAction('stop')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'stop' ? <Loader2 size={16} /> : <Square size={16} />}
                    Stop
                  </button>
                )}
                
                {(agent.status === 'failed' || agent.status === 'stopped') && (
                  <button
                    className="agent-detail-action-btn primary"
                    onClick={() => handleAction('restart')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'restart' ? <Loader2 size={16} /> : <RotateCcw size={16} />}
                    Riavvia
                  </button>
                )}
                
                {agent.status === 'review' && (
                  <button
                    className="agent-detail-action-btn success"
                    onClick={() => handleAction('complete')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'complete' ? <Loader2 size={16} /> : <CheckCircle size={16} />}
                    Completa
                  </button>
                )}
                
                {(agent.status === 'completed' || agent.status === 'failed') && (
                  <button
                    className="agent-detail-action-btn secondary"
                    onClick={handleClone}
                  >
                    <Copy size={16} />
                    Clona
                  </button>
                )}
              </>
            )}
            
            <button
              className="agent-detail-close-btn"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="agent-detail-content">
          {/* Prompt Section */}
          <div className="agent-detail-section">
            <h3>Istruzioni all'agente</h3>
            {isEditing ? (
              <textarea
                value={editData.prompt}
                onChange={(e) => setEditData(prev => ({ ...prev, prompt: e.target.value }))}
                className="agent-detail-textarea"
                rows={6}
                placeholder="Descrivi cosa deve fare l'agente sul progetto..."
              />
            ) : (
              <div className="agent-detail-content-text">
                {agent.prompt}
              </div>
            )}
          </div>

          {/* Review Message Section */}
          {(agent.status === 'review' || editData.review_message || agent.review_message) && (
            <div className="agent-detail-section">
              <h3>Messaggio di review / istruzioni aggiuntive</h3>
              <textarea
                value={editData.review_message}
                onChange={(e) => setEditData(prev => ({ ...prev, review_message: e.target.value }))}
                className="agent-detail-textarea"
                rows={3}
                placeholder="Inserisci feedback o istruzioni aggiuntive per l'agente..."
              />
              {agent.status === 'review' && (
                <button
                  className="agent-detail-send-review-btn"
                  onClick={handleSendReview}
                  disabled={!editData.review_message.trim() || !!actionLoading}
                >
                  {actionLoading === 'review' ? <Loader2 size={16} /> : <MessageSquare size={16} />}
                  Invia review e riavvia
                </button>
              )}
            </div>
          )}

          {/* Logs Section */}
          {agent.logs && (
            <div className="agent-detail-section">
              <h3>Log dell'agente</h3>
              <div className="agent-detail-logs">
                <pre>{formatLogs(agent.logs)}</pre>
              </div>
            </div>
          )}

          {/* Result Section */}
          {agent.result && agent.status === 'completed' && (
            <div className="agent-detail-section">
              <h3>Risultato finale</h3>
              <div className="agent-detail-result">
                <pre>{formatResult(agent.result)}</pre>
              </div>
            </div>
          )}

          {/* Metadata Section */}
          <div className="agent-detail-section">
            <h3>Metadati</h3>
            <div className="agent-detail-metadata">
              <div className="agent-detail-metadata-item">
                <Calendar size={16} />
                <div>
                  <strong>Creato:</strong>
                  <span>{formatTimestamp(agent.created_at)}</span>
                </div>
              </div>
              
              {agent.started_at && (
                <div className="agent-detail-metadata-item">
                  <Clock size={16} />
                  <div>
                    <strong>Avviato:</strong>
                    <span>{formatTimestamp(agent.started_at)}</span>
                  </div>
                </div>
              )}
              
              {agent.completed_at && (
                <div className="agent-detail-metadata-item">
                  <CheckCircle size={16} />
                  <div>
                    <strong>Completato:</strong>
                    <span>{formatTimestamp(agent.completed_at)}</span>
                  </div>
                </div>
              )}
              
              {agent.n8n_execution_id && (
                <div className="agent-detail-metadata-item">
                  <Hash size={16} />
                  <div>
                    <strong>Execution ID:</strong>
                    <span className="agent-detail-execution-id">{agent.n8n_execution_id}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetailDrawer;