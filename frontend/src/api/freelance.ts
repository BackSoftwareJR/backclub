import apiClient from './client';
import { crmProjectTasksApi } from './crmProjects';
import type {
  FreelanceProject,
  FreelanceTask,
  FreelanceDashboardStats,
  ProjectChatChannel,
} from '../types/freelance';
import type { CrmProjectTask } from './crmProjects';

/** Risposta GET /freelance/dashboard */
interface DashboardResponse {
  stats: FreelanceDashboardStats;
  projects: FreelanceProject[];
  tasks: FreelanceTask[];
}

/**
 * API Freelance: usa endpoint ottimizzati (una chiamata invece di N+1).
 */
export const freelanceApi = {
  /**
   * Dashboard: stats + projects + tasks in una sola chiamata.
   */
  getDashboardData: async (): Promise<DashboardResponse> => {
    const response = await apiClient.get<{ success: boolean; data: DashboardResponse }>('/freelance/dashboard');
    if (!response.data.success) throw new Error('Failed to fetch dashboard');
    return response.data.data;
  },

  /**
   * Progetti con progress, myTasksCount, unreadMessages (una chiamata).
   * Opzionali: search (filtro nome/descrizione), per_page (limite risultati, es. per barra ricerca).
   */
  getFreelancerProjects: async (params?: { search?: string; per_page?: number }): Promise<FreelanceProject[]> => {
    const query = new URLSearchParams();
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.per_page != null) query.set('per_page', String(params.per_page));
    const url = query.toString() ? `/freelance/projects?${query.toString()}` : '/freelance/projects';
    const response = await apiClient.get<{ success: boolean; data: FreelanceProject[] }>(url);
    if (!response.data.success) throw new Error('Failed to fetch projects');
    return response.data.data || [];
  },

  /**
   * Tutti i task assegnati all'utente (una chiamata).
   * Opzionali: search (filtro titolo/descrizione), per_page (limite risultati, es. per barra ricerca).
   */
  getFreelancerTasks: async (params?: { search?: string; per_page?: number }): Promise<FreelanceTask[]> => {
    const query = new URLSearchParams();
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.per_page != null) query.set('per_page', String(params.per_page));
    const url = query.toString() ? `/freelance/tasks?${query.toString()}` : '/freelance/tasks';
    const response = await apiClient.get<{ success: boolean; data: FreelanceTask[] }>(url);
    if (!response.data.success) throw new Error('Failed to fetch tasks');
    return response.data.data || [];
  },

  /**
   * Stats dashboard (usa getDashboardData e restituisce solo stats).
   */
  getDashboardStats: async (): Promise<FreelanceDashboardStats> => {
    const data = await freelanceApi.getDashboardData();
    return data.stats;
  },

  /**
   * Richieste di spostamento e eliminazione dell'utente in una sola chiamata (evita N*2 chiamate per progetto).
   */
  getMyRequests: async (): Promise<{ reschedule: any[]; deletion: any[] }> => {
    const response = await apiClient.get<{ success: boolean; data: { reschedule: any[]; deletion: any[] } }>('/freelance/requests');
    if (!response.data.success) throw new Error('Failed to fetch requests');
    return response.data.data || { reschedule: [], deletion: [] };
  },

  /**
   * Canali chat con last_message, unread_count, manager (una chiamata).
   */
  getChatChannels: async (): Promise<ProjectChatChannel[]> => {
    const response = await apiClient.get<{ success: boolean; data: ProjectChatChannel[] }>('/freelance/chat-channels');
    if (!response.data.success) throw new Error('Failed to fetch chat channels');
    return response.data.data || [];
  },

  /**
   * Aggiorna stato task.
   */
  updateTaskStatus: async (
    projectId: number,
    taskId: number,
    status: CrmProjectTask['status']
  ): Promise<CrmProjectTask> => {
    const response = await crmProjectTasksApi.update(projectId, taskId, { status });
    return response.data;
  },
};
