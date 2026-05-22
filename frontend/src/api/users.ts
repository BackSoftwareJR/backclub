import apiClient from './client';

// ==================== Types ====================

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'freelance' | 'client' | 'venditori';
    roles?: string[]; // Array of roles for multi-role support
    current_role?: string; // Currently selected role
    avatar?: string;
    phone?: string;
    department?: string;
    hire_date?: string;
    salary_cocchi?: number;
    notes?: string;
    last_login_at?: string;
    permissions?: string;
    is_active: number; // 1 = active, 0 = inactive
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateUserData {
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'freelance' | 'client' | 'venditori';
    phone?: string;
    department?: string;
    is_active?: boolean;
    roles?: string[]; // Array of roles for multi-role support
    crm_department_ids?: number[]; // Array of CRM department IDs
}

export interface UpdateUserData extends Partial<Omit<CreateUserData, 'password'>> {
    password?: string;
    roles?: string[]; // Array of roles for multi-role support
    crm_department_ids?: number[]; // Array of CRM department IDs
}

// ==================== API Functions ====================

/**
 * Get all users with optional filters
 */
export const getUsers = async (filters?: { role?: string }) => {
    const response = await apiClient.get('/users', { params: filters });
    return response.data;
};

/**
 * Get a single user by ID
 */
export const getUser = async (id: number) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
};

/**
 * Create a new user
 */
export const createUser = async (data: CreateUserData) => {
    const response = await apiClient.post('/users', data);
    return response.data;
};

/**
 * Update an existing user
 */
export const updateUser = async (id: number, data: UpdateUserData) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
};

/**
 * Delete a user
 */
export const deleteUser = async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
};

/**
 * Toggle user access (suspend/activate)
 */
export const toggleUserAccess = async (id: number) => {
    const response = await apiClient.post(`/users/${id}/toggle-access`);
    return response.data;
};

/**
 * Reset user password
 */
export const resetUserPassword = async (id: number, password: string) => {
    const response = await apiClient.post(`/users/${id}/reset-password`, { password });
    return response.data;
};

// Export all functions as default object
export const usersApi = {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    toggleUserAccess,
    resetUserPassword,
};

