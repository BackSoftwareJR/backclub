import apiClient from './client';

// ==================== Types ====================

export interface UserDetail {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    phone: string | null;
    department: string | null;
    hire_date: string | null;
    salary_cocchi: number | null;
    is_active: boolean;
}

export interface UserStats {
    expenses: {
        total_count: number;
        total_paid: number;
        total_pending: number;
        formatted_paid: string;
        formatted_pending: string;
    };
    reimbursements: {
        total_count: number;
        pending_amount: number;
        approved_amount: number;
        paid_amount: number;
        formatted_pending: string;
        formatted_approved: string;
        formatted_paid: string;
    };
    allocations: {
        total_allocated: number;
        total_used: number;
        total_remaining: number;
        usage_percentage: number;
        formatted_allocated: string;
        formatted_used: string;
        formatted_remaining: string;
    };
    projects: {
        active_count: number;
    };
    last_activity: string | null;
}

export interface Expense {
    id: number;
    title: string;
    description: string | null;
    amount: number;
    type: string;
    category: string | null;
    payment_date: string | null;
    due_date: string | null;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    formatted_amount: string;
    project?: {
        id: number;
        name: string;
    };
    serbatoio?: {
        id: number;
        name: string;
    };
    creator?: {
        id: number;
        name: string;
    };
}

export interface Reimbursement {
    id: number;
    title: string;
    description: string | null;
    amount: number;
    category: string | null;
    expense_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    formatted_amount: string;
    status_label: string;
    status_color: string;
    days_pending: number | null;
    receipt_file_path: string | null;
    receipt_file_name: string | null;
    requested_at: string;
    reviewed_at: string | null;
    paid_at: string | null;
    rejection_reason: string | null;
    project?: {
        id: number;
        name: string;
    };
    reviewer?: {
        id: number;
        name: string;
    };
    payer?: {
        id: number;
        name: string;
    };
}

export interface CrmAllocation {
    id: number;
    cocchi_allocated: number;
    cocchi_used: number;
    cocchi_remaining: number;
    usage_percentage: number;
    allocation_date: string;
    notes: string | null;
    crm_department?: {
        id: number;
        code: string;
        name: string;
    };
    project?: {
        id: number;
        name: string;
    };
}

export interface Project {
    id: number;
    name: string;
    status: string;
    budget_cocchi: number | null;
    spent_cocchi: number;
}

export interface TimelineActivity {
    id: number;
    title: string;
    amount: number;
    date: string;
    status: string;
    category: string | null;
    type: 'expense' | 'reimbursement';
}

export interface UserDetailResponse {
    user: UserDetail;
    stats: UserStats;
    expenses: {
        data: Expense[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    reimbursements: {
        data: Reimbursement[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    crm_allocations: CrmAllocation[];
    projects: Project[];
}

// ==================== API Methods ====================

export const userDetailApi = {
    /**
     * Get user detail with all data
     */
    getDetail: async (userId: number, params?: {
        period?: 'all' | 'month' | 'year';
        per_page?: number;
        per_page_reimb?: number;
    }) => {
        const response = await apiClient.get<{ success: boolean; data: UserDetailResponse }>(
            `/users/${userId}/detail`,
            { params }
        );
        return response.data;
    },

    /**
     * Get only expenses (for lazy loading)
     */
    getExpenses: async (userId: number, params?: {
        page?: number;
        per_page?: number;
        status?: string;
        category?: string;
    }) => {
        const response = await apiClient.get<{ success: boolean; data: any }>(
            `/users/${userId}/expenses`,
            { params }
        );
        return response.data;
    },

    /**
     * Get only reimbursements (for lazy loading)
     */
    getReimbursements: async (userId: number, params?: {
        page?: number;
        per_page_reimb?: number;
        reimb_status?: string;
    }) => {
        const response = await apiClient.get<{ success: boolean; data: any }>(
            `/users/${userId}/reimbursements`,
            { params }
        );
        return response.data;
    },

    /**
     * Get activity timeline
     */
    getActivityTimeline: async (userId: number, params?: {
        limit?: number;
    }) => {
        const response = await apiClient.get<{ success: boolean; data: TimelineActivity[] }>(
            `/users/${userId}/activity-timeline`,
            { params }
        );
        return response.data;
    },
};

export default userDetailApi;

