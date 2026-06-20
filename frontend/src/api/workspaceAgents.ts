import apiClient from './client';
import type { WorkspaceAgent } from '../types/workspace';

type AgentApiResponse<T> = { success: boolean; data: T; message?: string };

/**
 * API Workspace Agents: gestisce gli agenti AI dei progetti workspace developer.
 */
export const workspaceAgentsApi = {
  /**
   * GET /api/workspace/developer/projects/:id/agents
   */
  getProjectAgents: async (
    projectId: number,
    options?: { onlyTrashed?: boolean; includeTrashed?: boolean }
  ): Promise<WorkspaceAgent[]> => {
    const params = new URLSearchParams();
    if (options?.onlyTrashed) params.set('only_trashed', '1');
    if (options?.includeTrashed) params.set('include_trashed', '1');
    const query = params.toString();

    const response = await apiClient.get<AgentApiResponse<WorkspaceAgent[]> | WorkspaceAgent[]>(
      `/workspace/developer/projects/${projectId}/agents${query ? `?${query}` : ''}`
    );

    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload.success) throw new Error('Failed to fetch workspace agents');
    return payload.data || [];
  },

  /**
   * POST /api/workspace/developer/projects/:id/agents
   */
  createAgent: async (
    projectId: number,
    data: { title: string; prompt: string; exact_prompt?: boolean; branch_id?: number }
  ): Promise<WorkspaceAgent> => {
    const response = await apiClient.post<AgentApiResponse<WorkspaceAgent> | WorkspaceAgent>(
      `/workspace/developer/projects/${projectId}/agents`,
      data
    );

    const payload = response.data;
    if ('success' in payload) {
      if (!payload.success) throw new Error('Failed to create workspace agent');
      return payload.data;
    }
    return payload;
  },

  /**
   * GET /api/workspace/developer/projects/:id/agents/:agentId
   */
  getAgent: async (projectId: number, agentId: number): Promise<WorkspaceAgent> => {
    const response = await apiClient.get<AgentApiResponse<WorkspaceAgent> | WorkspaceAgent>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}`
    );

    const payload = response.data;
    if ('success' in payload) {
      if (!payload.success) throw new Error('Failed to fetch workspace agent');
      return payload.data;
    }
    return payload;
  },

  /**
   * PUT /api/workspace/developer/projects/:id/agents/:agentId
   */
  updateAgent: async (
    projectId: number,
    agentId: number,
    data: Partial<Pick<WorkspaceAgent, 'title' | 'prompt' | 'review_message'>>
  ): Promise<WorkspaceAgent> => {
    const response = await apiClient.put<AgentApiResponse<WorkspaceAgent> | WorkspaceAgent>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}`,
      data
    );

    const payload = response.data;
    if ('success' in payload) {
      if (!payload.success) throw new Error('Failed to update workspace agent');
      return payload.data;
    }
    return payload;
  },

  /**
   * PUT /api/workspace/developer/projects/:id/agents/queue/reorder
   */
  reorderQueue: async (projectId: number, agentIds: number[]): Promise<WorkspaceAgent[]> => {
    const response = await apiClient.put<AgentApiResponse<WorkspaceAgent[]>>(
      `/workspace/developer/projects/${projectId}/agents/queue/reorder`,
      { agent_ids: agentIds }
    );
    if (!response.data.success) throw new Error('Failed to reorder workspace agent queue');
    return response.data.data || [];
  },

  /**
   * POST /api/workspace/developer/projects/:id/agents/:agentId/actions
   */
  agentAction: async (
    projectId: number,
    agentId: number,
    action: 'start' | 'stop' | 'restart' | 'complete' | 'request_review',
    options?: { review_message?: string }
  ): Promise<WorkspaceAgent> => {
    const response = await apiClient.post<AgentApiResponse<WorkspaceAgent> | WorkspaceAgent>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}/actions`,
      { action, review_message: options?.review_message }
    );

    const payload = response.data;
    if ('success' in payload) {
      if (!payload.success) throw new Error('Failed to execute agent action');
      return payload.data;
    }
    return payload;
  },

  /**
   * POST /api/workspace/developer/projects/:id/agents/:agentId/trash
   */
  trashAgent: async (projectId: number, agentId: number): Promise<WorkspaceAgent> => {
    const response = await apiClient.post<AgentApiResponse<WorkspaceAgent>>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}/trash`
    );
    if (!response.data.success) throw new Error('Failed to trash workspace agent');
    return response.data.data;
  },

  /**
   * POST /api/workspace/developer/projects/:id/agents/:agentId/restore
   */
  restoreAgent: async (projectId: number, agentId: number): Promise<WorkspaceAgent> => {
    const response = await apiClient.post<AgentApiResponse<WorkspaceAgent>>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}/restore`
    );
    if (!response.data.success) throw new Error('Failed to restore workspace agent');
    return response.data.data;
  },

  /**
   * DELETE /api/workspace/developer/projects/:id/agents/:agentId/force
   */
  forceDeleteAgent: async (projectId: number, agentId: number): Promise<void> => {
    const response = await apiClient.delete<AgentApiResponse<null>>(
      `/workspace/developer/projects/${projectId}/agents/${agentId}/force`
    );
    if (!response.data.success) throw new Error('Failed to permanently delete workspace agent');
  },

  /**
   * GET /api/workspace/developer/projects/:id/orchestrator
   * Restituisce i messaggi dell'orchestratore AI per il progetto.
   */
  getOrchestratorMessages: async (projectId: number): Promise<import('../types/workspace').OrchestratorMessage[]> => {
    const response = await apiClient.get<AgentApiResponse<import('../types/workspace').OrchestratorMessage[]>>(
      `/workspace/developer/projects/${projectId}/orchestrator`
    );
    if (!response.data.success) throw new Error('Failed to fetch orchestrator messages');
    return response.data.data ?? [];
  },

  /**
   * POST /api/workspace/developer/projects/:id/orchestrator
   * Invia un messaggio all'orchestratore e ottiene la risposta.
   */
  createOrchestratorMessage: async (
    projectId: number,
    message: string
  ): Promise<import('../types/workspace').OrchestratorMessage> => {
    const response = await apiClient.post<AgentApiResponse<import('../types/workspace').OrchestratorMessage>>(
      `/workspace/developer/projects/${projectId}/orchestrator`,
      { message }
    );
    if (!response.data.success) throw new Error('Failed to send orchestrator message');
    return response.data.data;
  },

  /**
   * GET /api/workspace/developer/projects/:id/artifacts
   * Restituisce gli artefatti generati per il progetto.
   */
  getArtifacts: async (projectId: number): Promise<import('../types/workspace').Artifact[]> => {
    const response = await apiClient.get<AgentApiResponse<import('../types/workspace').Artifact[]>>(
      `/workspace/developer/projects/${projectId}/artifacts`
    );
    if (!response.data.success) throw new Error('Failed to fetch artifacts');
    return response.data.data ?? [];
  },
};

// ─── Coda agenti centralizzata ──────────────────────────────────────────────

export interface AgentQueueItem {
  type: 'crm_task' | 'workspace_agent';
  id: number;
  title: string;
  status: string;
  queue_position: number | null;
  is_stale: boolean;
  stale_minutes: number;
  n8n_execution_id: string | null;
  n8n_error: string | null;
  project_id: number;
  project_name: string;
  crm_task_id?: number | null;
  crm_task_title?: string | null;
  updated_at: string;
  created_at: string;
  url: string;
}

export interface AgentQueueData {
  items: AgentQueueItem[];
  total: number;
  stale_count: number;
  blocked_count: number;
  n8n_enabled: boolean;
  stale_threshold_minutes: number;
}

export const agentQueueApi = {
  /** GET /api/agent-queue */
  getQueue: async (): Promise<AgentQueueData> => {
    const response = await apiClient.get<AgentApiResponse<AgentQueueData>>('/agent-queue');
    if (!response.data.success) throw new Error('Failed to fetch agent queue');
    return response.data.data;
  },

  /** POST /api/agent-queue/reset-stuck */
  resetStuck: async (): Promise<{ reset_count: number }> => {
    const response = await apiClient.post<AgentApiResponse<{ reset_count: number }>>('/agent-queue/reset-stuck');
    if (!response.data.success) throw new Error(response.data.message ?? 'Failed to reset stuck jobs');
    return response.data.data;
  },

  /** POST /api/agent-queue/force-dispatch/:projectId */
  forceDispatch: async (projectId: number): Promise<void> => {
    const response = await apiClient.post<AgentApiResponse<null>>(`/agent-queue/force-dispatch/${projectId}`);
    if (!response.data.success) throw new Error(response.data.message ?? 'Failed to force dispatch');
  },

  /** POST /api/agent-queue/cancel-item */
  cancelItem: async (type: 'crm_task' | 'workspace_agent', id: number): Promise<void> => {
    const response = await apiClient.post<AgentApiResponse<null>>('/agent-queue/cancel-item', { type, id });
    if (!response.data.success) throw new Error(response.data.message ?? 'Failed to cancel item');
  },
};
