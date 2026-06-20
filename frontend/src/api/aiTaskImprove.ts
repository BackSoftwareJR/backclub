import apiClient from './client';

export interface AiTaskSuggestion {
  title: string;
  description: string;
}

export type AiImproveMode = 'improve' | 'suggest_title';

export interface AiImproveResponse {
  mode: AiImproveMode;
  suggestions: AiTaskSuggestion[];
}

export const aiTaskImproveApi = {
  improve: async (title: string, description: string): Promise<AiImproveResponse> => {
    const response = await apiClient.post<AiImproveResponse>('/ai/improve-task', {
      title: title || undefined,
      description: description || undefined,
    });
    return response.data;
  },
};
