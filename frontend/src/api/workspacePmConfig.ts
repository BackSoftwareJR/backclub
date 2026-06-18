import apiClient from './client';
import type { WorkspaceBranch } from '../types/workspace';

export interface WorkspaceProjectSettings {
  workspace_type_code: string;
  is_enabled: boolean;
  staging_url: string | null;
  preview_url: string | null;
  settings: Record<string, unknown> | null;
}

export interface BranchWithRoles extends WorkspaceBranch {
  roles: Array<{ id: number; branch_id: number; role: string }>;
}

export interface WorkspaceProjectConfig {
  settings: WorkspaceProjectSettings[];
  branches: BranchWithRoles[];
}

/**
 * Get workspace configuration for a CRM project
 */
export const getProjectWorkspaceConfig = async (projectId: number): Promise<WorkspaceProjectConfig> => {
  const response = await apiClient.get<{ success: boolean; data: WorkspaceProjectConfig }>(`/crm-projects/${projectId}/workspace-settings`);
  if (!response.data.success) throw new Error('Failed to fetch workspace config');
  return response.data.data;
};

/**
 * Update workspace settings for a CRM project
 */
export const updateProjectWorkspaceSettings = async (
  projectId: number,
  data: { workspace_type_code: string; is_enabled: boolean; staging_url?: string; preview_url?: string }
): Promise<WorkspaceProjectSettings> => {
  const response = await apiClient.put<{ success: boolean; data: WorkspaceProjectSettings }>(`/crm-projects/${projectId}/workspace-settings`, data);
  if (!response.data.success) throw new Error('Failed to update workspace settings');
  return response.data.data;
};

/**
 * Create a new branch for a CRM project
 */
export const createProjectBranch = async (
  projectId: number,
  data: { name: string; description?: string; git_branch?: string; color?: string; workspace_type_code: string; roles?: string[] }
): Promise<BranchWithRoles> => {
  const response = await apiClient.post<{ success: boolean; data: BranchWithRoles }>(`/crm-projects/${projectId}/workspace-branches`, data);
  if (!response.data.success) throw new Error('Failed to create branch');
  return response.data.data;
};

/**
 * Update a branch for a CRM project
 */
export const updateProjectBranch = async (
  projectId: number,
  branchId: number,
  data: Partial<{ name: string; description: string; git_branch: string; color: string; roles: string[] }>
): Promise<BranchWithRoles> => {
  const response = await apiClient.put<{ success: boolean; data: BranchWithRoles }>(`/crm-projects/${projectId}/workspace-branches/${branchId}`, data);
  if (!response.data.success) throw new Error('Failed to update branch');
  return response.data.data;
};

/**
 * Delete a branch for a CRM project
 */
export const deleteProjectBranch = async (projectId: number, branchId: number): Promise<void> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${projectId}/workspace-branches/${branchId}`);
  if (!response.data.success) throw new Error('Failed to delete branch');
};