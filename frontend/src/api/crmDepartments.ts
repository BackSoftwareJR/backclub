import apiClient from './client';

// ==================== Types ====================

export interface CrmDepartment {
    id: number;
    code: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    budget_allocated: number;
    budget_spent: number;
    budget_remaining: number;
    is_active: boolean;
    manager_id: number | null;
    created_at: string;
    updated_at: string;
    
    // Relationships
    manager?: {
        id: number;
        name: string;
        email: string;
    };
    
    // Stats
    team_members_count?: number;
    active_expenses_count?: number;
    projects_count?: number;
}

export interface CrmDepartmentStats {
    total_departments: number;
    active_departments: number;
    total_budget: number;
    total_spent: number;
    total_projects: number;
}

// ==================== API Functions ====================

/**
 * Get all CRM departments
 */
export const getCrmDepartments = async (activeOnly: boolean = true): Promise<CrmDepartment[]> => {
    try {
        const response = await apiClient.get('/budget/crm', {
            params: { active_only: activeOnly }
        });
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch CRM departments');
    } catch (error: any) {
        console.error('Error fetching CRM departments:', error);
        throw error.response?.data?.message || error.message || 'Error loading CRM departments';
    }
};

/**
 * Get single CRM department by code
 */
export const getCrmDepartment = async (code: string): Promise<CrmDepartment> => {
    try {
        const response = await apiClient.get(`/budget/crm/${code}`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch CRM department');
    } catch (error: any) {
        console.error('Error fetching CRM department:', error);
        throw error.response?.data?.message || error.message || 'Error loading CRM department';
    }
};

/**
 * Update CRM department
 */
export const updateCrmDepartment = async (code: string, data: Partial<CrmDepartment>): Promise<CrmDepartment> => {
    try {
        const response = await apiClient.put(`/budget/crm/${code}`, data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update CRM department');
    } catch (error: any) {
        console.error('Error updating CRM department:', error);
        throw error.response?.data?.message || error.message || 'Error updating CRM department';
    }
};

/**
 * Create new CRM department
 */
export const createCrmDepartment = async (data: {
    code: string;
    name: string;
    description?: string | null;
    color?: string;
    icon?: string | null;
    budget_allocated?: number;
    manager_id?: number | null;
    is_active?: boolean;
}): Promise<CrmDepartment> => {
    try {
        const response = await apiClient.post('/budget/crm', data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create CRM department');
    } catch (error: any) {
        console.error('Error creating CRM department:', error);
        throw error.response?.data?.message || error.message || 'Error creating CRM department';
    }
};

/**
 * Update CRM department budget
 */
export const updateCrmDepartmentBudget = async (code: string, budgetAllocated: number): Promise<CrmDepartment> => {
    try {
        const response = await apiClient.put(`/budget/crm/${code}/budget`, {
            budget_allocated: budgetAllocated
        });
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update budget');
    } catch (error: any) {
        console.error('Error updating budget:', error);
        throw error.response?.data?.message || error.message || 'Error updating budget';
    }
};

