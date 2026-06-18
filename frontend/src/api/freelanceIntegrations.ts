import apiClient from './client';

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}

export interface GoogleIntegrationStatus {
  connected: boolean;
  google_email?: string;
  auto_sync_calls?: boolean;
  calendar_id?: string;
  connected_at?: string;
  calendars?: GoogleCalendarOption[];
}

export const freelanceIntegrationsApi = {
  getGoogleStatus: async (): Promise<{ success: boolean; data: GoogleIntegrationStatus }> => {
    const response = await apiClient.get('/auth/google/status');
    return response.data;
  },

  connectGoogle: async (): Promise<{ success: boolean; url: string }> => {
    const response = await apiClient.get('/auth/google/connect');
    return response.data;
  },

  disconnectGoogle: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete('/auth/google/disconnect');
    return response.data;
  },

  updateGooglePreferences: async (data: {
    auto_sync_calls?: boolean;
    calendar_id?: string;
  }): Promise<{ success: boolean; data: GoogleIntegrationStatus; message: string }> => {
    const response = await apiClient.put('/auth/google/preferences', data);
    return response.data;
  },
};
