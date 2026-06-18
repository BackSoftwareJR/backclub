import apiClient from './client';

// ==================== Freelance Calendar Types ====================

export type FreelanceCalendarItemType = 'event' | 'call' | 'deadline' | 'reminder' | 'task';

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface CallParticipant {
    email: string;
    name?: string;
}

export interface FreelanceCalendarItem {
    id: number;
    user_id?: number | null;
    type: FreelanceCalendarItemType;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
    call_link?: string | null;
    call_notes?: string | null;
    google_event_id?: string | null;
    google_meet_link?: string | null;
    sync_status?: 'pending' | 'synced' | 'failed' | 'skipped' | null;
    sync_error?: string | null;
    participants?: CallParticipant[];
    deadline_type?: string | null;
    color?: string | null;
    checklist_items?: ChecklistItem[] | null;
    has_checklist?: boolean;
    created_by: number;
    completed_at?: string | null;
    completed_by?: number | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface CreateFreelanceCalendarItemData {
    type: FreelanceCalendarItemType;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    call_link?: string;
    call_notes?: string;
    participants?: CallParticipant[];
    deadline_type?: string;
    color?: string;
    checklist_items?: ChecklistItem[];
    has_checklist?: boolean;
}

// ==================== Freelance Calendar API ====================

export const freelanceCalendarApi = {
    /**
     * Get all calendar items for the current freelance user
     */
    getItems: async (): Promise<{ success: boolean; data: { events: FreelanceCalendarItem[]; tasks: any[]; projects?: any[] } }> => {
        const response = await apiClient.get<{ success: boolean; data: { events: FreelanceCalendarItem[]; tasks: any[]; projects?: any[] } }>('/freelance/calendar/items');
        return response.data;
    },

    /**
     * Create a new calendar item
     */
    createItem: async (data: CreateFreelanceCalendarItemData): Promise<{ success: boolean; data: FreelanceCalendarItem; message: string }> => {
        const response = await apiClient.post<{ success: boolean; data: FreelanceCalendarItem; message: string }>('/freelance/calendar/items', data);
        return response.data;
    },

    /**
     * Update a calendar item
     */
    updateItem: async (itemId: number, data: Partial<CreateFreelanceCalendarItemData>): Promise<{ success: boolean; data: FreelanceCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: FreelanceCalendarItem; message: string }>(`/freelance/calendar/items/${itemId}`, data);
        return response.data;
    },

    /**
     * Delete a calendar item
     */
    deleteItem: async (itemId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/freelance/calendar/items/${itemId}`);
        return response.data;
    },

    /**
     * Update item position after drag & drop
     */
    dragItem: async (itemId: number, startTime: string, endTime: string): Promise<{ success: boolean; data: FreelanceCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: FreelanceCalendarItem; message: string }>(`/freelance/calendar/items/${itemId}/drag`, {
            start_time: startTime,
            end_time: endTime
        });
        return response.data;
    },

    /**
     * Complete a calendar item
     */
    completeItem: async (itemId: number): Promise<{ success: boolean; data: FreelanceCalendarItem; message: string }> => {
        const response = await apiClient.post<{ success: boolean; data: FreelanceCalendarItem; message: string }>(`/freelance/calendar/items/${itemId}/complete`);
        return response.data;
    },

    getItem: async (itemId: number): Promise<{ success: boolean; data: FreelanceCalendarItem }> => {
        const response = await apiClient.get<{ success: boolean; data: FreelanceCalendarItem }>(`/freelance/calendar/items/${itemId}`);
        return response.data;
    },
};
