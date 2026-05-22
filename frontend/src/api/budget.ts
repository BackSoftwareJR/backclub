import apiClient from './client';

// ==================== TYPES ====================

export interface CrmDepartment {
    id: number;
    code: string;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    budget_allocated: number;
    budget_spent: number;
    budget_remaining: number;
    is_active: boolean;
    manager_id?: number;
    manager?: any;
    created_at: string;
    updated_at: string;
    formatted_budget: string;
    budget_usage_percentage: number;
    team_members_count?: number;
    active_expenses_count?: number;
}

export interface CrmTeamMember {
    id: number;
    crm_department_id: number;
    user_id: number;
    role?: string;
    allocation_percentage: number;
    cocchi_budget: number;
    cocchi_spent: number;
    cocchi_remaining: number;
    is_active: boolean;
    joined_at: string;
    user?: any;
    crm_department?: CrmDepartment;
    usage_percentage: number;
}

export interface CrmExpense {
    id: number;
    crm_department_id: number;
    type: 'abbonamento' | 'spesa_prevista' | 'spesa_imprevista' | 'servizio' | 'altro';
    name: string;
    description?: string;
    amount: number;
    frequency: 'once' | 'monthly' | 'quarterly' | 'yearly';
    start_date?: string;
    end_date?: string;
    status: 'active' | 'inactive' | 'expired';
    category?: string;
    related_user_id?: number;
    related_project_id?: number;
    attachment_url?: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    formatted_amount: string;
    is_recurring: boolean;
    type_label: string;
    frequency_label: string;
}

export interface CrmEconomicAnalysis {
    id: number;
    crm_department_id: number;
    period_type: 'monthly' | 'quarterly' | 'yearly';
    period_year: number;
    period_month?: number;
    period_quarter?: number;
    revenue_generated: number;
    budget_used: number;
    profit_loss: number;
    projects_completed: number;
    team_size: number;
    client_satisfaction?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    roi_percentage: number;
    period_label: string;
}

export interface UserCrmAllocation {
    id: number;
    user_id: number;
    crm_department_id?: number;
    project_id?: number;
    cocchi_allocated: number;
    cocchi_used: number;
    cocchi_remaining: number;
    allocation_date: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    usage_percentage: number;
    crm_department?: CrmDepartment;
    project?: any;
}

export interface UserBudgetSummary {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    total_allocated: number;
    total_used: number;
    total_remaining: number;
    allocations_count: number;
}

// ==================== API ====================

export const budgetApi = {
    // CRM Departments
    getCrmList: async (params?: { active_only?: boolean }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmDepartment[];
        }>('/budget/crm', { params });
        return response.data;
    },

    getCrmDetail: async (code: string) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmDepartment;
        }>(`/budget/crm/${code}`);
        return response.data;
    },

    updateCrm: async (code: string, data: Partial<CrmDepartment>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: CrmDepartment;
        }>(`/budget/crm/${code}`, data);
        return response.data;
    },

    updateBudget: async (code: string, budget_allocated: number) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: CrmDepartment;
        }>(`/budget/crm/${code}/budget`, { budget_allocated });
        return response.data;
    },

    getCrmAnalytics: async (code: string, params?: { period?: string; year?: number }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                analytics: CrmEconomicAnalysis[];
                totals: any;
            };
        }>(`/budget/crm/${code}/analytics`, { params });
        return response.data;
    },

    // Team Management
    getTeam: async (code: string) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmTeamMember[];
        }>(`/budget/crm/${code}/team`);
        return response.data;
    },

    addTeamMember: async (code: string, data: {
        user_id: number;
        role?: string;
        allocation_percentage: number;
        cocchi_budget: number;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: CrmTeamMember;
        }>(`/budget/crm/${code}/team`, data);
        return response.data;
    },

    updateTeamMember: async (id: number, data: Partial<CrmTeamMember>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: CrmTeamMember;
        }>(`/budget/crm/team/${id}`, data);
        return response.data;
    },

    removeTeamMember: async (id: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/budget/crm/team/${id}`);
        return response.data;
    },

    // Expenses
    getExpenses: async (code: string, params?: { type?: string; status?: string; recurring_only?: boolean }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmExpense[];
            stats: any;
        }>(`/budget/crm/${code}/expenses`, { params });
        return response.data;
    },

    createExpense: async (code: string, data: Partial<CrmExpense>) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: CrmExpense;
        }>(`/budget/crm/${code}/expenses`, data);
        return response.data;
    },

    updateExpense: async (id: number, data: Partial<CrmExpense>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: CrmExpense;
        }>(`/budget/expenses/${id}`, data);
        return response.data;
    },

    deleteExpense: async (id: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/budget/expenses/${id}`);
        return response.data;
    },

    // User Budget
    getUsersList: async (params?: { role?: string }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UserBudgetSummary[];
        }>('/budget/users', { params });
        return response.data;
    },

    getUserDetail: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                user: any;
                allocations: UserCrmAllocation[];
                stats: any;
            };
        }>(`/budget/users/${id}`);
        return response.data;
    },

    getUserAllocations: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: UserCrmAllocation[];
        }>(`/budget/users/${id}/allocations`);
        return response.data;
    },

    getUserProjects: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: any[];
        }>(`/budget/users/${id}/projects`);
        return response.data;
    },

    getUserPayments: async (id: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                payments: any[];
                stats: any;
            };
        }>(`/budget/users/${id}/payments`);
        return response.data;
    },

    // Economic Analysis
    getGlobalSummary: async (year?: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: any;
        }>('/budget/analytics/summary', { params: { year } });
        return response.data;
    },

    // Budget Distribution
    distributeToCrm: async (data: {
        crm_code: string;
        amount: number;
        reason?: string;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: any;
        }>('/budget/distribute-to-crm', data);
        return response.data;
    },

    reduceCrmBudget: async (crmCode: string, data: {
        amount: number;
        reason?: string;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: CrmDepartment;
        }>(`/budget/crm/${crmCode}/reduce`, data);
        return response.data;
    },

    allocateToProject: async (crmCode: string, data: { project_id: number; amount: number; notes?: string }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: any;
        }>(`/budget/crm/${crmCode}/allocate-to-project`, data);
        return response.data;
    },

    // CRM Projects
    getCrmProjects: async (code: string) => {
        const response = await apiClient.get(`/uscite-cocchi/crm/${code}/projects`);
        return response.data;
    },

    // CRM Team
    getCrmTeam: async (code: string) => {
        const response = await apiClient.get(`/uscite-cocchi/crm/${code}/team`);
        return response.data;
    },

    // CRM Expenses Aggregated
    getCrmExpensesAggregated: async (code: string) => {
        const response = await apiClient.get(`/uscite-cocchi/crm/${code}/expenses/aggregated`);
        return response.data;
    },

    // CRM Expenses by Project
    getCrmExpensesByProject: async (code: string) => {
        const response = await apiClient.get(`/uscite-cocchi/crm/${code}/expenses/by-project`);
        return response.data;
    },
};

export default budgetApi;
