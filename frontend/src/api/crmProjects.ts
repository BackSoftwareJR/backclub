import apiClient from './client';

// ==================== Types ====================

// Team Members Types (definiti prima per essere usati in CrmProject)
export interface CrmProjectTeamMember {
    id: number;
    crm_project_id: number;
    user_id: number;
    role: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    payment_methods: ('hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment')[];
    project_rate_cocchi: number | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
        role: string;
    };
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
}

export interface CrmProject {
    id: number;
    name: string;
    description: string | null;
    client_id: number;
    seller_id: number | null;
    crm_department_id: number | null;
    manager_id: number | null;
    status: 'in_attesa_presa_carico' | 'preso_in_carico' | 'avviato' | 'active' | 'paused' | 'completed' | 'archived';
    start_date: string | null;
    end_date: string | null;
    budget_cocchi: number;
    spent_cocchi: number;
    settings: Record<string, any> | null;
    cover_photo: string | null;
    cover_photo_url?: string | null;
    github_url?: string | null;
    website_url?: string | null;
    created_at: string;
    updated_at: string;
    
    // Relationships
    client?: {
        id: number;
        company_name: string;
        contact_person: string;
    };
    seller?: {
        id: number;
        user?: {
            id: number;
            name: string;
            email: string;
        };
    };
    manager?: {
        id: number;
        name: string;
        email: string;
    };
    crmDepartment?: {
        id: number;
        code: string;
        name: string;
        color: string;
        icon: string;
    };
    contracts?: Array<{
        id: number;
        contract_number: string;
        title: string;
        status: string;
        created_at?: string;
        signedDocuments?: Array<{
            id: number;
            contract_id: number;
            document_type: 'privacy_policy' | 'consent_personal_data' | 'other';
            document_name: string;
            file_path?: string;
            external_url?: string;
            signed_at?: string;
            notes?: string;
            created_by?: number;
            created_at: string;
            updated_at: string;
            creator?: {
                id: number;
                name: string;
                email: string;
            };
        }>;
    }>;
    teamMembers?: CrmProjectTeamMember[];
}

export interface CrmProjectStats {
    total: number;
    in_attesa_presa_carico?: number;
    preso_in_carico?: number;
    avviato?: number;
    active: number;
    paused: number;
    completed: number;
    archived: number;
    total_budget: number;
    total_spent: number;
    budget_remaining?: number;
    average_budget?: number;
    projects_by_status?: Record<string, number>;
}

export interface CrmProjectFilters {
    crm_department_id?: number;
    crm_department_code?: string;
    status?: string;
    search?: string;
    client_id?: number;
    seller_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
}

