import apiClient from './client';

export interface Serbatoio {
    id: number;
    name: string;
    description?: string;
    balance: number;
    color: string;
    auto_distribution_enabled: boolean;
    auto_distribution_percentage: number;
    priority_order: number;
    is_active: boolean;
    created_by: number;
    created_at: string;
    updated_at: string;
    formatted_balance: string;
    is_auto_enabled: boolean;
}

export interface SerbatoioTransaction {
    id: number;
    serbatoio_id: number;
    type: 'auto_income' | 'manual_transfer_in' | 'manual_transfer_out' | 'expense' | 'adjustment';
    amount: number;
    balance_before: number;
    balance_after: number;
    from_serbatoio_id?: number;
    to_serbatoio_id?: number;
    reason?: string;
    created_by: number;
    created_at: string;
    formatted_amount: string;
    is_positive: boolean;
    type_label: string;
    serbatoio?: Serbatoio;
    from_serbatoio?: Serbatoio;
    to_serbatoio?: Serbatoio;
}

export interface SerbatoiStats {
    total_balance: number;
    total_serbatoi: number;
    active_serbatoi: number;
    auto_enabled: number;
    total_auto_percentage: number;
}

export interface CreateSerbatoioData {
    name: string;
    description?: string;
    color: string;
    auto_distribution_enabled: boolean;
    auto_distribution_percentage: number;
    priority_order?: number;
    balance?: number;
}

export interface TransferData {
    from_serbatoio_id: number;
    to_serbatoio_id: number;
    amount: number;
    reason: string;
}

export interface DistributeIncomeData {
    total_amount: number;
    source?: string;
    related_type?: string;
    related_id?: number;
}

export interface AdjustmentData {
    amount: number;
    reason: string;
    type: 'add' | 'remove';
}

export const serbatoiApi = {
    // Get all serbatoi
    getAll: async (params?: { active_only?: boolean; auto_enabled_only?: boolean }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Serbatoio[];
            stats: SerbatoiStats;
        }>('/serbatoi', { params });
        return response.data;
    },

    // Get single serbatoio
    getById: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Serbatoio;
            stats: {
                total_income: number;
                total_expenses: number;
                transaction_count: number;
            };
        }>(`/serbatoi/${id}`);
        return response.data;
    },

    // Create serbatoio
    create: async (data: CreateSerbatoioData) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: Serbatoio;
        }>('/serbatoi', data);
        return response.data;
    },

    // Update serbatoio
    update: async (id: number, data: Partial<CreateSerbatoioData>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: Serbatoio;
        }>(`/serbatoi/${id}`, data);
        return response.data;
    },

    // Delete serbatoio
    delete: async (id: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/serbatoi/${id}`);
        return response.data;
    },

    // Get comments
    getComments: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Array<{
                id: number;
                serbatoio_id: number;
                user_id: number;
                comment: string;
                created_at: string;
                updated_at: string;
                user_name: string;
                formatted_date: string;
                user?: any;
            }>;
        }>(`/serbatoi/${id}/comments`);
        return response.data;
    },

    // Add comment
    addComment: async (id: number, comment: string) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: any;
        }>(`/serbatoi/${id}/comments`, { comment });
        return response.data;
    },

    // Delete comment
    deleteComment: async (commentId: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/serbatoi/comments/${commentId}`);
        return response.data;
    },

    // Transfer between serbatoi
    transfer: async (data: TransferData) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: {
                from: Serbatoio;
                to: Serbatoio;
            };
        }>('/serbatoi/transfer', data);
        return response.data;
    },

    // Create adjustment (add/remove cocchi)
    createAdjustment: async (id: number, data: AdjustmentData) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: {
                serbatoio: Serbatoio;
                transaction: SerbatoioTransaction;
            };
        }>(`/serbatoi/${id}/adjustment`, data);
        return response.data;
    },

    // Get transactions
    getTransactions: async (params?: {
        serbatoio_id?: number;
        type?: string;
        start_date?: string;
        end_date?: string;
        per_page?: number;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                data: SerbatoioTransaction[];
                current_page: number;
                last_page: number;
                per_page: number;
                total: number;
            };
        }>('/serbatoi/transactions', { params });
        return response.data;
    },

    // Update automation
    updateAutomation: async (id: number, data: {
        auto_distribution_enabled: boolean;
        auto_distribution_percentage: number;
    }) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: Serbatoio;
        }>(`/serbatoi/${id}/automation`, data);
        return response.data;
    },

    // Distribute income
    distributeIncome: async (data: DistributeIncomeData) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: {
                transactions_count: number;
                total_distributed: number;
                transactions: SerbatoioTransaction[];
            };
        }>('/serbatoi/distribute-income', data);
        return response.data;
    },
};

export default serbatoiApi;
