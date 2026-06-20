import apiClient from './client';
import type {
  AgendaResponse,
  AnalysisReport,
  AnalysisReportsResponse,
  AnalysisResult,
  ChatPayload,
  ChatResponse,
  CheckinPayload,
  CheckinBriefing,
  CompleteTaskPayload,
  DailyCheckin,
  FocusSession,
  FocusTask,
  ProjectWithTasks,
  RunNextStepResponse,
  TodaySessionResponse,
  UserFocusPreferences,
  WeekPlanDay,
} from '../types/focus';

export const focusApi = {
  getTodaySession: async (): Promise<TodaySessionResponse> => {
    const response = await apiClient.get<{ success: boolean; data: TodaySessionResponse }>(
      '/freelance/focus/session/today'
    );
    if (!response.data.success) throw new Error('Failed to fetch today session');
    return response.data.data;
  },

  regenerateSession: async (instruction?: string): Promise<FocusSession> => {
    const response = await apiClient.post<{ success: boolean; data: FocusSession }>(
      '/freelance/focus/session/regenerate',
      instruction ? { instruction } : {}
    );
    if (!response.data.success) throw new Error('Failed to regenerate session');
    return response.data.data;
  },

  getTasks: async (): Promise<FocusTask[]> => {
    const response = await apiClient.get<{ success: boolean; data: FocusTask[] }>(
      '/freelance/focus/tasks'
    );
    if (!response.data.success) throw new Error('Failed to fetch tasks');
    return response.data.data || [];
  },

  createTask: async (payload: Partial<FocusTask>): Promise<FocusTask> => {
    const response = await apiClient.post<{ success: boolean; data: FocusTask }>(
      '/freelance/focus/tasks',
      payload
    );
    if (!response.data.success) throw new Error('Failed to create task');
    return response.data.data;
  },

  updateTask: async (id: number, payload: Partial<FocusTask>): Promise<FocusTask> => {
    const response = await apiClient.put<{ success: boolean; data: FocusTask }>(
      `/freelance/focus/tasks/${id}`,
      payload
    );
    if (!response.data.success) throw new Error('Failed to update task');
    return response.data.data;
  },

  updatePriority: async (id: number, priorityScore: number): Promise<FocusTask> => {
    const response = await apiClient.put<{ success: boolean; data: FocusTask }>(
      `/freelance/focus/tasks/${id}/priority`,
      { priority_score: priorityScore }
    );
    if (!response.data.success) throw new Error('Failed to update priority');
    return response.data.data;
  },

  /** Find or create a FocusTask wrapper for a CRM/WS agenda item (e.g. "crm_123"). */
  ensureWrapper: async (agendaItemId: string): Promise<FocusTask> => {
    const response = await apiClient.post<{ success: boolean; data: FocusTask }>(
      '/freelance/focus/tasks/wrapper',
      { agenda_item_id: agendaItemId }
    );
    if (!response.data.success) throw new Error('Failed to resolve task wrapper');
    return response.data.data;
  },

  deleteTask: async (id: number): Promise<void> => {
    await apiClient.delete(`/freelance/focus/tasks/${id}`);
  },

  completeTask: async (id: number, payload: CompleteTaskPayload): Promise<FocusTask> => {
    const response = await apiClient.post<{ success: boolean; data: FocusTask }>(
      `/freelance/focus/tasks/${id}/complete`,
      payload
    );
    if (!response.data.success) throw new Error('Failed to complete task');
    return response.data.data;
  },

  getPatterns: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(
      '/freelance/focus/patterns'
    );
    if (!response.data.success) throw new Error('Failed to fetch patterns');
    return response.data.data;
  },

  sendChat: async (payload: ChatPayload): Promise<ChatResponse> => {
    const response = await apiClient.post<{ success: boolean; data: ChatResponse }>(
      '/freelance/focus/chat',
      payload
    );
    if (!response.data.success) throw new Error('Failed to send chat message');
    return response.data.data;
  },

  getAgenda: async (params: { view: 'day' | 'week'; date: string }): Promise<AgendaResponse> => {
    const response = await apiClient.get<{ success: boolean; data: AgendaResponse }>(
      '/freelance/focus/agenda',
      { params }
    );
    if (!response.data.success) throw new Error('Failed to fetch agenda');
    return response.data.data;
  },

  getPreferences: async (): Promise<UserFocusPreferences> => {
    const response = await apiClient.get<{ success: boolean; data: UserFocusPreferences }>(
      '/freelance/focus/preferences'
    );
    if (!response.data.success) throw new Error('Failed to fetch preferences');
    return response.data.data;
  },

  savePreferences: async (data: Partial<UserFocusPreferences>): Promise<UserFocusPreferences> => {
    const response = await apiClient.post<{ success: boolean; data: UserFocusPreferences }>(
      '/freelance/focus/preferences',
      data
    );
    if (!response.data.success) throw new Error('Failed to save preferences');
    return response.data.data;
  },

  analyzeText: async (text: string, question?: string): Promise<AnalysisResult> => {
    const response = await apiClient.post<{ success: boolean; data: AnalysisResult }>(
      '/freelance/focus/analyze-text',
      { text, question }
    );
    if (!response.data.success) throw new Error('Failed to analyze text');
    return response.data.data;
  },

  getAnalysisReports: async (): Promise<AnalysisReport[]> => {
    const response = await apiClient.get<{ success: boolean; data: AnalysisReportsResponse }>(
      '/freelance/focus/analysis/reports'
    );
    if (!response.data.success) throw new Error('Failed to fetch analysis reports');
    return response.data.data.reports;
  },

  runNextAnalysisStep: async (): Promise<RunNextStepResponse> => {
    const response = await apiClient.post<{ success: boolean; data: RunNextStepResponse }>(
      '/freelance/focus/analysis/run-next'
    );
    if (!response.data.success) throw new Error('Failed to run next analysis step');
    return response.data.data;
  },

  invalidateAnalysis: async (): Promise<AnalysisReport[]> => {
    const response = await apiClient.post<{ success: boolean; data: AnalysisReportsResponse }>(
      '/freelance/focus/analysis/invalidate'
    );
    if (!response.data.success) throw new Error('Failed to invalidate analysis');
    return response.data.data.reports;
  },

  // ── Daily Check-in ─────────────────────────────────────────────────────────

  getTodayCheckin: async (): Promise<DailyCheckin | null> => {
    const response = await apiClient.get<{ success: boolean; data: DailyCheckin | null }>(
      '/freelance/focus/checkin/today'
    );
    if (!response.data.success) throw new Error('Failed to fetch today checkin');
    return response.data.data;
  },

  getCheckinBriefing: async (): Promise<CheckinBriefing> => {
    const response = await apiClient.get<{ success: boolean; data: CheckinBriefing }>(
      '/freelance/focus/checkin/briefing'
    );
    if (!response.data.success) throw new Error('Failed to fetch checkin briefing');
    return response.data.data;
  },

  storeCheckin: async (payload: CheckinPayload): Promise<DailyCheckin> => {
    const response = await apiClient.post<{ success: boolean; data: DailyCheckin }>(
      '/freelance/focus/checkin',
      payload
    );
    if (!response.data.success) throw new Error('Failed to store checkin');
    return response.data.data;
  },

  // ── Week Plan ──────────────────────────────────────────────────────────────

  getWeekPlan: async (weekStart: string): Promise<WeekPlanDay[]> => {
    const response = await apiClient.get<{ success: boolean; data: { days: WeekPlanDay[] } }>(
      `/freelance/focus/week-plan?week_start=${weekStart}`
    );
    if (!response.data.success) throw new Error('Failed to fetch week plan');
    return response.data.data.days ?? [];
  },

  updateTaskWeekPlan: async (taskId: number, weekPlanDate: string | null): Promise<FocusTask> => {
    const response = await apiClient.patch<{ success: boolean; data: FocusTask }>(
      `/freelance/focus/tasks/${taskId}/week-plan`,
      { week_plan_date: weekPlanDate }
    );
    if (!response.data.success) throw new Error('Failed to update task week plan');
    return response.data.data;
  },

  // ── Projects with tasks ───────────────────────────────────────────────────

  getProjectsWithTasks: async (): Promise<ProjectWithTasks[]> => {
    const response = await apiClient.get<{ success: boolean; data: { projects: ProjectWithTasks[] } }>(
      '/freelance/focus/projects-with-tasks'
    );
    if (!response.data.success) throw new Error('Failed to fetch projects with tasks');
    return response.data.data.projects ?? [];
  },
};