export interface CrmProjectListResponse {
    success: boolean;
    data: CrmProject[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: CrmProjectStats;
}

// ==================== API Functions ====================

export const crmProjectsApi = {
    /**
     * Get all CRM projects with filters
     */
    getAll: async (filters: CrmProjectFilters = {}): Promise<CrmProjectListResponse> => {
        const response = await apiClient.get<CrmProjectListResponse>('/crm-projects', {
            params: filters,
        });
        return response.data;
    },

    /**
     * Get single CRM project by ID
     */
    getById: async (id: number): Promise<{ success: boolean; data: CrmProject }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProject }>(`/crm-projects/${id}`);
        return response.data;
    },

    /**
     * Create new CRM project
     */
    create: async (data: Partial<CrmProject>): Promise<{ success: boolean; message: string; data: CrmProject }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProject }>('/crm-projects', data);
        return response.data;
    },

    /**
     * Update CRM project
     */
    update: async (id: number, data: Partial<CrmProject>): Promise<{ success: boolean; message: string; data: CrmProject }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProject }>(`/crm-projects/${id}`, data);
        return response.data;
    },

    /**
     * Delete CRM project
     */
    delete: async (id: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${id}`);
        return response.data;
    },

    /**
     * Get dashboard statistics
     */
    getDashboardStats: async (crmDepartmentId?: number, crmDepartmentCode?: string): Promise<{ success: boolean; data: CrmProjectStats }> => {
        const params: any = {};
        if (crmDepartmentId) params.crm_department_id = crmDepartmentId;
        if (crmDepartmentCode) params.crm_department_code = crmDepartmentCode;
        
        const response = await apiClient.get<{ success: boolean; data: CrmProjectStats }>('/crm-projects/dashboard/stats', {
            params,
        });
        return response.data;
    },

    /**
     * Take charge of a project (presa in carico)
     */
    takeCharge: async (id: number, managerId: number): Promise<{ success: boolean; message: string; data: CrmProject }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProject }>(`/crm-projects/${id}/take-charge`, {
            manager_id: managerId,
        });
        return response.data;
    },

    /**
     * Upload cover photo for a project
     */
    uploadCoverPhoto: async (id: number, file: File): Promise<{ success: boolean; message: string; data: CrmProject }> => {
        const baseURL = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
        const formData = new FormData();
        formData.append('cover', file);
        const res = await fetch(`${baseURL}/crm-projects/${id}/cover-photo`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: 'application/json',
            },
            body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json?.message || 'Upload fallito');
            (err as any).response = { data: json, status: res.status };
            throw err;
        }
        return json;
    },
};

// ==================== Team Members API ====================

export const crmProjectTeamMembersApi = {
    /**
     * Get all team members for a CRM project
     */
    getByProject: async (projectId: number): Promise<{ success: boolean; data: CrmProjectTeamMember[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTeamMember[] }>(`/crm-projects/${projectId}/team-members`);
        return response.data;
    },

    /**
     * Add a team member to a CRM project
     */
    addMember: async (projectId: number, data: {
        user_id: number;
        role: string;
        start_date?: string;
        end_date?: string;
        payment_methods: ('hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment')[];
        project_rate_cocchi?: number;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTeamMember }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTeamMember }>(`/crm-projects/${projectId}/team-members`, data);
        return response.data;
    },

    /**
     * Update a team member
     */
    updateMember: async (projectId: number, memberId: number, data: {
        role?: string;
        start_date?: string;
        end_date?: string;
        is_active?: boolean;
        payment_methods?: ('hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment')[];
        project_rate_cocchi?: number;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTeamMember }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProjectTeamMember }>(`/crm-projects/${projectId}/team-members/${memberId}`, data);
        return response.data;
    },

    /**
     * Remove a team member
     */
    removeMember: async (projectId: number, memberId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${projectId}/team-members/${memberId}`);
        return response.data;
    },

    /**
     * Get available users to add to project
     */
    getAvailableUsers: async (): Promise<{ success: boolean; data: User[] }> => {
        const response = await apiClient.get<{ success: boolean; data: User[] }>('/crm-projects/available-users');
        return response.data;
    },
};

// ==================== PM Chat Types ====================

export interface CrmProjectPmChatMessage {
    id: number;
    crm_project_id: number;
    user_id: number;
    message: string | null;
    message_type: 'text' | 'image' | 'file' | 'system';
    media_path: string | null;
    media_url?: string | null;
    media_name: string | null;
    media_size: number | null;
    media_type: string | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
    };
}

export interface PmChatManagerInfo {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    last_access: string | null;
}

// ==================== PM Chat API ====================

export const crmProjectPmChatApi = {
    /**
     * Get all messages for PM chat
     */
    getMessages: async (projectId: number): Promise<{ success: boolean; data: CrmProjectPmChatMessage[]; project_manager: any }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectPmChatMessage[]; project_manager: any }>(`/crm-projects/${projectId}/pm-chat/messages`);
        return response.data;
    },

    /**
     * Send a message
     */
    sendMessage: async (projectId: number, data: {
        message?: string;
        message_type: 'text' | 'image' | 'file';
        file?: File;
    }): Promise<{ success: boolean; message: string; data: CrmProjectPmChatMessage }> => {
        const formData = new FormData();
        if (data.message) formData.append('message', data.message);
        formData.append('message_type', data.message_type);
        if (data.file) formData.append('file', data.file);
        
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectPmChatMessage }>(`/crm-projects/${projectId}/pm-chat/messages`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Get manager info
     */
    getManagerInfo: async (projectId: number): Promise<{ success: boolean; data: PmChatManagerInfo }> => {
        const response = await apiClient.get<{ success: boolean; data: PmChatManagerInfo }>(`/crm-projects/${projectId}/pm-chat/manager-info`);
        return response.data;
    },

    /**
     * Assign manager
     */
    assignManager: async (projectId: number, managerId: number): Promise<{ success: boolean; message: string; data: CrmProject }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProject }>(`/crm-projects/${projectId}/assign-manager`, {
            manager_id: managerId,
        });
        return response.data;
    },

    /**
     * Get unread count
     */
    getUnreadCount: async (projectId: number): Promise<{ success: boolean; data: { unread_count: number } }> => {
        const response = await apiClient.get<{ success: boolean; data: { unread_count: number } }>(`/crm-projects/${projectId}/pm-chat/unread-count`);
        return response.data;
    },
};

