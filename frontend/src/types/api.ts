// API response types
export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface DashboardStats {
    task_performance: {
        completed_30d: number;
        overdue: number;
        completed_this_week: number;
        increment_percentage: number;
    };
    payment_analytics: {
        cocchi_paid_30d: number;
        cocchi_overdue: number;
        installments_paid: number;
    };
    team_efficiency: Array<{
        id: number;
        initials: string;
        name: string;
        completed: number;
        percentage: number;
    }>;
    notifications: Array<{
        id: string;
        avatar: string;
        title: string;
        message: string;
        time: string;
        read: boolean;
        urgent: boolean;
    }>;
    agenda_items: Array<{
        id: number;
        tipo: 'avviso' | 'comunicazione' | 'appunto';
        titolo: string;
        contenuto: string;
        data: string;
        pinnato: boolean;
        autore: string;
    }>;
}

export interface RecentActivity {
    id: string;
    title: string;
    time: string;
    type: string;
    project: string;
    status_label: string;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    status?: number;
}
