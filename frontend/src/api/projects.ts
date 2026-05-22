import apiClient from './client';

// ==================== Types ====================

export interface ProjectType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    default_duration_days: number | null;
    is_active: boolean;
}

export interface Client {
    id: number;
    company_name: string;
    email: string;
    phone: string | null;
}

export interface ProjectManager {
    id: number;
    name: string;
    email: string;
}

export interface TeamMember {
    id: number;
    project_id: number;
    user_id: number;
    role: string;
    payment_type: 'fisso' | 'orario' | 'percentuale' | 'cocchi';
    payment_amount: number;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    user: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
        role: string;
    };
}

export interface Project {
    id: number;
    name: string;
    description: string | null;
    project_type_id: number;
    client_id: number;
    manager_id: number;
    crm_department_id: number | null;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    start_date: string;
    end_date: string | null;
    due_date: string | null;
    budget_allocated: number;
    budget_spent: number;
    budget_cocchi: number | null;
    spent_cocchi: number;
    progress_percentage: number;
    budget_remaining: number;
    is_overdue: boolean;
    contratto_url: string | null;
    link_foto_video: string | null;
    link_cartella_documenti: string | null;
    link_cartella_social: string | null;
    link_cartella_credenziali: string | null;
    client: Client;
    manager: ProjectManager;
    project_type: ProjectType;
    members?: TeamMember[];
    created_at: string;
    updated_at: string;
}

export interface ProjectStats {
    total: number;
    active: number;
    pending: number;
    completed: number;
    overdue: number;
    total_budget: number;
    total_spent: number;
    team_members_count: number;
}

export interface ChatMessage {
    id: number;
    project_id: number;
    user_id: number;
    message: string;
    is_pm_chat: boolean;
    parent_message_id: number | null;
    attachments: any[] | null;
    is_read: boolean;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar: string | null;
    };
}

export interface CalendarEvent {
    id: number;
    project_id: number | null;
    crm_department_id: number | null;
    user_id: number;
    type: 'task' | 'event' | 'call' | 'meeting' | 'document';
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string | null;
    all_day: boolean;
    location: string | null;
    participants: number[] | null;
    attachments: any[] | null;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    reminder_minutes: number | null;
    created_at: string;
    creator: {
        id: number;
        name: string;
    };
}

// ==================== Public CRM Projects (website) ====================

export interface CrmPublicProject {
    id: number;
    name: string;
    client_id: number;
    client_name: string | null;
    status: string;
    is_public: boolean;
    public_slug: string | null;
    public_title: string | null;
    public_subtitle: string | null;
    public_short_description: string | null;
    public_category: string | null;
    public_status_label: string | null;
    public_hero_image_url: string | null;
    public_technologies: string[];
}

// ==================== API Methods ====================

