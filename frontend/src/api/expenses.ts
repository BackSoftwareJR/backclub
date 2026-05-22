import apiClient from './client';

// ============================================================
// TYPES
// ============================================================

export interface ExpenseKPIs {
    total_expenses: number;
    total_count: number;
    average_expense: number;
    trend_percentage: number;
    pending_amount: number;
    pending_count: number;
    overdue_count: number;
    overdue_amount: number;
    reimbursements_pending: number;
    reimbursements_amount: number;
    subscriptions_active: number;
    subscriptions_monthly_cost: number;
}

export interface CRMBox {
    code: string;
    name: string;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    total_count: number;
    pending_count: number;
    next_payment_date: string | null;
    next_payment_amount: number | null;
    color: string;
}

export interface ReimbursementRequest {
    id: number;
    user_id: number;
    title: string;
    description: string;
    amount: number;
    category: string;
    expense_date: string;
    crm_code: string | null;
    project_id: number | null;
    receipt_file_path: string;
    receipt_file_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
    requested_at: string;
    reviewed_at: string | null;
    rejection_reason: string | null;
    user: any;
    reviewer: any;
    days_pending: number;
    urgency_level: string;
}

export interface Subscription {
    id: number;
    service_name: string;
    provider: string;
    plan_type: string;
    start_date: string;
    renewal_date: string;
    billing_cycle: string;
    monthly_amount: number;
    yearly_amount: number;
    is_active: boolean;
    auto_renew: boolean;
    crm_code: string;
    days_until_renewal: number;
    renewal_urgency: string;
}

export interface PaymentMethod {
    id: number;
    type: string;
    name: string;
    type_label: string;
    masked_number: string;
    card_brand: string;
    card_expiry_month: number;
    card_expiry_year: number;
    is_active: boolean;
    is_default: boolean;
    monthly_limit: number;
    remaining_limit: number;
    is_expiring_soon: boolean;
}

// ============================================================
// DASHBOARD API
// ============================================================

export const expenseDashboardApi = {
    getOverview: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get('/expense-dashboard/overview', { params });
        return response.data;
    },

    getKPIs: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get<{ success: boolean; data: ExpenseKPIs }>('/expense-dashboard/kpis', { params });
        return response.data;
    },

    getCRMBoxes: async () => {
        const response = await apiClient.get<{ success: boolean; data: CRMBox[] }>('/expense-dashboard/crm-boxes');
        return response.data;
    },

    getUpcomingPayments: async (days: number = 30) => {
        const response = await apiClient.get('/expense-dashboard/upcoming-payments', { params: { days } });
        return response.data;
    },

    getTrends: async (months: number = 12) => {
        const response = await apiClient.get('/expense-dashboard/trends', { params: { months } });
        return response.data;
    },

    getByCategory: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get('/expense-dashboard/by-category', { params });
        return response.data;
    },

    getByPaymentMethod: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get('/expense-dashboard/by-payment-method', { params });
        return response.data;
    },
};

// ============================================================
// REIMBURSEMENTS API
// ============================================================

export const reimbursementsApi = {
    getAll: async (params?: any) => {
        const response = await apiClient.get<{ success: boolean; data: any }>('/expense-reimbursements', { params });
        return response.data;
    },

    getPending: async () => {
        const response = await apiClient.get<{ success: boolean; data: ReimbursementRequest[] }>('/expense-reimbursements/pending');
        return response.data;
    },

    getMy: async () => {
        const response = await apiClient.get<{ success: boolean; data: ReimbursementRequest[] }>('/expense-reimbursements/my');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get(`/expense-reimbursements/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await apiClient.get('/expense-reimbursements/stats');
        return response.data;
    },

    create: async (formData: FormData) => {
        const response = await apiClient.post('/expense-reimbursements', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    approve: async (id: number, notes?: string) => {
        const response = await apiClient.put(`/expense-reimbursements/${id}/approve`, { notes });
        return response.data;
    },

    reject: async (id: number, reason: string) => {
        const response = await apiClient.put(`/expense-reimbursements/${id}/reject`, { reason });
        return response.data;
    },

    pay: async (id: number, data: { payment_method: string; serbatoio_id?: number; payment_notes?: string }) => {
        const response = await apiClient.put(`/expense-reimbursements/${id}/pay`, data);
        return response.data;
    },

    cancel: async (id: number) => {
        const response = await apiClient.delete(`/expense-reimbursements/${id}`);
        return response.data;
    },
};

// ============================================================
// SUBSCRIPTIONS API
// ============================================================

export const subscriptionsApi = {
    getAll: async (params?: any) => {
        const response = await apiClient.get<{ success: boolean; data: Subscription[] }>('/subscriptions', { params });
        return response.data;
    },

    getActive: async () => {
        const response = await apiClient.get<{ success: boolean; data: Subscription[]; count: number; total_monthly: number }>('/subscriptions/active');
        return response.data;
    },

    getExpiring: async () => {
        const response = await apiClient.get<{ success: boolean; data: Subscription[] }>('/subscriptions/expiring');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get(`/subscriptions/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await apiClient.get('/subscriptions/stats');
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/subscriptions', data);
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await apiClient.put(`/subscriptions/${id}`, data);
        return response.data;
    },

    suspend: async (id: number) => {
        const response = await apiClient.put(`/subscriptions/${id}/suspend`);
        return response.data;
    },

    activate: async (id: number) => {
        const response = await apiClient.put(`/subscriptions/${id}/activate`);
        return response.data;
    },

    renew: async (id: number) => {
        const response = await apiClient.put(`/subscriptions/${id}/renew`);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await apiClient.delete(`/subscriptions/${id}`);
        return response.data;
    },
};

// ============================================================
// PAYMENT METHODS API
// ============================================================

export const paymentMethodsApi = {
    getAll: async (params?: any) => {
        const response = await apiClient.get<{ success: boolean; data: PaymentMethod[] }>('/payment-methods', { params });
        return response.data;
    },

    getActive: async () => {
        const response = await apiClient.get<{ success: boolean; data: PaymentMethod[] }>('/payment-methods/active');
        return response.data;
    },

    getExpiring: async () => {
        const response = await apiClient.get<{ success: boolean; data: PaymentMethod[] }>('/payment-methods/expiring');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get(`/payment-methods/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await apiClient.get('/payment-methods/stats');
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/payment-methods', data);
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await apiClient.put(`/payment-methods/${id}`, data);
        return response.data;
    },

    setDefault: async (id: number) => {
        const response = await apiClient.put(`/payment-methods/${id}/set-default`);
        return response.data;
    },

    resetMonthly: async (id: number) => {
        const response = await apiClient.put(`/payment-methods/${id}/reset-monthly`);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await apiClient.delete(`/payment-methods/${id}`);
        return response.data;
    },
};

export default {
    dashboard: expenseDashboardApi,
    reimbursements: reimbursementsApi,
    subscriptions: subscriptionsApi,
    paymentMethods: paymentMethodsApi,
};

