import apiClient from './client';

export interface UscitaCocchi {
    id: number;
    title: string;
    description?: string;
    amount: number;
    type: 'fattura' | 'ricevuta' | 'bonifico' | 'contanti' | 'carta' | 'paypal' | 'altro';
    category?: string;
    paid_to?: string;
    team_member_id?: number;
    client_id?: number;
    project_id?: number;
    serbatoio_id?: number;
    payment_date?: string;
    due_date?: string;
    invoice_number?: string;
    invoice_file_path?: string;
    invoice_file_name?: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    tags?: string[];
    notes?: string;
    created_by: number;
    paid_by?: number;
    paid_at?: string;
    created_at: string;
    updated_at: string;
    formatted_amount: string;
    is_paid: boolean;
    is_overdue: boolean;
    status_label: string;
    type_label: string;
    team_member?: any;
    client?: any;
    project?: any;
    serbatoio?: any;
}

export interface UsciteStats {
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    overdue_amount: number;
    count_total: number;
    count_paid: number;
    count_pending: number;
    count_overdue: number;
    by_category: Array<{
        category: string;
        total: number;
        count: number;
    }>;
    by_type: Array<{
        type: string;
        total: number;
        count: number;
    }>;
}

export interface CreateUscitaCocchiData {
    title: string;
    description?: string;
    amount: number;
    type: 'fattura' | 'ricevuta' | 'bonifico' | 'contanti' | 'carta' | 'paypal' | 'altro';
    category?: string;
    paid_to?: string;
    team_member_id?: number;
    client_id?: number;
    project_id?: number;
    serbatoio_id?: number;
    payment_date?: string;
    due_date?: string;
    invoice_number?: string;
    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
    tags?: string[];
    notes?: string;
}

export const usciteCocchiApi = {
    // Get all uscite
    getAll: async (params?: {
        status?: string;
        type?: string;
        category?: string;
        team_member_id?: number;
        client_id?: number;
        project_id?: number;
        start_date?: string;
        end_date?: string;
        overdue_only?: boolean;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
        per_page?: number;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                data: UscitaCocchi[];
                current_page: number;
                last_page: number;
                per_page: number;
                total: number;
            };
        }>('/uscite-cocchi', { params });
        return response.data;
    },

    // Get stats
    getStats: async (params?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UsciteStats;
            period: {
                start_date: string;
                end_date: string;
            };
        }>('/uscite-cocchi/stats', { params });
        return response.data;
    },

    // Get single uscita
    getById: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UscitaCocchi;
        }>(`/uscite-cocchi/${id}`);
        return response.data;
    },

    // Create uscita
    create: async (data: CreateUscitaCocchiData) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: UscitaCocchi;
        }>('/uscite-cocchi', data);
        return response.data;
    },

    // Update uscita
    update: async (id: number, data: Partial<CreateUscitaCocchiData>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: UscitaCocchi;
        }>(`/uscite-cocchi/${id}`, data);
        return response.data;
    },

    // Delete uscita
    delete: async (id: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/uscite-cocchi/${id}`);
        return response.data;
    },

    // Upload invoice
    uploadInvoice: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: {
                file_path: string;
                file_name: string;
                file_url: string;
            };
        }>(`/uscite-cocchi/${id}/invoice`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Mark as paid
    markPaid: async (id: number, data: {
        serbatoio_id?: number;
        payment_date?: string;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: UscitaCocchi;
        }>(`/uscite-cocchi/${id}/mark-paid`, data);
        return response.data;
    },

    // Cancel uscita
    cancel: async (id: number) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: UscitaCocchi;
        }>(`/uscite-cocchi/${id}/cancel`);
        return response.data;
    },
};

export default usciteCocchiApi;