export const projectsApi = {
    /**
     * Get all projects with filters
     */
    getAll: async (params?: {
        status?: string;
        search?: string;
        project_type_id?: number;
        client_id?: number;
        crm_department_id?: number;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Project[];
            stats: ProjectStats;
        }>('/projects', { params });
        return response.data;
    },

    /**
     * Get single project with full details
     */
    getById: async (projectId: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: Project & {
                stats: {
                    total_tasks: number;
                    completed_tasks: number;
                    pending_tasks: number;
                    team_size: number;
                    total_purchases: number;
                    unread_messages: number;
                    upcoming_events: number;
                };
                timeline_percentage: number;
            };
        }>(`/projects/${projectId}`);
        return response.data;
    },

    /**
     * Create new project
     */
    create: async (data: {
        name: string;
        project_type_id: number;
        client_id: number;
        manager_id: number;
        crm_department_id?: number;
        description?: string;
        status: string;
        priority?: string;
        start_date: string;
        end_date?: string;
        due_date?: string;
        budget_allocated?: number;
        budget_cocchi?: number;
        contratto_url?: string;
        link_foto_video?: string;
        link_cartella_documenti?: string;
        link_cartella_social?: string;
        link_cartella_credenziali?: string;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: Project;
        }>('/projects', data);
        return response.data;
    },

    /**
     * Update project
     */
    update: async (projectId: number, data: Partial<Project>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: Project;
        }>(`/projects/${projectId}`, data);
        return response.data;
    },

    /**
     * Delete project
     */
    delete: async (projectId: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/projects/${projectId}`);
        return response.data;
    },

    /**
     * Get project types
     */
    getProjectTypes: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: ProjectType[];
        }>('/project-types');
        return response.data;
    },

    /**
     * Get available clients
     */
    getAvailableClients: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: Client[];
        }>('/available-clients');
        return response.data;
    },

    /**
     * Get dashboard stats
     */
    getDashboardStats: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: {
                projects_by_status: {
                    active: number;
                    planning: number;
                    on_hold: number;
                    completed: number;
                    cancelled: number;
                };
                budget_overview: {
                    total_allocated: number;
                    total_spent: number;
                    total_remaining: number;
                };
                tasks_overview: {
                    total: number;
                    completed: number;
                    pending: number;
                };
                overdue_projects: number;
                recent_projects: Project[];
            };
        }>('/projects-dashboard-stats');
        return response.data;
    },

    // ==================== Team Members ====================

    /**
     * Get project team members
     */
    getTeamMembers: async (projectId: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: TeamMember[];
        }>(`/projects/${projectId}/members`);
        return response.data;
    },

    /**
     * Add team member
     */
    addTeamMember: async (projectId: number, data: {
        user_id: number;
        role: string;
        payment_type: 'fisso' | 'orario' | 'percentuale' | 'cocchi';
        payment_amount: number;
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: TeamMember;
        }>(`/projects/${projectId}/members`, data);
        return response.data;
    },

    /**
     * Update team member
     */
    updateTeamMember: async (projectId: number, memberId: number, data: Partial<TeamMember>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: TeamMember;
        }>(`/projects/${projectId}/members/${memberId}`, data);
        return response.data;
    },

    /**
     * Remove team member
     */
    removeTeamMember: async (projectId: number, memberId: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/projects/${projectId}/members/${memberId}`);
        return response.data;
    },

    /**
     * Get available users
     */
    getAvailableUsers: async () => {
        const response = await apiClient.get<{
            success: boolean;
            data: any[];
        }>('/available-users');
        return response.data;
    },

    // ==================== Chat ====================

    /**
     * Get project chat messages
     */
    getChatMessages: async (projectId: number, params?: {
        is_pm_chat?: boolean;
        limit?: number;
        offset?: number;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: ChatMessage[];
            has_more: boolean;
        }>(`/projects/${projectId}/chat`, { params });
        return response.data;
    },

    /**
     * Send chat message
     */
    sendChatMessage: async (projectId: number, data: {
        message: string;
        is_pm_chat?: boolean;
        parent_message_id?: number;
        attachments?: any[];
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: ChatMessage;
        }>(`/projects/${projectId}/chat`, data);
        return response.data;
    },

    // ==================== Calendar ====================

    /**
     * Get calendar events
     */
    getCalendarEvents: async (params?: {
        project_id?: number;
        start_date?: string;
        end_date?: string;
        type?: string;
        status?: string;
    }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CalendarEvent[];
        }>('/calendar/events', { params });
        return response.data;
    },

    /**
     * Create calendar event
     */
    createCalendarEvent: async (data: {
        project_id?: number;
        type: string;
        title: string;
        description?: string;
        start_datetime: string;
        end_datetime?: string;
        all_day?: boolean;
        location?: string;
        participants?: number[];
        status?: string;
        reminder_minutes?: number;
    }) => {
        const response = await apiClient.post<{
            success: boolean;
            message: string;
            data: CalendarEvent;
        }>('/calendar/events', data);
        return response.data;
    },

    /**
     * Update calendar event
     */
    updateCalendarEvent: async (eventId: number, data: Partial<CalendarEvent>) => {
        const response = await apiClient.put<{
            success: boolean;
            message: string;
            data: CalendarEvent;
        }>(`/calendar/events/${eventId}`, data);
        return response.data;
    },

    /**
     * Delete calendar event
     */
    deleteCalendarEvent: async (eventId: number) => {
        const response = await apiClient.delete<{
            success: boolean;
            message: string;
        }>(`/calendar/events/${eventId}`);
        return response.data;
    },

    /**
     * Get upcoming events
     */
    getUpcomingEvents: async (limit?: number) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CalendarEvent[];
        }>('/calendar/upcoming', { params: { limit } });
        return response.data;
    },

    // ==================== Public CRM Projects settings ====================

    /**
     * Get CRM projects public settings list
     */
    getCrmPublicSettings: async (params?: { client_id?: number }) => {
        const response = await apiClient.get<{
            success: boolean;
            data: CrmPublicProject[];
        }>('/crm-projects/public-settings', { params });
        return response.data;
    },

    /**
     * Update CRM project public settings
     */
    updateCrmPublicSettings: async (
        projectId: number,
        data: Partial<{
            is_public: boolean;
            public_slug: string | null;
            public_title: string | null;
            public_subtitle: string | null;
            public_short_description: string | null;
            public_long_description: string | null;
            public_category: string | null;
            public_status_label: string | null;
            public_hero_image_url: string | null;
            public_technologies: string[];
        }>
    ) => {
        const response = await apiClient.put<{
            success: boolean;
            data: CrmPublicProject;
        }>(`/crm-projects/${projectId}/public-settings`, data);
        return response.data;
    },
};

export default projectsApi;
