import { apiClient } from './client';

export type IntentType = 'communication' | 'procedure' | 'creative' | 'analysis' | 'meeting' | 'generic';

export interface MissingInfoRequest {
  field: string;
  question: string;
  type: 'text' | 'select';
}

export interface CommunicationDraft {
  type: 'email' | 'message' | 'whatsapp';
  subject?: string | null;
  body: string;
  variables_used: string[];
  missing_info: string[];
}

export interface RoadmapStep {
  step: number;
  action: string;
  why: string;
  effort: 'low' | 'medium' | 'high';
  status: 'todo' | 'doing' | 'done';
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'quality' | 'delivery' | 'communication' | 'technical';
}

export interface BriefBlocker {
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TaskAiBrief {
  intent: IntentType;
  hint: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  cached?: boolean;

  // communication
  ready_to_use?: CommunicationDraft | null;
  missing_info_requests?: MissingInfoRequest[];

  // procedure / creative / meeting
  steps?: RoadmapStep[];

  // analysis
  checklist?: ChecklistItem[];

  // blockers (procedure / legacy)
  blockers?: BriefBlocker[];

  // generic
  next_step?: string | null;

  // legacy (old cached responses without intent)
  roadmap?: RoadmapStep[];
}

export interface TaskAiAskResponse {
  answer: string;
  sources: string[];
}

export const taskDetailAiApi = {
  getBrief: async (projectId: number, taskId: number): Promise<{ success: boolean; data: TaskAiBrief }> => {
    const response = await apiClient.get<{ success: boolean; data: TaskAiBrief }>(
      `/crm-projects/${projectId}/tasks/${taskId}/ai/brief`
    );
    return response.data;
  },

  ask: async (
    projectId: number,
    taskId: number,
    question: string
  ): Promise<{ success: boolean; data: TaskAiAskResponse }> => {
    const response = await apiClient.post<{ success: boolean; data: TaskAiAskResponse }>(
      `/crm-projects/${projectId}/tasks/${taskId}/ai/ask`,
      { question }
    );
    return response.data;
  },
};
