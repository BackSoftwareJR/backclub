import apiClient from './client';
import type { WorkspaceUserTask, WorkspaceTaskPriority } from '../types/workspace';

/**
 * API Workspace Tasks: gestisce le task personali dell'utente nei progetti workspace developer.
 */
export const workspaceTasksApi = {
  /**
   * GET /api/workspace/developer/projects/:id/tasks
   * Ottiene tutte le task di un progetto specifico assegnate all'utente corrente.
   */
  getWorkspaceTasks: async (projectId: number): Promise<WorkspaceUserTask[]> => {
    const response = await apiClient.get<{ success: boolean; data: WorkspaceUserTask[] }>(`/workspace/developer/projects/${projectId}/tasks`);
    if (!response.data.success) throw new Error('Failed to fetch workspace tasks');
    return response.data.data || [];
  },

  /**
   * POST /api/workspace/developer/projects/:id/tasks
   * Crea una nuova task per un progetto.
   */
  createWorkspaceTask: async (
    projectId: number,
    data: {
      title: string;
      description?: string;
      priority?: WorkspaceTaskPriority;
      branch_id?: number;
      due_date?: string;
    }
  ): Promise<WorkspaceUserTask> => {
    const response = await apiClient.post<{ success: boolean; data: WorkspaceUserTask }>(`/workspace/developer/projects/${projectId}/tasks`, data);
    if (!response.data.success) throw new Error('Failed to create workspace task');
    return response.data.data;
  },

  /**
   * PUT /api/workspace/developer/projects/:id/tasks/:taskId
   * Aggiorna una task esistente.
   */
  updateWorkspaceTask: async (
    projectId: number,
    taskId: number,
    data: Partial<WorkspaceUserTask>
  ): Promise<WorkspaceUserTask> => {
    const response = await apiClient.put<{ success: boolean; data: WorkspaceUserTask }>(`/workspace/developer/projects/${projectId}/tasks/${taskId}`, data);
    if (!response.data.success) throw new Error('Failed to update workspace task');
    return response.data.data;
  },
};