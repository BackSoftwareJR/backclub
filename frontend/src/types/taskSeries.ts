import type { TaskExecutionMode } from '../api/crmProjects';

export type TaskSeriesStep = 'upload' | 'processing' | 'review' | 'confirm';

export type TaskSeriesInputMode = 'file' | 'text';

export type TaskSeriesSourceType = 'file' | 'text';

export interface TaskSeriesAnalyzedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  execution_mode_suggestion: TaskExecutionMode;
  estimated_hours: number;
  suggested_due_offset_days: number;
  source_section: string;
}

export interface TaskSeriesAnalysisResult {
  series_title: string;
  summary: string;
  source_type: TaskSeriesSourceType;
  source_filename: string;
  extracted_text_preview: string;
  tasks: TaskSeriesAnalyzedTask[];
}

export interface TaskSeriesAssignment {
  user_id?: number;
  payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
  hourly_rate_cocchi?: number;
  hours_requested?: number;
  task_rate_cocchi?: number;
  project_rate_cocchi?: number;
}

export interface TaskSeriesReviewRow {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  execution_mode: TaskExecutionMode;
  exact_prompt: boolean;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  due_date: string;
  estimated_hours: number;
  source_section: string;
  assignments: TaskSeriesAssignment[];
}

export interface TaskSeriesCreatePayload {
  series_title: string;
  create_parent_task: boolean;
  dispatch_agents: boolean;
  tasks: Array<{
    title: string;
    description?: string;
    execution_mode: TaskExecutionMode;
    exact_prompt?: boolean;
    status?: string;
    priority: string;
    start_date?: string;
    due_date?: string;
    estimated_hours?: number;
    selected: boolean;
    assignments?: TaskSeriesAssignment[];
  }>;
}

export interface TaskSeriesCreateResult {
  parent_task_id: number | null;
  task_ids: number[];
  count: number;
}

export const STEP_LABELS = ['Carica', 'Analisi', 'Revisione', 'Conferma'] as const;

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.txt'];
export const MAX_FILE_SIZE_MB = 10;
export const MIN_ANALYSIS_TEXT_LENGTH = 50;

export function offsetDaysToDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function analyzedToReviewRow(task: TaskSeriesAnalyzedTask, index: number): TaskSeriesReviewRow {
  return {
    id: `row-${index}-${Date.now()}`,
    selected: true,
    title: task.title,
    description: task.description,
    execution_mode: task.execution_mode_suggestion || 'human',
    exact_prompt: false,
    status: 'pending',
    priority: task.priority,
    start_date: new Date().toISOString().split('T')[0],
    due_date: offsetDaysToDate(task.suggested_due_offset_days),
    estimated_hours: task.estimated_hours,
    source_section: task.source_section,
    assignments: [],
  };
}

export function newEmptyReviewRow(): TaskSeriesReviewRow {
  return {
    id: `row-manual-${Date.now()}`,
    selected: true,
    title: '',
    description: '',
    execution_mode: 'human',
    exact_prompt: false,
    status: 'pending',
    priority: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    due_date: offsetDaysToDate(7),
    estimated_hours: 2,
    source_section: 'Manuale',
    assignments: [],
  };
}
