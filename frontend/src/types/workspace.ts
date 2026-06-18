export type WorkspaceTypeCode = 'developer'; // estendibile

export interface WorkspaceType {
  code: WorkspaceTypeCode;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface UserWorkspacePreference {
  workspace_type_code: WorkspaceTypeCode;
  settings?: Record<string, unknown>;
}

export interface WorkspaceProject {
  id: number;
  name: string;
  status: string;
  manager_id: number | null;
  is_project_manager: boolean;
  workspace_settings: {
    staging_url: string | null;
    preview_url: string | null;
    is_enabled: boolean;
  } | null;
  branches_count: number;
  active_agents_count: number;
  open_tasks_count: number;
  progress: number;
  cover_photo: string | null;
  github_url: string | null;
  updated_at: string;
}

export interface WorkspaceBranch {
  id: number;
  project_id: number;
  workspace_type_code: string;
  name: string;
  description: string | null;
  git_branch: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export type WorkspaceAgentStatus = 'pending' | 'running' | 'review' | 'completed' | 'failed' | 'stopped';

export interface WorkspaceAgent {
  id: number;
  project_id: number;
  branch_id: number | null;
  user_id: number;
  title: string;
  prompt: string;
  exact_prompt?: boolean;
  status: WorkspaceAgentStatus;
  n8n_execution_id: string | null;
  queue_position?: number | null;
  logs: string | null;
  result: string | null;
  review_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  branch?: WorkspaceBranch;
}

export type WorkspaceTaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type WorkspaceTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkspaceUserTask {
  id: number;
  project_id: number;
  branch_id: number | null;
  user_id: number;
  title: string;
  description: string | null;
  status: WorkspaceTaskStatus;
  priority: WorkspaceTaskPriority;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  branch?: WorkspaceBranch;
}