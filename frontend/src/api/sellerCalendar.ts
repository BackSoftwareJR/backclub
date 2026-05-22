import apiClient from './client';

// ==================== Seller Calendar Types ====================

export type SellerCalendarItemType = 'event' | 'call' | 'deadline' | 'reminder' | 'task';

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface SellerCalendarItem {
    id: number;
    seller_id?: number | null;
    type: SellerCalendarItemType;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
    call_link?: string | null;
    call_notes?: string | null;
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

export interface CreateSellerCalendarItemData {
    type: SellerCalendarItemType;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    call_link?: string;
    call_notes?: string;
    deadline_type?: string;
    color?: string;
    checklist_items?: ChecklistItem[];
    has_checklist?: boolean;
}

// ==================== Seller Calendar API ====================

export const sellerCalendarApi = {
    /**
     * Get all calendar items for the current seller
     */
    getItems: async (): Promise<{ success: boolean; data: { events: SellerCalendarItem[]; tasks: any[] } }> => {
        const response = await apiClient.get<{ success: boolean; data: { events: SellerCalendarItem[]; tasks: any[] } }>('/seller/calendar/items');
        return response.data;
    },

    /**
     * Create a new calendar item
     */
    createItem: async (data: CreateSellerCalendarItemData): Promise<{ success: boolean; data: SellerCalendarItem; message: string }> => {
        const response = await apiClient.post<{ success: boolean; data: SellerCalendarItem; message: string }>('/seller/calendar/items', data);
        return response.data;
    },

    /**
     * Update a calendar item
     */
    updateItem: async (itemId: number, data: Partial<CreateSellerCalendarItemData>): Promise<{ success: boolean; data: SellerCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: SellerCalendarItem; message: string }>(`/seller/calendar/items/${itemId}`, data);
        return response.data;
    },

    /**
     * Delete a calendar item
     */
    deleteItem: async (itemId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/seller/calendar/items/${itemId}`);
        return response.data;
    },

    /**
     * Update item position after drag & drop
     */
    dragItem: async (itemId: number, startTime: string, endTime: string): Promise<{ success: boolean; data: SellerCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: SellerCalendarItem; message: string }>(`/seller/calendar/items/${itemId}/drag`, {
            start_time: startTime,
            end_time: endTime
        });
        return response.data;
    },

    /**
     * Complete a calendar item
     */
    completeItem: async (itemId: number): Promise<{ success: boolean; data: SellerCalendarItem; message: string }> => {
        const response = await apiClient.post<{ success: boolean; data: SellerCalendarItem; message: string }>(`/seller/calendar/items/${itemId}/complete`);
        return response.data;
    },
};
