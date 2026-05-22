import apiClient from './client';
import type {
  FreelanceProject,
  FreelanceTask,
  FreelanceDashboardStats,
  ProjectChatChannel,
} from '../types/freelance';

/** Risposta dashboard CRM (stessa struttura di freelance/dashboard ma dati di tutto il CRM). */
interface CrmDashboardResponse {
  stats: FreelanceDashboardStats;
  projects: FreelanceProject[];
  tasks: FreelanceTask[];
}

/**
 * API per la vista CRM dedicata: restituisce TUTTI i dati del dipartimento
 * (progetti, task, richieste, chat, calendario di tutti i membri del CRM).
 */
export const freelanceCrmApi = {
  getDashboardData: async (crmCode: string): Promise<CrmDashboardResponse> => {
    const response = await apiClient.get<{ success: boolean; data: CrmDashboardResponse }>(
      `/freelance/crm/${encodeURIComponent(crmCode)}/dashboard`
    );
    if (!response.data.success) throw new Error('Failed to fetch CRM dashboard');
    return response.data.data;
  },

  getProjects: async (crmCode: string, params?: { search?: string; per_page?: number }): Promise<FreelanceProject[]> => {
    const query = new URLSearchParams();
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.per_page != null) query.set('per_page', String(params.per_page));
    const url = query.toString()
      ? `/freelance/crm/${encodeURIComponent(crmCode)}/projects?${query.toString()}`
      : `/freelance/crm/${encodeURIComponent(crmCode)}/projects`;
    const response = await apiClient.get<{ success: boolean; data: FreelanceProject[] }>(url);
    if (!response.data.success) throw new Error('Failed to fetch CRM projects');
    return response.data.data || [];
  },

  getTasks: async (crmCode: string, params?: { search?: string; per_page?: number }): Promise<FreelanceTask[]> => {
    const query = new URLSearchParams();
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.per_page != null) query.set('per_page', String(params.per_page));
    const url = query.toString()
      ? `/freelance/crm/${encodeURIComponent(crmCode)}/tasks?${query.toString()}`
      : `/freelance/crm/${encodeURIComponent(crmCode)}/tasks`;
    const response = await apiClient.get<{ success: boolean; data: FreelanceTask[] }>(url);
    if (!response.data.success) throw new Error('Failed to fetch CRM tasks');
    return response.data.data || [];
  },

  getRequests: async (crmCode: string): Promise<{ reschedule: any[]; deletion: any[] }> => {
    const response = await apiClient.get<{ success: boolean; data: { reschedule: any[]; deletion: any[] } }>(
      `/freelance/crm/${encodeURIComponent(crmCode)}/requests`
    );
    if (!response.data.success) throw new Error('Failed to fetch CRM requests');
    return response.data.data || { reschedule: [], deletion: [] };
  },

  getChatChannels: async (crmCode: string): Promise<ProjectChatChannel[]> => {
    const response = await apiClient.get<{ success: boolean; data: ProjectChatChannel[] }>(
      `/freelance/crm/${encodeURIComponent(crmCode)}/chat-channels`
    );
    if (!response.data.success) throw new Error('Failed to fetch CRM chat channels');
    return response.data.data || [];
  },

  getCalendarItems: async (crmCode: string): Promise<{ events: any[]; tasks: any[]; projects?: any[] }> => {
    const response = await apiClient.get<{ success: boolean; data: { events: any[]; tasks: any[]; projects?: any[] } }>(
      `/freelance/crm/${encodeURIComponent(crmCode)}/calendar/items`
    );
    if (!response.data.success) throw new Error('Failed to fetch CRM calendar');
    return response.data.data || { events: [], tasks: [], projects: [] };
  },
};
