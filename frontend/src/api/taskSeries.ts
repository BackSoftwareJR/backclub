import apiClient from './client';
import type {
  TaskSeriesAnalysisResult,
  TaskSeriesCreatePayload,
  TaskSeriesCreateResult,
} from '../types/taskSeries';

export interface TaskSeriesAnalyzeOptions {
  file?: File;
  analysisText?: string;
  seriesTitle?: string;
  aiInstructions?: string;
}

export const taskSeriesApi = {
  analyze: async (
    projectId: number,
    options: TaskSeriesAnalyzeOptions
  ): Promise<{ success: boolean; data: TaskSeriesAnalysisResult; message?: string }> => {
    const { file, analysisText, seriesTitle, aiInstructions } = options;

    if (file) {
      const formData = new FormData();
      formData.append('document', file);
      if (analysisText?.trim()) {
        formData.append('analysis_text', analysisText.trim());
      }
      if (seriesTitle?.trim()) {
        formData.append('series_title', seriesTitle.trim());
      }
      if (aiInstructions?.trim()) {
        formData.append('ai_instructions', aiInstructions.trim());
      }

      const response = await apiClient.post(
        `/crm-projects/${projectId}/tasks/series/analyze`,
        formData,
        { timeout: 90000 }
      );
      return response.data;
    }

    const response = await apiClient.post(
      `/crm-projects/${projectId}/tasks/series/analyze`,
      {
        analysis_text: analysisText?.trim() ?? '',
        series_title: seriesTitle?.trim() || undefined,
        ai_instructions: aiInstructions?.trim() || undefined,
      },
      { timeout: 90000 }
    );
    return response.data;
  },

  create: async (
    projectId: number,
    payload: TaskSeriesCreatePayload
  ): Promise<{ success: boolean; message: string; data: TaskSeriesCreateResult }> => {
    const response = await apiClient.post(
      `/crm-projects/${projectId}/tasks/series`,
      payload,
      { timeout: 60000 }
    );
    return response.data;
  },
};
