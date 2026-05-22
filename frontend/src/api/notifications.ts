import apiClient from './client';

export interface Notification {
  id: string;
  type: string;
  data: {
    title: string;
    message: string;
    type?: string;
    status?: string;
    task_id?: number;
    task_title?: string;
    project_id?: number;
    project_name?: string;
    reviewer_name?: string;
    review_notes?: string;
    url?: string;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const notificationsApi = {
  /**
   * Get all notifications for the current user
   */
  getAll: async (params?: {
    read?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; data: Notification[] }> => {
    const response = await apiClient.get<{ success: boolean; data: Notification[] }>('/notifications', {
      params,
    });
    return response.data;
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put<{ success: boolean; message: string }>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put<{ success: boolean; message: string }>('/notifications/read-all');
    return response.data;
  },
};