// ==================== Project Expenses API ====================

export interface ProjectExpense {
    id: number;
    crm_project_id: number;
    type: 'project' | 'user';
    user_id: number | null;
    title: string;
    description: string | null;
    amount_cocchi: number;
    expense_date: string;
    category: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    approved_by: number | null;
    approved_at: string | null;
    rejection_reason: string | null;
    payment_method: string | null;
    receipt_file_path: string | null;
    receipt_file_name: string | null;
    is_reimbursement_request: boolean;
    created_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    user_name?: string;
    user_email?: string;
    created_by_name?: string;
    approved_by_name?: string;
}

export const crmProjectExpensesApi = {
    /**
     * Get all expenses for a project
     */
    getByProject: async (projectId: number, params?: {
        type?: 'project' | 'user';
        status?: 'pending' | 'approved' | 'rejected' | 'paid';
        user_id?: number;
        is_reimbursement_request?: boolean;
    }): Promise<{ success: boolean; data: ProjectExpense[]; totals: any }> => {
        const response = await apiClient.get<{ success: boolean; data: ProjectExpense[]; totals: any }>(`/crm-projects/${projectId}/expenses`, { params });
        return response.data;
    },

    /**
     * Create a new expense
     */
    create: async (projectId: number, data: {
        type: 'project' | 'user';
        user_id?: number | null;
        title: string;
        description?: string;
        amount_cocchi: number;
        expense_date: string;
        category?: string;
        payment_method?: string;
        is_reimbursement_request?: boolean;
        receipt_file?: File;
    }): Promise<{ success: boolean; message: string; data: ProjectExpense }> => {
        const formData = new FormData();
        formData.append('type', data.type);
        if (data.user_id) formData.append('user_id', data.user_id.toString());
        formData.append('title', data.title);
        if (data.description) formData.append('description', data.description);
        formData.append('amount_cocchi', data.amount_cocchi.toString());
        formData.append('expense_date', data.expense_date);
        if (data.category) formData.append('category', data.category);
        if (data.payment_method) formData.append('payment_method', data.payment_method);
        if (data.is_reimbursement_request !== undefined) formData.append('is_reimbursement_request', data.is_reimbursement_request ? '1' : '0');
        if (data.receipt_file) formData.append('receipt_file', data.receipt_file);

        const response = await apiClient.post<{ success: boolean; message: string; data: ProjectExpense }>(`/crm-projects/${projectId}/expenses`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Approve an expense
     */
    approve: async (projectId: number, expenseId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.put<{ success: boolean; message: string }>(`/crm-projects/${projectId}/expenses/${expenseId}/approve`);
        return response.data;
    },

    /**
     * Reject an expense
     */
    reject: async (projectId: number, expenseId: number, rejection_reason: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.put<{ success: boolean; message: string }>(`/crm-projects/${projectId}/expenses/${expenseId}/reject`, { rejection_reason });
        return response.data;
    },

    /**
     * Delete an expense
     */
    delete: async (projectId: number, expenseId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${projectId}/expenses/${expenseId}`);
        return response.data;
    },
};

// ==================== Project Financial API ====================

export interface FinancialTransaction {
    id: number | string;
    type: 'entrata' | 'uscita';
    amount_cocchi: number;
    description: string | null;
    category: string | null;
    transaction_date: string;
    reference_number: string | null;
    document_path: string | null;
    created_at: string;
}

export const crmProjectFinancialApi = {
    /**
     * Get all financial transactions for a project
     */
    getTransactions: async (projectId: number): Promise<{ success: boolean; data: FinancialTransaction[]; totals: any }> => {
        const response = await apiClient.get<{ success: boolean; data: FinancialTransaction[]; totals: any }>(`/crm-projects/${projectId}/financial/transactions`);
        return response.data;
    },

    /**
     * Create a new financial transaction
     */
    createTransaction: async (projectId: number, data: {
        type: 'entrata' | 'uscita';
        amount_cocchi: number;
        description: string;
        category?: string;
        transaction_date: string;
        reference_number?: string;
        document_path?: string;
    }): Promise<{ success: boolean; message: string; data: FinancialTransaction }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: FinancialTransaction }>(`/crm-projects/${projectId}/financial/transactions`, data);
        return response.data;
    },

    /**
     * Get CRM involved in project
     */
    getCrmInvolved: async (projectId: number): Promise<{ success: boolean; data: any[] }> => {
        const response = await apiClient.get<{ success: boolean; data: any[] }>(`/crm-projects/${projectId}/financial/crm-involved`);
        return response.data;
    },
};

// ==================== Task Types ====================

export type TaskExecutionMode = 'agent' | 'agent_human' | 'human';

export type TaskN8nStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface CrmProjectTaskN8nStep {
    id: number;
    crm_project_task_id?: number;
    step_key: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    title: string | null;
    message: string | null;
    payload?: unknown;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CrmProjectTask {
    id: number;
    crm_project_id: number;
    crm_label_id: number | null;
    title: string;
    description: string | null;
    work_notes?: string | null;
    status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    start_date: string | null;
    due_date: string | null;
    completed_date: string | null;
    progress: number;
    estimated_hours: number | null;
    actual_hours: number | null;
    budget_cocchi: number | null;
    parent_task_id: number | null;
    created_by: number;
    execution_mode?: TaskExecutionMode;
    exact_prompt?: boolean;
    n8n_status?: TaskN8nStatus | null;
    n8n_response?: unknown;
    n8n_response_format?: string | null;
    n8n_error?: string | null;
    n8n_completed_at?: string | null;
    n8nSteps?: CrmProjectTaskN8nStep[];
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    crmLabel?: {
        id: number;
        code: string;
        name: string;
        color: string;
        icon: string;
    };
    assignments?: CrmProjectTaskAssignment[];
    rescheduleRequests?: CrmProjectTaskRescheduleRequest[];
    comments?: CrmProjectTaskComment[];
    subtasks?: CrmProjectTask[];
    parentTask?: CrmProjectTask;
}

export interface CrmProjectTaskAssignment {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
    hourly_rate_cocchi: number | null;
    hours_requested: number | null;
    task_rate_cocchi: number | null;
    project_rate_cocchi: number | null;
    total_cost_cocchi: number | null;
    is_active: boolean;
    assigned_by: number;
    assigned_at: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
    };
    assigner?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface CrmProjectTaskRescheduleRequest {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    current_due_date: string;
    requested_due_date: string;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: number | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    reviewer?: {
        id: number;
        name: string;
        email: string;
    };
    task?: CrmProjectTask;
}

export interface CrmProjectTaskDeletionRequest {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: number | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
    updated_at: string;
    task?: CrmProjectTask;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    reviewer?: {
        id: number;
        name: string;
        email: string;
    };
}

// Calendar Types
export interface ProjectCalendarItem {
    id: number;
    project_id: number;
    type: 'event' | 'call' | 'deadline' | 'reminder';
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    call_link: string | null;
    call_notes: string | null;
    deadline_type: string | null;
    color: string | null;
    visibility: 'all' | 'freelance' | 'specific';
    created_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    checklist_items?: string | ChecklistItem[] | null;
    has_checklist?: boolean;
    visible_to?: number[];
    completed_at?: string | null;
    completed_by?: number | null;
}

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface CreateCalendarItemData {
    type: 'event' | 'call' | 'deadline' | 'reminder';
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    call_link?: string;
    call_notes?: string;
    deadline_type?: string;
    color?: string;
    visibility: 'all' | 'freelance' | 'specific';
    visible_to?: number[];
    checklist_items?: ChecklistItem[];
    has_checklist?: boolean;
    completed_at?: string | null;
    completed_by?: number | null;
}

export interface CrmProjectTaskCommentAttachment {
    id: number;
    crm_project_task_comment_id: number;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string | null;
    file_url?: string;
    created_at: string;
    updated_at: string;
}

export interface CrmProjectTaskAttachment {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string | null;
    file_url?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar?: string | null;
    };
}

export interface CrmProjectTaskComment {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    comment: string;
    is_note?: boolean;
    created_at: string;
    updated_at: string;
    attachments?: CrmProjectTaskCommentAttachment[];
    user?: {
        id: number;
        name: string;
        email: string;
        avatar?: string | null;
    };
}

export interface CrmProjectTaskEvent {
    id: number;
    crm_project_task_id: number;
    user_id: number;
    event_type: 'presa_in_carico' | 'rifiuto_incarico' | 'termine_incarico' | 'richiesta_spostamento' | 'modifica_scadenza' | 'aggiunta_note' | 'approvazione_spostamento' | 'rifiuto_spostamento' | 'aggiunta_allegato' | 'rimozione_allegato' | 'aggiornamento_stato' | 'completamento' | 'annullamento' | 'reassign' | 'assign' | string;
    event_data?: {
        old_due_date?: string;
        new_due_date?: string;
        requested_due_date?: string;
        [key: string]: any;
    };
    description?: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar?: string | null;
    };
}

// ==================== Task API ====================

export const crmProjectTasksApi = {
    /**
     * Get all tasks for a CRM project
     */
    getByProject: async (projectId: number, filters?: {
        status?: string;
        priority?: string;
        user_id?: number;
    }): Promise<{ success: boolean; data: CrmProjectTask[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTask[] }>(`/crm-projects/${projectId}/tasks`, {
            params: filters,
        });
        return response.data;
    },

    /**
     * Get single task
     */
    getById: async (projectId: number, taskId: number): Promise<{ success: boolean; data: CrmProjectTask }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTask }>(`/crm-projects/${projectId}/tasks/${taskId}`);
        return response.data;
    },

    /**
     * Create task
     */
    create: async (projectId: number, data: {
        title: string;
        description?: string;
        execution_mode: TaskExecutionMode;
        exact_prompt?: boolean;
        status?: string;
        priority?: string;
        start_date?: string;
        due_date?: string;
        estimated_hours?: number;
        budget_cocchi?: number;
        crm_label_id?: number | null;
        assignments?: Array<{
            user_id: number;
            payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
            hourly_rate_cocchi?: number;
            hours_requested?: number;
            task_rate_cocchi?: number;
            project_rate_cocchi?: number;
        }>;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTask }>(`/crm-projects/${projectId}/tasks`, data);
        return response.data;
    },

    /**
     * Update task
     */
    update: async (projectId: number, taskId: number, data: Partial<CrmProjectTask>): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProjectTask }>(`/crm-projects/${projectId}/tasks/${taskId}`, data);
        return response.data;
    },

    /**
     * Delete task
     */
    delete: async (projectId: number, taskId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${projectId}/tasks/${taskId}`);
        return response.data;
    },

    /**
     * Update due date (admin/manager only)
     */
    updateDueDate: async (projectId: number, taskId: number, dueDate: string): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProjectTask }>(`/crm-projects/${projectId}/tasks/${taskId}/update-due-date`, {
            due_date: dueDate,
        });
        return response.data;
    },

    /**
     * Create reschedule request
     */
    createRescheduleRequest: async (projectId: number, taskId: number, data: {
        requested_due_date: string;
        reason?: string;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTaskRescheduleRequest }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTaskRescheduleRequest }>(`/crm-projects/${projectId}/tasks/${taskId}/reschedule-request`, data);
        return response.data;
    },

    /**
     * Get reschedule requests
     */
    getRescheduleRequests: async (projectId: number): Promise<{ success: boolean; data: CrmProjectTaskRescheduleRequest[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskRescheduleRequest[] }>(`/crm-projects/${projectId}/tasks/reschedule-requests`);
        return response.data;
    },

    /**
     * Review reschedule request
     */
    reviewRescheduleRequest: async (projectId: number, requestId: number, data: {
        status: 'approved' | 'rejected';
        review_notes?: string;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTaskRescheduleRequest }> => {
        const response = await apiClient.put<{ success: boolean; message: string; data: CrmProjectTaskRescheduleRequest }>(`/crm-projects/${projectId}/tasks/reschedule-requests/${requestId}/review`, data);
        return response.data;
    },

    /**
     * Get events for a task
     */
    getEvents: async (projectId: number, taskId: number): Promise<{ success: boolean; data: CrmProjectTaskEvent[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskEvent[] }>(`/crm-projects/${projectId}/tasks/${taskId}/events`);
        return response.data;
    },

    /**
     * Step / chat agente N8N (polling mentre workflow attivo)
     */
    getN8nSteps: async (projectId: number, taskId: number): Promise<{
        success: boolean;
        data: {
            task_id: number;
            execution_mode: string;
            n8n_status: TaskN8nStatus | null;
            n8n_execution_id: string | null;
            n8n_error: string | null;
            n8n_completed_at: string | null;
            progress: number | null;
            steps: CrmProjectTaskN8nStep[];
        };
    }> => {
        const response = await apiClient.get(`/crm-projects/${projectId}/tasks/${taskId}/n8n-steps`);
        return response.data;
    },

    /**
     * Controlli agente N8N (restart, stop, request_review)
     */
    n8nAction: async (projectId: number, taskId: number, data: {
        action: 'restart' | 'stop' | 'request_review' | 'update_progress';
        review_message?: string;
        progress?: number;
    }): Promise<{
        success: boolean;
        message: string;
        data?: {
            task_id: number;
            action: string;
            n8n_status: TaskN8nStatus | null;
        };
    }> => {
        const response = await apiClient.post(`/crm-projects/${projectId}/tasks/${taskId}/n8n-actions`, data);
        return response.data;
    },

    /**
     * Get notes for a task
     */
    getNotes: async (projectId: number, taskId: number): Promise<{ success: boolean; data: CrmProjectTaskComment[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskComment[] }>(`/crm-projects/${projectId}/tasks/${taskId}/notes`);
        return response.data;
    },

    /**
     * Create a note on a task (text and/or files)
     */
    createNote: async (
        projectId: number,
        taskId: number,
        data: { comment?: string; files?: File[] }
    ): Promise<{ success: boolean; message: string; data: CrmProjectTaskComment }> => {
        const formData = new FormData();
        if (data.comment) formData.append('comment', data.comment);
        if (data.files?.length) {
            data.files.forEach((file) => formData.append('files[]', file));
        }
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTaskComment }>(
            `/crm-projects/${projectId}/tasks/${taskId}/notes`,
            formData
        );
        return response.data;
    },

    /**
     * Auto-save work notes
     */
    updateWorkNotes: async (
        projectId: number,
        taskId: number,
        workNotes: string
    ): Promise<{ success: boolean; message: string; data: { work_notes: string | null; updated_at: string } }> => {
        const response = await apiClient.patch<{ success: boolean; message: string; data: { work_notes: string | null; updated_at: string } }>(
            `/crm-projects/${projectId}/tasks/${taskId}/work-notes`,
            { work_notes: workNotes }
        );
        return response.data;
    },

    /**
     * Task attachments
     */
    getAttachments: async (projectId: number, taskId: number): Promise<{ success: boolean; data: CrmProjectTaskAttachment[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskAttachment[] }>(
            `/crm-projects/${projectId}/tasks/${taskId}/attachments`
        );
        return response.data;
    },

    uploadAttachment: async (
        projectId: number,
        taskId: number,
        file: File
    ): Promise<{ success: boolean; message: string; data: CrmProjectTaskAttachment }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTaskAttachment }>(
            `/crm-projects/${projectId}/tasks/${taskId}/attachments`,
            formData
        );
        return response.data;
    },

    deleteAttachment: async (
        projectId: number,
        taskId: number,
        attachmentId: number
    ): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/crm-projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`
        );
        return response.data;
    },

    /**
     * Lifecycle actions
     */
    takeCharge: async (projectId: number, taskId: number): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTask }>(
            `/crm-projects/${projectId}/tasks/${taskId}/take-charge`
        );
        return response.data;
    },

    deliver: async (
        projectId: number,
        taskId: number,
        data?: { satisfaction?: number; feedback?: string }
    ): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTask }>(
            `/crm-projects/${projectId}/tasks/${taskId}/deliver`,
            data ?? {}
        );
        return response.data;
    },

    /**
     * Reassign task to another user
     */
    reassign: async (projectId: number, taskId: number, data: {
        new_user_id: number;
        new_due_date: string;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTask }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTask }>(`/crm-projects/${projectId}/tasks/${taskId}/reassign`, data);
        return response.data;
    },

    /**
     * Create deletion request for a task
     */
    createDeletionRequest: async (projectId: number, taskId: number, data: {
        reason: string;
    }): Promise<{ success: boolean; message: string; data: CrmProjectTaskDeletionRequest }> => {
        const response = await apiClient.post<{ success: boolean; message: string; data: CrmProjectTaskDeletionRequest }>(
            `/crm-projects/${projectId}/tasks/${taskId}/deletion-request`,
            data
        );
        return response.data;
    },

    /**
     * Get deletion requests for a project
     */
    getDeletionRequests: async (projectId: number): Promise<{ success: boolean; data: CrmProjectTaskDeletionRequest[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskDeletionRequest[] }>(
            `/crm-projects/${projectId}/tasks/deletion-requests`
        );
        return response.data;
    },

    /**
     * Get deletion requests for a specific task
     */
    getTaskDeletionRequests: async (projectId: number, taskId: number): Promise<{ success: boolean; data: CrmProjectTaskDeletionRequest[] }> => {
        const response = await apiClient.get<{ success: boolean; data: CrmProjectTaskDeletionRequest[] }>(
            `/crm-projects/${projectId}/tasks/${taskId}/deletion-requests`
        );
        return response.data;
    },
};

// ==================== Project Calendar API ====================

export const projectCalendarApi = {
    /**
     * Get all calendar items for a project
     */
    getItems: async (projectId: number): Promise<{ success: boolean; data: { events: ProjectCalendarItem[]; tasks: any[] } }> => {
        const response = await apiClient.get<{ success: boolean; data: { events: ProjectCalendarItem[]; tasks: any[] } }>(`/crm-projects/${projectId}/calendar/items`);
        return response.data;
    },

    /**
     * Create a new calendar item
     */
    createItem: async (projectId: number, data: CreateCalendarItemData): Promise<{ success: boolean; data: ProjectCalendarItem; message: string }> => {
        const response = await apiClient.post<{ success: boolean; data: ProjectCalendarItem; message: string }>(`/crm-projects/${projectId}/calendar/items`, data);
        return response.data;
    },

    /**
     * Update a calendar item
     */
    updateItem: async (projectId: number, itemId: number, data: Partial<CreateCalendarItemData>): Promise<{ success: boolean; data: ProjectCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: ProjectCalendarItem; message: string }>(`/crm-projects/${projectId}/calendar/items/${itemId}`, data);
        return response.data;
    },

    /**
     * Delete a calendar item
     */
    deleteItem: async (projectId: number, itemId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/crm-projects/${projectId}/calendar/items/${itemId}`);
        return response.data;
    },

    /**
     * Update item position after drag & drop
     */
    dragItem: async (projectId: number, itemId: number, startTime: string, endTime: string): Promise<{ success: boolean; data: ProjectCalendarItem; message: string }> => {
        const response = await apiClient.put<{ success: boolean; data: ProjectCalendarItem; message: string }>(`/crm-projects/${projectId}/calendar/items/${itemId}/drag`, {
            start_time: startTime,
            end_time: endTime
        });
        return response.data;
    },
};

