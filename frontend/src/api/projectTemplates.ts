import apiClient from './client';

// ==================== Types ====================

export interface ProjectTemplate {
    id: number;
    code: string;
    name: string;
    description: string | null;
    project_type_id: number | null;
    icon: string | null;
    color: string;
    default_duration_days: number;
    has_tasks: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    
    // Counts
    roles_count?: number;
    tasks_count?: number;
    
    // Relations
    project_type?: any;
    roles?: TemplateRole[];
    tasks?: TemplateTask[];
}

export interface TemplateRole {
    id: number;
    template_id: number;
    role_code: string;
    role_name: string;
    is_required: boolean;
    created_at: string;
    updated_at: string;
}

export interface TemplateTask {
    id: number;
    template_id: number;
    role_code: string | null;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    start_offset_days: number;
    due_offset_days: number;
    estimated_hours: number | null;
    order_index: number;
    dependencies: any | null;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateData {
    code: string;
    name: string;
    description?: string;
    project_type_id?: number;
    icon?: string;
    color?: string;
    default_duration_days?: number;
    has_tasks?: boolean;
    is_active?: boolean;
}

export interface RoleAssignment {
    role_code: string;
    user_id: number;
}

export interface CreateProjectFromTemplateData {
    name: string;
    client_id: number;
    manager_id: number;
    start_date: string;
    end_date?: string;
    description?: string;
    status?: string;
    priority?: string;
    budget?: number;
    role_assignments: RoleAssignment[];
}

// ==================== API Functions ====================

/**
 * Get all templates
 */
export const getTemplates = async (params?: {
    active_only?: boolean;
    with_tasks?: boolean;
}): Promise<ProjectTemplate[]> => {
    try {
        const response = await apiClient.get('/project-templates', { params });
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch templates');
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        throw error.response?.data?.message || error.message || 'Error loading templates';
    }
};

/**
 * Get single template with full details
 */
export const getTemplate = async (templateId: number): Promise<ProjectTemplate> => {
    try {
        const response = await apiClient.get(`/project-templates/${templateId}`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch template');
    } catch (error: any) {
        console.error('Error fetching template:', error);
        throw error.response?.data?.message || error.message || 'Error loading template';
    }
};

/**
 * Create new template
 */
export const createTemplate = async (data: CreateTemplateData): Promise<ProjectTemplate> => {
    try {
        const response = await apiClient.post('/project-templates', data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create template');
    } catch (error: any) {
        console.error('Error creating template:', error);
        
        if (error.response?.data?.errors) {
            const errors = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(errors);
        }
        
        throw error.response?.data?.message || error.message || 'Error creating template';
    }
};

/**
 * Update template
 */
export const updateTemplate = async (templateId: number, data: Partial<CreateTemplateData>): Promise<ProjectTemplate> => {
    try {
        const response = await apiClient.put(`/project-templates/${templateId}`, data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update template');
    } catch (error: any) {
        console.error('Error updating template:', error);
        
        if (error.response?.data?.errors) {
            const errors = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(errors);
        }
        
        throw error.response?.data?.message || error.message || 'Error updating template';
    }
};

/**
 * Delete template
 */
export const deleteTemplate = async (templateId: number): Promise<void> => {
    try {
        const response = await apiClient.delete(`/project-templates/${templateId}`);
        
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete template');
        }
    } catch (error: any) {
        console.error('Error deleting template:', error);
        throw error.response?.data?.message || error.message || 'Error deleting template';
    }
};

/**
 * Duplicate template
 */
export const duplicateTemplate = async (templateId: number): Promise<ProjectTemplate> => {
    try {
        const response = await apiClient.post(`/project-templates/${templateId}/duplicate`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to duplicate template');
    } catch (error: any) {
        console.error('Error duplicating template:', error);
        throw error.response?.data?.message || error.message || 'Error duplicating template';
    }
};

/**
 * Export template to JSON
 */
export const exportTemplate = async (templateId: number): Promise<any> => {
    try {
        const response = await apiClient.get(`/project-templates/${templateId}/export`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to export template');
    } catch (error: any) {
        console.error('Error exporting template:', error);
        throw error.response?.data?.message || error.message || 'Error exporting template';
    }
};

/**
 * Import template from JSON
 */
export const importTemplate = async (templateData: string): Promise<ProjectTemplate> => {
    try {
        const response = await apiClient.post('/project-templates/import', { template_data: templateData });
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to import template');
    } catch (error: any) {
        console.error('Error importing template:', error);
        throw error.response?.data?.message || error.message || 'Error importing template';
    }
};

/**
 * Create project from template
 */
export const createProjectFromTemplate = async (
    templateId: number,
    data: CreateProjectFromTemplateData
): Promise<{ project: any; tasks: any[] }> => {
    try {
        const response = await apiClient.post(`/project-templates/${templateId}/create-project`, data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create project from template');
    } catch (error: any) {
        console.error('Error creating project from template:', error);
        
        if (error.response?.data?.errors) {
            const errors = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(errors);
        }
        
        throw error.response?.data?.message || error.message || 'Error creating project from template';
    }
};

/**
 * Add role to template
 */
export const addRoleToTemplate = async (templateId: number, roleData: {
    role_code: string;
    role_name: string;
    is_required?: boolean;
}): Promise<TemplateRole> => {
    try {
        const response = await apiClient.post(`/project-templates/${templateId}/roles`, roleData);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to add role');
    } catch (error: any) {
        console.error('Error adding role:', error);
        throw error.response?.data?.message || error.message || 'Error adding role';
    }
};

/**
 * Add task to template
 */
export const addTaskToTemplate = async (templateId: number, taskData: Partial<TemplateTask>): Promise<TemplateTask> => {
    try {
        const response = await apiClient.post(`/project-templates/${templateId}/tasks`, taskData);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to add task');
    } catch (error: any) {
        console.error('Error adding task:', error);
        throw error.response?.data?.message || error.message || 'Error adding task';
    }
};

export default {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
    createProjectFromTemplate,
    addRoleToTemplate,
    addTaskToTemplate,
};

