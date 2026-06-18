import axios from 'axios';
import apiClient from './client';
import type {
  UserWorkspacePreference,
  WorkspaceTypeCode,
  WorkspaceProject,
  WorkspaceBranch,
} from '../types/workspace';

/**
 * API Workspace: gestisce le preferenze dell'utente e i progetti workspace developer.
 */
export const workspaceApi = {
  /**
   * GET /api/workspace/preferences
   * Ottiene le preferenze workspace dell'utente corrente.
   */
  getWorkspacePreferences: async (): Promise<UserWorkspacePreference | null> => {
    const response = await apiClient.get<{ success: boolean; data: UserWorkspacePreference | null }>('/workspace/preferences');
    if (!response.data.success) throw new Error('Failed to fetch workspace preferences');
    return response.data.data;
  },

  /**
   * PUT /api/workspace/preferences
   * Aggiorna le preferenze workspace dell'utente corrente.
   */
  updateWorkspacePreferences: async (data: { workspace_type_code: WorkspaceTypeCode }): Promise<UserWorkspacePreference> => {
    const response = await apiClient.put<{ success: boolean; data: UserWorkspacePreference }>('/workspace/preferences', data);
    if (!response.data.success) throw new Error('Failed to update workspace preferences');
    return response.data.data;
  },

  /**
   * GET /api/workspace/developer/projects
   * Ottiene tutti i progetti workspace developer dell'utente.
   */
  getWorkspaceProjects: async (): Promise<WorkspaceProject[]> => {
    const response = await apiClient.get<{ success: boolean; data: WorkspaceProject[] }>('/workspace/developer/projects');
    if (!response.data.success) throw new Error('Failed to fetch workspace projects');
    return response.data.data || [];
  },

  /**
   * GET /api/workspace/developer/projects/:id
   * Ottiene un progetto specifico con i suoi branch.
   */
  getWorkspaceProject: async (id: number): Promise<WorkspaceProject & { branches: WorkspaceBranch[] }> => {
    const response = await apiClient.get<{ success: boolean; data: WorkspaceProject & { branches: WorkspaceBranch[] } }>(`/workspace/developer/projects/${id}`);
    if (!response.data.success) throw new Error('Failed to fetch workspace project');
    return response.data.data;
  },

  /**
   * GET /api/workspace/developer/projects/:id/branches
   * Ottiene i branch di un progetto specifico.
   */
  getWorkspaceBranches: async (projectId: number): Promise<WorkspaceBranch[]> => {
    const response = await apiClient.get<{ success: boolean; data: WorkspaceBranch[] }>(`/workspace/developer/projects/${projectId}/branches`);
    if (!response.data.success) throw new Error('Failed to fetch workspace branches');
    return response.data.data || [];
  },

  /**
   * POST /api/workspace/developer/projects/:id/publish
   * Merge staging → main su GitHub.
   */
  publishProject: async (projectId: number): Promise<{
    status: string;
    message: string;
    pull_request_number?: number;
    merge_sha?: string | null;
    html_url?: string;
  }> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: {
          status: string;
          message: string;
          pull_request_number?: number;
          merge_sha?: string | null;
          html_url?: string;
        };
        message?: string;
      }>(`/workspace/developer/projects/${projectId}/publish`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Pubblicazione fallita');
      }

      return response.data.data!;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as { message?: string };
        if (data.message) throw new Error(data.message);
      }
      throw err;
    }
  },
};