import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api-public', // TEMP: endpoint pubblico per test
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Types
export interface UserSearchResult {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: number; // 1 = active, 0 = inactive
    total_hours: number;
    total_payments: number;
    active_projects: number;
}

export interface WorkHour {
    id: number;
    user_id: number;
    project_id: number | null;
    project_name: string | null;
    date: string;
    hours: number;
    hourly_rate: number | null;
    description: string | null;
    approved_by: number | null;
    approved_at: string | null;
}

export interface Compensation {
    id: number;
    user_id: number;
    type: 'hourly' | 'task' | 'project';
    base_rate: number;
    effective_from: string;
    effective_to: string | null;
    notes: string | null;
}

export interface UserNote {
    id: number;
    user_id: number;
    note: string;
    created_by: number;
    author_name: string;
    is_private: boolean;
    created_at: string;
}

// API Methods
export const userManagementApi = {
    // Search
    search: async (filters: {
        q?: string;
        role?: string;
        status?: string;
        sort_by?: string;
        sort_dir?: 'asc' | 'desc';
        per_page?: number;
    }) => {
        const response = await axios.get('/backend/test-simple.php', { params: filters });
        return response.data;
    },

    // Detail - mock per ora
    getDetail: async (id: number) => {
        return { success: true, data: { id, name: 'User ' + id } };
    },

    // Altri metodi - mock
    getWorkHours: async (_id?: number, _filters?: any) => ({ success: true, data: [] }),
    addWorkHours: async (_id?: number, _data?: any) => ({ success: true }),
    updateWorkHours: async (_id?: number, _hourId?: number, _data?: any) => ({ success: true }),
    deleteWorkHours: async (_id?: number, _hourId?: number) => ({ success: true }),
    getCompensation: async (_id?: number) => ({ success: true, data: [] }),
    addCompensation: async (_id?: number, _data?: any) => ({ success: true }),
    updateCompensation: async (_id?: number, _compId?: number, _data?: any) => ({ success: true }),
    getProjects: async (_id?: number) => ({ success: true, data: [] }),
    getPayments: async (_id?: number, _filters?: any) => ({ success: true, data: [] }),
    getNotes: async (_id?: number) => ({ success: true, data: [] }),
    addNote: async (_id?: number, _data?: any) => ({ success: true }),
    deleteNote: async (_id?: number, _noteId?: number) => ({ success: true }),
    getStats: async (_id?: number, _filters?: any) => ({
        success: true,
        data: {
            total_hours: 0,
            total_payments: 0,
            active_projects: 0,
            avg_hourly_rate: 0
        }
    }),
};
