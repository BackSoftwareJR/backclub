import React, { useState, useEffect } from 'react';
import { 
  X, 
  Minus, 
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { workspaceTasksApi } from '../../../api/workspaceTasks';
import { crmProjectTasksApi } from '../../../api/crmProjects';
import type { WorkspaceUserTask } from '../../../types/workspace';
import type { CrmProjectTask } from '../../../api/crmProjects';
import AddTaskForm from './AddTaskForm';
import TaskDetailModal from './TaskDetailModal';
import './FloatingTaskPanel.css';

interface FloatingTaskPanelProps {
  projectId: number;
}

type TabType = 'pm_tasks' | 'my_tasks';

interface ProjectTasksForUser extends CrmProjectTask {
  isOverdue?: boolean;
  hoursUntilDue?: number;
}

const FloatingTaskPanel: React.FC<FloatingTaskPanelProps> = ({ projectId }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my_tasks');
  const [myTasks, setMyTasks] = useState<WorkspaceUserTask[]>([]);
  const [pmTasks, setPmTasks] = useState<ProjectTasksForUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkspaceUserTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tasks data
  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load workspace user tasks
      const workspaceTasks = await workspaceTasksApi.getWorkspaceTasks(projectId);
      setMyTasks(workspaceTasks);

      // Load CRM project tasks assigned to current user
      try {
        const crmTasks = await crmProjectTasksApi.getByProject(projectId);
        // Filter for active assignments to current user
        // Since we don't have user context here, we'll show all tasks for now
        // In a real implementation, you'd filter by current user ID
        const userTasks = crmTasks.data.filter(task => 
          task.assignments?.some(assignment => assignment.is_active)
        );
        
        // Calculate overdue status
        const tasksWithStatus = userTasks.map(task => {
          const isOverdue = task.due_date 
            ? new Date(task.due_date) < new Date() && task.status !== 'completed'
            : false;
          
          const hoursUntilDue = task.due_date
            ? Math.round((new Date(task.due_date).getTime() - new Date().getTime()) / 3600000)
            : undefined;

          return {
            ...task,
            isOverdue,
            hoursUntilDue
          };
        });
        
        setPmTasks(tasksWithStatus);
      } catch (err) {
        console.error('Failed to load PM tasks:', err);
        // Don't show error for PM tasks as they might not be available
        setPmTasks([]);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Errore nel caricamento delle task');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  // Auto-refresh every 30s when not minimized
  useEffect(() => {
    if (isMinimized) return;
    
    const interval = setInterval(() => {
      loadTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, [isMinimized, projectId]);

  const handleTaskComplete = async (taskId: number, isWorkspaceTask: boolean = true) => {
    try {
      if (isWorkspaceTask) {
        await workspaceTasksApi.updateWorkspaceTask(projectId, taskId, { status: 'completed' });
      } else {
        await crmProjectTasksApi.update(projectId, taskId, { status: 'completed' });
      }
      
      // Refresh tasks
      await loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
      alert('Errore nel completare la task');
    }
  };

  const handleTaskCreated = async () => {
    await loadTasks();
    setShowAddTaskForm(false);
  };

  const handleTaskUpdated = async () => {
    await loadTasks();
    setSelectedTask(null);
  };

  const getTaskStatusColor = (status: string): string => {
    switch (status) {
      case 'todo':
      case 'pending':
        return '#8E8E93';
      case 'in_progress':
        return '#0A84FF';
      case 'review':
        return '#FF9F0A';
      case 'completed':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getTaskStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'todo': 'Da fare',
      'in_progress': 'In corso',
      'review': 'In revisione',
      'completed': 'Completato',
      'pending': 'Da fare',
      'cancelled': 'Annullato'
    };
    return statusMap[status] || status;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return '#8E8E93';
      case 'medium': return '#0A84FF';
      case 'high': return '#FF9F0A';
      case 'urgent': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const totalOpenTasks = myTasks.filter(t => t.status !== 'completed').length + 
                        pmTasks.filter(t => t.status !== 'completed').length;

  if (isMinimized) {
    return (
      <div className="floating-task-panel minimized">
        <button
          className="floating-task-panel-tab-minimized"
          onClick={() => setIsMinimized(false)}
          title={`Task aperte: ${totalOpenTasks}`}
        >
          <CheckSquare size={20} />
          {totalOpenTasks > 0 && (
            <div className="floating-task-panel-badge">{totalOpenTasks}</div>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="floating-task-panel expanded">
        <div className="floating-task-panel-header">
          <div className="floating-task-panel-title">
            <CheckSquare size={20} />
            <h3>Task & Note</h3>
            {totalOpenTasks > 0 && (
              <div className="floating-task-panel-count">{totalOpenTasks}</div>
            )}
          </div>
          <div className="floating-task-panel-actions">
            <button
              className="floating-task-panel-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimizza pannello"
            >
              <Minus size={16} />
            </button>
            <button
              className="floating-task-panel-btn"
              onClick={() => setIsMinimized(true)}
              title="Chiudi pannello"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="floating-task-panel-tabs">
          <button
            className={`floating-task-panel-tab ${activeTab === 'pm_tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('pm_tasks')}
          >
            Task PM ({pmTasks.filter(t => t.status !== 'completed').length})
          </button>
          <button
            className={`floating-task-panel-tab ${activeTab === 'my_tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_tasks')}
          >
            Mie Task ({myTasks.filter(t => t.status !== 'completed').length})
          </button>
        </div>

        <div className="floating-task-panel-content">
          {isLoading ? (
            <div className="floating-task-panel-loading">
              <Clock size={20} />
              <span>Caricamento...</span>
            </div>
          ) : error ? (
            <div className="floating-task-panel-error">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={loadTasks}>Riprova</button>
            </div>
          ) : (
            <>
              {activeTab === 'pm_tasks' && (
                <div className="floating-task-panel-task-list">
                  {pmTasks.length === 0 ? (
                    <div className="floating-task-panel-empty">
                      <p>Nessuna task del PM assegnata</p>
                    </div>
                  ) : (
                    pmTasks
                      .sort((a, b) => {
                        // Sort by status (incomplete first), then by due date
                        if (a.status === 'completed' && b.status !== 'completed') return 1;
                        if (a.status !== 'completed' && b.status === 'completed') return -1;
                        if (a.due_date && b.due_date) {
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        }
                        return 0;
                      })
                      .map((task) => (
                        <div 
                          key={task.id} 
                          className={`floating-task-panel-task-item ${task.status === 'completed' ? 'completed' : ''} ${task.isOverdue ? 'overdue' : ''}`}
                        >
                          <div className="floating-task-panel-task-content">
                            <div className="floating-task-panel-task-header">
                              <h4 className="floating-task-panel-task-title">{task.title}</h4>
                              <div className="floating-task-panel-task-badges">
                                <div 
                                  className="floating-task-panel-priority-badge"
                                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                                  title={`Priorità: ${task.priority}`}
                                >
                                  {task.priority.charAt(0).toUpperCase()}
                                </div>
                                <div 
                                  className="floating-task-panel-status-badge"
                                  style={{ backgroundColor: getTaskStatusColor(task.status) }}
                                >
                                  {getTaskStatusLabel(task.status)}
                                </div>
                              </div>
                            </div>
                            
                            {task.due_date && (
                              <div className={`floating-task-panel-task-due-date ${task.isOverdue ? 'overdue' : ''}`}>
                                {task.isOverdue ? '⚠️ In ritardo: ' : '📅 Scadenza: '}
                                {new Date(task.due_date).toLocaleDateString('it-IT')}
                              </div>
                            )}
                          </div>
                          
                          {task.status !== 'completed' && (
                            <button
                              className="floating-task-panel-complete-btn"
                              onClick={() => handleTaskComplete(task.id, false)}
                              title="Segna completata"
                            >
                              <CheckSquare size={16} />
                            </button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              )}

              {activeTab === 'my_tasks' && (
                <>
                  <div className="floating-task-panel-my-tasks-header">
                    <button
                      className="floating-task-panel-add-btn"
                      onClick={() => setShowAddTaskForm(true)}
                    >
                      <Plus size={16} />
                      Nuova Task
                    </button>
                  </div>
                  
                  <div className="floating-task-panel-task-list">
                    {myTasks.length === 0 ? (
                      <div className="floating-task-panel-empty">
                        <p>Nessuna task personale</p>
                        <p className="floating-task-panel-empty-hint">
                          Crea la tua prima task per iniziare.
                        </p>
                      </div>
                    ) : (
                      myTasks
                        .sort((a, b) => {
                          // Sort by status (incomplete first), then by due date
                          if (a.status === 'completed' && b.status !== 'completed') return 1;
                          if (a.status !== 'completed' && b.status === 'completed') return -1;
                          if (a.due_date && b.due_date) {
                            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                          }
                          return 0;
                        })
                        .map((task) => (
                          <div 
                            key={task.id} 
                            className={`floating-task-panel-task-item ${task.status === 'completed' ? 'completed' : ''}`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="floating-task-panel-task-content">
                              <div className="floating-task-panel-task-header">
                                <h4 className="floating-task-panel-task-title">{task.title}</h4>
                                <div className="floating-task-panel-task-badges">
                                  <div 
                                    className="floating-task-panel-priority-badge"
                                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                                    title={`Priorità: ${task.priority}`}
                                  >
                                    {task.priority.charAt(0).toUpperCase()}
                                  </div>
                                  <div 
                                    className="floating-task-panel-status-badge"
                                    style={{ backgroundColor: getTaskStatusColor(task.status) }}
                                  >
                                    {getTaskStatusLabel(task.status)}
                                  </div>
                                </div>
                              </div>
                              
                              {task.due_date && (
                                <div className="floating-task-panel-task-due-date">
                                  📅 {new Date(task.due_date).toLocaleDateString('it-IT')}
                                </div>
                              )}
                              
                              {task.branch && (
                                <div className="floating-task-panel-task-branch">
                                  {task.branch.name}
                                </div>
                              )}
                            </div>
                            
                            <div className="floating-task-panel-task-actions">
                              {task.status !== 'completed' && (
                                <button
                                  className="floating-task-panel-complete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskComplete(task.id, true);
                                  }}
                                  title="Segna completata"
                                >
                                  <CheckSquare size={16} />
                                </button>
                              )}
                              <button
                                className="floating-task-panel-view-btn"
                                onClick={() => setSelectedTask(task)}
                                title="Visualizza dettagli"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      {showAddTaskForm && (
        <AddTaskForm
          projectId={projectId}
          branches={[]} // Will be loaded inside the form
          onClose={() => setShowAddTaskForm(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          project={null} // Will be handled in the modal if needed
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </>
  );
};

export default FloatingTaskPanel;