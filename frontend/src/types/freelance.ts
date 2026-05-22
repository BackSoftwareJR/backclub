import type { CrmProject, CrmProjectTask } from '../api/crmProjects';
import type { CrmProjectPmChatMessage } from '../api/crmProjects';

// Extended types for Freelance Portal
export interface FreelanceProject extends CrmProject {
  progress?: number; // Calculated progress percentage (overall project if PM, my tasks otherwise)
  myTasksCount?: number; // Tasks assigned to current user
  totalTasksCount?: number; // All tasks in project (used for PM card label)
  unreadMessages?: number; // Unread chat messages
  is_project_manager?: boolean; // Current user is the project manager
}

export interface FreelanceTask extends CrmProjectTask {
  project?: {
    id: number;
    name: string;
    crmDepartment?: {
      id: number;
      code: string;
      name: string;
      color: string;
      icon: string;
    };
  };
  isOverdue?: boolean; // Calculated: due_date < today
  hoursUntilDue?: number; // Calculated hours until due date
}

export interface FreelanceDashboardStats {
  activeProjects: number;
  pendingTasks: number;
  unreadMessages: number;
  activeTasksToday: number;
  upNextTasks: FreelanceTask[];
}

export interface SupportTicket {
  id: number;
  type: 'tool_request' | 'blocking_issue' | 'vacation_request';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ProjectChatChannel {
  projectId: number;
  projectName: string;
  lastMessage?: CrmProjectPmChatMessage;
  unreadCount: number;
  manager?: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
}

// Re-export for convenience
export type { CrmProjectPmChatMessage } from '../api/crmProjects';
