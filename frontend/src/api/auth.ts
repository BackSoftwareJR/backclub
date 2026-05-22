import apiClient from './client';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/user';

export const authApi = {
    // Login with email and password
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/login', credentials);
        return response.data;
    },

    // Register new user
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/register', data);
        return response.data;
    },

    // Logout current user
    logout: async (): Promise<void> => {
        await apiClient.post('/logout');
    },

    // Get current authenticated user
    me: async (): Promise<User> => {
        const response = await apiClient.get<User>('/me');
        return response.data;
    },

    // Update password
    updatePassword: async (data: {
        current_password: string;
        new_password: string;
        new_password_confirmation: string;
    }): Promise<{ message: string }> => {
        const response = await apiClient.put<{ message: string }>('/user/password', data);
        return response.data;
    },

    // Change current role
    changeRole: async (role: string): Promise<{ message: string; user: User }> => {
        const response = await apiClient.post<{ message: string; user: User }>('/change-role', { role });
        return response.data;
    },

    // Change current CRM department
    changeCrmDepartment: async (crmDepartmentId: number): Promise<{ message: string; user: User }> => {
        const response = await apiClient.post<{ message: string; user: User }>('/change-crm-department', { 
            crm_department_id: crmDepartmentId 
        });
        return response.data;
    },

    // Update onboarding preferences
    updateOnboardingPreferences: async (data: {
        onboarding_completed?: boolean;
        preferred_language?: string;
        preferred_theme?: string;
    }): Promise<{ message: string; user: User }> => {
        const response = await apiClient.post<{ message: string; user: User }>('/onboarding-preferences', data);
        return response.data;
    },
};

export default authApi;
