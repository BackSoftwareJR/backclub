export type WorkspaceTypeCode =
  | 'developer'
  | 'organic_web'
  | 'social_media'
  | 'video_grafica'
  | 'intelligence_marketing';

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
  crm_task_id?: number | null;
  crm_task?: {
    id: number;
    title: string;
    status: string;
    n8n_status: string | null;
    priority: string;
    progress: number;
    url: string;
  } | null;
  title: string;
  prompt: string;
  exact_prompt?: boolean;
  status: WorkspaceAgentStatus;
  flow_type?: string | null;
  sub_agent_role?: string | null;
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
  /** null = active task; positive integer = archived in a completion snapshot */
  completion_group_id: number | null;
  branch?: WorkspaceBranch;
}

/* ── Senior Care AI Architecture ── */

export type AgentFlowType = 'minor' | 'major' | 'onboarding';

export type SubAgentRole =
  | 'consulente_aziendale'
  | 'scrittore_creativo'
  | 'consulente_seo'
  | 'pianificatore_marketing'
  | 'consulente_legale'
  | 'comunicazione_clienti'
  | 'vendite_prospezione';

export interface Artifact {
  id: string;
  type: 'markdown' | 'task' | 'prompt' | 'brand_book';
  title: string;
  content: string;
  created_at: string;
}

export interface OrchestratorMessage {
  id: string;
  role: 'user' | 'orchestrator' | 'subagent';
  content: string;
  flow_type?: AgentFlowType;
  sub_agent?: SubAgentRole;
  artifacts?: Artifact[];
  created_at: string;
}

export interface BrandBook {
  primary_color: string;
  secondary_color: string;
  tone_of_voice: string;
  keywords: string[];
  avoid_words: string[];
}

export interface SeniorCareProject extends WorkspaceProject {
  brand_book?: BrandBook | null;
  onboarding_completed?: boolean;
  tech_stack?: 'html_static' | 'react' | 'laravel' | null;
  care_values?: string[];
  target_audience?: string[];
}