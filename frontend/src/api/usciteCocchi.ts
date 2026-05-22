import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token if exists
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// ==================== Types ====================

export interface UscitaCocchi {
    id: number;
    title: string;
    description: string | null;
    amount: number;
    type: 'fattura' | 'ricevuta' | 'bonifico' | 'contanti' | 'carta' | 'paypal' | 'altro';
    category: string | null;
    paid_to: string | null;
    team_member_id: number | null;
    client_id: number | null;
    project_id: number | null;
    serbatoio_id: number | null;
    crm_code: string | null;
    payment_date: string | null;
    due_date: string | null;
    next_payment_date: string | null;
    invoice_number: string | null;
    invoice_file_path: string | null;
    invoice_file_name: string | null;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    payment_frequency: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    auto_renew: boolean;
    payment_method: string | null;
    is_recurring: boolean;
    tags: string[] | null;
    notes: string | null;
    created_by: number;
    paid_by: number | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CrmExpenseSummary {
    code: string;
    name: string;
    total_amount: number;
    pending_amount: number;
    paid_amount: number;
    count: number;
    next_payment_date: string | null;
    next_payment_amount: number | null;
}

export interface CrmExpenseDetail {
    code: string;
    name: string;
    total_amount: number;
    pending_amount: number;
    paid_amount: number;
    count: number;
    recurring_count: number;
}

export interface CalendarEvent {
    id: number;
    title: string;
    start: string;
    end: string;
    amount: number;
    status: string;
    type: string;
    backgroundColor: string;
}

export interface UserExpenseSummary {
    id: number;
    name: string;
    email: string;
    total_expenses: number;
    expenses_count: number;
    last_payment_date: string | null;
    last_payment_amount: number | null;
}

export interface AnalyticsKPI {
    total_amount: number;
    average_amount: number;
    count: number;
    trend_percentage: number;
}

export interface ChartData {
    line_chart: Array<{ period: string; total: number; count: number }>;
    pie_chart: Array<{ type: string; total: number }>;
    bar_chart_crm: Array<{ crm_code: string; total: number }>;
    bar_chart_user: Array<{ user_id: number; total: number }>;
}

// ==================== API ====================

export const usciteCocchiApi = {
    // ============================================================
    // CRM Section
    // ============================================================

    getCrmList: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmExpenseSummary[];
        }>('/uscite-cocchi/crm');
        return response.data;
    },

    getCrmDetail: async (code: string) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmExpenseDetail;
        }>(`/uscite-cocchi/crm/${code}`);
        return response.data;
    },

    getCrmPayments: async (code: string, filters?: {
        status?: string;
        date_from?: string;
        date_to?: string;
        is_recurring?: boolean;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UscitaCocchi[];
            total: number;
        }>(`/uscite-cocchi/crm/${code}/payments`, { params: filters });
        return response.data;
    },

    getCrmCalendar: async (code: string, filters?: {
        start?: string;
        end?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CalendarEvent[];
        }>(`/uscite-cocchi/crm/${code}/calendar`, { params: filters });
        return response.data;
    },

    getCrmUpcoming: async (code: string) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UscitaCocchi[];
            total: number;
        }>(`/uscite-cocchi/crm/${code}/upcoming`);
        return response.data;
    },

    // ============================================================
    // Users Section
    // ============================================================

    getUsersList: async (filters?: {
        q?: string;
        expense_type?: string;
        date_from?: string;
        date_to?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UserExpenseSummary[];
        }>('/uscite-cocchi/users', { params: filters });
        return response.data;
    },

    getUserDetail: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: any;
        }>(`/uscite-cocchi/users/${id}`);
        return response.data;
    },

    getUserPayments: async (id: number, filters?: {
        status?: string;
        type?: string;
        date_from?: string;
        date_to?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UscitaCocchi[];
            total: number;
        }>(`/uscite-cocchi/users/${id}/payments`, { params: filters });
        return response.data;
    },

    getUserCalendar: async (id: number, filters?: {
        start?: string;
        end?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CalendarEvent[];
        }>(`/uscite-cocchi/users/${id}/calendar`, { params: filters });
        return response.data;
    },

    // ============================================================
    // Analytics
    // ============================================================

    getAnalyticsKPI: async (filters?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: AnalyticsKPI;
        }>('/uscite-cocchi/analytics/kpi', { params: filters });
        return response.data;
    },

    getAnalyticsCharts: async (filters?: {
        start_date?: string;
        end_date?: string;
        group_by?: 'day' | 'week' | 'month' | 'year';
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: ChartData;
        }>('/uscite-cocchi/analytics/charts', { params: filters });
        return response.data;
    },

    getAnalyticsTrends: async (weeks?: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Array<{
                week: string;
                start_date: string;
                total: number;
                count: number;
            }>;
        }>('/uscite-cocchi/analytics/trends', { params: { weeks } });
        return response.data;
    },

    getAnalyticsBreakdown: async (filters?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                top_crms: any[];
                top_users: any[];
                top_types: any[];
            };
        }>('/uscite-cocchi/analytics/breakdown', { params: filters });
        return response.data;
    },

    // ============================================================
    // Search & Filters
    // ============================================================

    search: async (filters: {
        q?: string;
        crm_code?: string;
        team_member_id?: number;
        type?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        sort_by?: string;
        sort_dir?: 'asc' | 'desc';
        per_page?: number;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UscitaCocchi[];
            pagination: {
                total: number;
                per_page: number;
                current_page: number;
                last_page: number;
            };
        }>('/uscite-cocchi/search', { params: filters });
        return response.data;
    },

    getFilters: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                crm_codes: string[];
                users: Array<{ id: number; name: string }>;
                types: string[];
                statuses: string[];
            };
        }>('/uscite-cocchi/filters');
        return response.data;
    },

    getQuickStats: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                total_pending: number;
                total_paid: number;
                count_pending: number;
                count_paid: number;
                total: number;
                count_total: number;
            };
        }>('/uscite-cocchi/quick-stats');
        return response.data;
    },
};
