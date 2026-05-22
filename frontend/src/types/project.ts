// Project types
import type { User } from './user';

export interface Project {
    id: number;
    name: string;
    description?: string;
    client_id: number;
    manager_id: number;
    start_date: string;
    end_date?: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    budget?: number;
    created_at: string;
    updated_at: string;

    // Relationships
    client?: Client;
    manager?: User;
    members?: User[];
    tasks?: Task[];
}

export interface Client {
    id: number;
    company_name: string;
    vat_number?: string;
    address?: string;
    phone?: string;
    email?: string;
    access_enabled: boolean;
    access_password?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    project_id: number;
    status: 'pending' | 'in_progress' | 'completed' | 'reschedule_requested';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    created_by: number;
    created_at: string;
    updated_at: string;

    // Relationships
    project?: Project;
    assignees?: User[];
    createdBy?: User;
    comments?: TaskComment[];
}

export interface TaskComment {
    id: number;
    task_id: number;
    user_id: number;
    comment: string;
    created_at: string;
    updated_at: string;

    user?: User;
}

export interface CreateProjectData {
    name: string;
    client_id: number;
    manager_id: number;
    start_date: string;
    status: Project['status'];
    priority: Project['priority'];
    description?: string;
    budget?: number;
    end_date?: string;
    members?: number[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> { }

export interface CreateTaskData {
    title: string;
    project_id: number;
    status: Task['status'];
    priority: Task['priority'];
    description?: string;
    due_date?: string;
    assignees?: number[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> { }
