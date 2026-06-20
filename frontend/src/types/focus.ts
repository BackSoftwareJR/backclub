export type CognitiveLoad = 'deep_work' | 'creative' | 'repetitive' | 'meetings' | 'admin';
export type DeadlineType = 'hard' | 'soft' | 'none';
export type FocusTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type SlotType = 'task' | 'break' | 'buffer' | 'lunch';

export interface FocusTask {
  id: number;
  title: string;
  description?: string;
  cognitive_load: CognitiveLoad;
  deadline_type: DeadlineType;
  due_date?: string;
  week_plan_date?: string;
  estimated_minutes: number;
  priority_score: number;
  priority?: 'high' | 'medium' | 'low';
  status: FocusTaskStatus;
  tags?: string[];
  project_name?: string;
  project_id?: number;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FocusSessionSlot {
  id: number;
  slot_type: SlotType;
  title: string;
  start_time: string; // "HH:MM"
  end_time: string;
  duration_minutes: number;
  is_completed: boolean;
  focus_task_id?: number;
  task?: FocusTask;
  notes?: string;
  sort_order: number;
}

export interface FocusSession {
  id: number;
  session_date: string;
  status: 'draft' | 'active' | 'completed';
  slots: FocusSessionSlot[];
  total_estimated_minutes: number;
  completed_tasks_count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggested_replies?: string[];
}

export interface TodaySessionResponse {
  session: FocusSession;
  slots: FocusSessionSlot[];
  tasks: FocusTask[];
}

export interface CompleteTaskPayload {
  actual_minutes: number;
  mental_fatigue: 1 | 2 | 3 | 4 | 5;
}

export interface ChatPayload {
  message: string;
  session_id: number | null;
}

export interface ChatResponse {
  response: string;
  intent?: string;
  session_updated?: boolean;
  session?: FocusSession;
  suggested_replies?: string[];
  priority_action?: {
    action: 'set_priority';
    task_title: string;
    priority: 'high' | 'medium' | 'low';
  } | null;
}

export type AgendaItemSource = 'focus_task' | 'crm_task' | 'crm_pm_task' | 'workspace_task' | 'calendar_event';

export interface AgendaItem {
  id: string;
  source: AgendaItemSource;
  title: string;
  due_date?: string;
  due_time?: string;
  estimated_minutes: number;
  priority?: string;
  priority_score?: number;
  cognitive_load: CognitiveLoad;
  status: string;
  project_name?: string;
  color: string;
}

export interface AgendaResponse {
  view: 'day' | 'week';
  date: string;
  items: AgendaItem[];
  slots: FocusSessionSlot[];
}

export type CognitiveMoment = 'deep_work' | 'creative' | 'repetitive' | 'meetings' | 'admin';

export interface UserFocusPreferences {
  id?: number;
  user_id?: number;
  preferred_start_time: string;
  preferred_end_time: string;
  max_daily_hours: number;
  lunch_break_enabled: boolean;
  lunch_start_time: string;
  lunch_duration_minutes: number;
  preferred_focus_block_duration: number;
  break_between_focus_blocks: number;
  working_days: number[];
  preferred_cognitive_morning: CognitiveMoment;
  preferred_cognitive_afternoon: CognitiveMoment;
  rest_reminder_enabled: boolean;
  notes?: string | null;
}

export interface AnalysisResult {
  analysis: string;
  action_items: string[];
  detected_dates: string[];
}

// ── AI Pipeline Analysis ───────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'analyzing' | 'ready' | 'stale';
export type ReportType   = 'overview' | 'project' | 'synthesis';

export interface AnalysisReport {
  id: number;
  report_type: ReportType;
  subject_name: string;
  subject_id?: number | null;
  status: ReportStatus;
  content?: {
    // overview fields
    priority_ranking?: Array<{ name: string; urgency: string; reason: string }>;
    total_workload_hours?: number;
    risk_projects?: string[];
    recommendation?: string;
    // project fields
    risk_level?: string;
    bottleneck?: string | null;
    top_3_next_tasks?: string[];
    estimated_completion_days?: number;
    notes?: string;
  };
  error_message?: string | null;
  analyzed_at?: string | null;
  expires_at?: string | null;
  sort_order: number;
}

export interface AnalysisReportsResponse {
  reports: AnalysisReport[];
}

export interface RunNextStepResponse {
  report: AnalysisReport | null;
  next_pending: AnalysisReport | null;
  has_more: boolean;
}

// ── Daily Check-in ─────────────────────────────────────────────────────────────

export interface FixedEvent {
  title: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

export interface DailyCheckin {
  id: number;
  date: string;
  energy_level: 1 | 2 | 3 | 4 | 5;
  available_hours: number;
  selected_project_ids: number[];
  fixed_events: FixedEvent[];
  special_priority: string | null;
  free_note: string | null;
}

export interface CheckinPayload {
  energy_level: 1 | 2 | 3 | 4 | 5;
  available_hours: number;
  selected_project_ids: number[];
  fixed_events: FixedEvent[];
  special_priority?: string | null;
  free_note?: string | null;
}

export interface CheckinBriefingItem {
  id: string;
  title: string;
  project_name: string | null;
  project_id: number | null;
  due_date: string | null;
  estimated_minutes: number;
  reason: string;
  reason_type: 'overdue' | 'today' | 'project' | 'priority';
  priority_score: number;
  source: string;
}

export interface CheckinBriefingProject {
  id: number;
  name: string;
  color: string;
  tasks_count: number;
  overdue_count: number;
  top_tasks: string[];
}

export interface CheckinStartOption {
  id: string;
  label: string;
}

export interface CheckinBriefing {
  greeting: string;
  intro: string;
  stats: {
    open_tasks: number;
    overdue_tasks: number;
    today_tasks: number;
    total_estimated_hours: number;
    projects_count: number;
  };
  priority_items: CheckinBriefingItem[];
  projects: CheckinBriefingProject[];
  start_options: CheckinStartOption[];
  default_hours: number;
}

// ── Project with tasks ─────────────────────────────────────────────────────────

export interface ProjectWithTasks {
  id: number;
  name: string;
  color: string;
  tasks_count: number;
  completed_tasks_count?: number;
  tasks: FocusTask[];
}

// ── Week plan ──────────────────────────────────────────────────────────────────

export interface WeekPlanDay {
  date: string;
  tasks: FocusTask[];
  total_estimated_minutes: number;
}
