import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Circle,
  Clock,
  Building2,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Edit,
  UserCheck,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import {
  crmProjectTasksApi,
  crmProjectsApi,
  type CrmProjectTaskComment,
  type CrmProjectTaskEvent,
  type CrmProjectTaskRescheduleRequest,
  type CrmProjectTaskDeletionRequest,
  type CrmProjectTeamMember,
} from '../../api/crmProjects';
import type { TaskAiBrief } from '../../api/taskDetailAi';
import type { FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import TaskAgentControlPanel from '../../components/Tasks/TaskAgentControlPanel';
import { freelanceTaskDetailTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import DeliveryModal from './TaskDetail/components/DeliveryModal';
import TaskDetailBriefHint from './TaskDetail/components/TaskDetailBriefHint';
import TaskDetailCopilot from './TaskDetail/components/TaskDetailCopilot';
import TaskAttachmentZone from './TaskDetail/components/TaskAttachmentZone';
import TaskActivityFeed from './TaskDetail/components/TaskActivityFeed';
import TaskCommentComposer from './TaskDetail/components/TaskCommentComposer';
import TaskWorkNotes from './TaskDetail/components/TaskWorkNotes';
import TaskLifecycleActions from './TaskDetail/components/TaskLifecycleActions';
import TaskAiRoadmap from './TaskDetail/components/TaskAiRoadmap';
import './FreelanceTaskDetailPage.css';

const FreelanceTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const projectIdFromUrl = searchParams.get('projectId');
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const navigate = useNavigate();
  const fromCalendarWeek = (location.state as { fromCalendarWeek?: string } | null)?.fromCalendarWeek;
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const basePath = isCrmScoped && crmDepartmentCode ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}` : '/freelance';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<FreelanceTask | null>(null);
  const [comments, setComments] = useState<CrmProjectTaskComment[]>([]);
  const [events, setEvents] = useState<CrmProjectTaskEvent[]>([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [pendingRescheduleRequest, setPendingRescheduleRequest] = useState<CrmProjectTaskRescheduleRequest | null>(null);
  const [pendingDeletionRequest, setPendingDeletionRequest] = useState<CrmProjectTaskDeletionRequest | null>(null);
  const [isPmView, setIsPmView] = useState(false);
  const [teamUsers, setTeamUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [showPmReassignModal, setShowPmReassignModal] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<number | null>(null);
  const [reassignDueDate, setReassignDueDate] = useState('');
  const [reassigningTask, setReassigningTask] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [aiBrief, setAiBrief] = useState<TaskAiBrief | null>(null);
  const [copilotExpanded, setCopilotExpanded] = useState(false);

  const handleBriefLoaded = useCallback((brief: TaskAiBrief) => {
    setAiBrief(brief);
  }, []);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id || !user?.id) {
        setLoading(false);
        return;
      }

      const taskIdNum = parseInt(id, 10);
      if (Number.isNaN(taskIdNum)) {
        setLoading(false);
        navigate(`${basePath}/task`);
        return;
      }

      try {
        type TaskWithProject = Awaited<ReturnType<typeof crmProjectTasksApi.getById>>['data'] & {
          project?: { id: number; name: string; crmDepartment?: { id: number; code: string; name: string; color?: string; icon?: string } };
        };
        let fullTask: TaskWithProject | null = null;
        let projectInfo: { id: number; name: string; crmDepartment?: { id: number; code: string; name: string; color?: string; icon?: string } } | undefined;
        let isOverdue = false;
        let hoursUntilDue: number | undefined;

        if (projectIdFromUrl) {
          const projectId = parseInt(projectIdFromUrl, 10);
          if (!Number.isNaN(projectId)) {
            try {
              const taskResponse = await crmProjectTasksApi.getById(projectId, taskIdNum);
              fullTask = taskResponse.data as TaskWithProject;
              projectInfo = fullTask.project
                ? { id: fullTask.project.id, name: fullTask.project.name, crmDepartment: fullTask.project.crmDepartment }
                : { id: fullTask.crm_project_id, name: '' };
              if (fullTask.due_date) {
                const due = new Date(fullTask.due_date);
                const now = new Date();
                isOverdue = due < now && fullTask.status !== 'completed';
                hoursUntilDue = Math.round((due.getTime() - now.getTime()) / 3600000);
              }
            } catch (err) {
              console.error('Error loading task by projectId:', err);
              navigate(`${basePath}/task`);
              return;
            }
          }
        }

        if (!fullTask) {
          const tasks = await freelanceApi.getFreelancerTasks();
          const foundTask = tasks.find((t) => t.id === taskIdNum);
          if (!foundTask || !foundTask.project) {
            navigate(`${basePath}/task`);
            return;
          }
          const taskResponse = await crmProjectTasksApi.getById(foundTask.project.id, foundTask.id);
          fullTask = taskResponse.data as TaskWithProject;
          projectInfo = foundTask.project;
          isOverdue = foundTask.isOverdue ?? false;
          hoursUntilDue = foundTask.hoursUntilDue ?? undefined;
        }

        const enrichedTask: FreelanceTask = {
          ...fullTask,
          project: projectInfo as FreelanceTask['project'],
          isOverdue,
          hoursUntilDue,
        };
        setTask(enrichedTask);

        const projectId = fullTask.crm_project_id;
        if (projectId) {
          try {
            const projectResponse = await crmProjectsApi.getById(projectId);
            const pmId = projectResponse.data.manager_id;
            setIsPmView(Boolean(user?.id && pmId && user.id === pmId));
            const users: Array<{ id: number; name: string }> = [];
            const seen = new Set<number>();
            (projectResponse.data.teamMembers || []).forEach((member: CrmProjectTeamMember) => {
              if (!seen.has(member.user_id)) {
                seen.add(member.user_id);
                users.push({ id: member.user_id, name: member.user?.name || `Utente #${member.user_id}` });
              }
            });
            setTeamUsers(users);
          } catch (err) {
            console.error('Error loading project for PM view:', err);
          }

          const [notesResponse, eventsResponse] = await Promise.all([
            crmProjectTasksApi.getNotes(projectId, taskIdNum),
            crmProjectTasksApi.getEvents(projectId, taskIdNum),
          ]);
          setComments(notesResponse.data || []);
          setEvents(eventsResponse.data || []);

          try {
            const rescheduleResponse = await crmProjectTasksApi.getRescheduleRequests(projectId);
            const userRescheduleRequest = (rescheduleResponse.data || []).find(
              (req: CrmProjectTaskRescheduleRequest) =>
                req.crm_project_task_id === taskIdNum && req.user_id === user.id && req.status === 'pending'
            );
            if (userRescheduleRequest) setPendingRescheduleRequest(userRescheduleRequest);

            const deletionResponse = await crmProjectTasksApi.getDeletionRequests(projectId);
            const userDeletionRequest = (deletionResponse.data || []).find(
              (req: CrmProjectTaskDeletionRequest) =>
                req.crm_project_task_id === taskIdNum && req.user_id === user.id && req.status === 'pending'
            );
            if (userDeletionRequest) setPendingDeletionRequest(userDeletionRequest);
          } catch (error) {
            console.error('Error loading pending requests:', error);
          }
        }
      } catch (error) {
        console.error('Error loading task:', error);
        navigate(`${basePath}/task`);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id, user?.id, projectIdFromUrl, navigate, basePath]);

  const gestioneReturnPath =
    returnTo || (projectIdFromUrl ? `${basePath}/progetti/${projectIdFromUrl}/gestione?tab=tasks` : null);

  const reloadTask = async () => {
    if (!task?.project) return;
    const [taskResponse, notesResponse, eventsResponse] = await Promise.all([
      crmProjectTasksApi.getById(task.project.id, task.id),
      crmProjectTasksApi.getNotes(task.project.id, task.id),
      crmProjectTasksApi.getEvents(task.project.id, task.id),
    ]);
    setTask({
      ...taskResponse.data,
      project: task.project,
      isOverdue: task.isOverdue,
      hoursUntilDue: task.hoursUntilDue,
    });
    setComments(notesResponse.data || []);
    setEvents(eventsResponse.data || []);
  };

  const handlePmMarkComplete = async () => {
    if (!task?.project || task.status === 'completed' || task.status === 'cancelled') return;
    setCompletingTask(true);
    try {
      await crmProjectTasksApi.update(task.project.id, task.id, { status: 'completed' });
      await reloadTask();
    } catch (error) {
      console.error('Error marking task completed:', error);
      alert('Errore nel segnare la task come completata');
    } finally {
      setCompletingTask(false);
    }
  };

  const handlePmDelete = async () => {
    if (!task?.project) return;
    if (!confirm(`Eliminare la task "${task.title}"?`)) return;
    try {
      await crmProjectTasksApi.delete(task.project.id, task.id);
      if (gestioneReturnPath) navigate(gestioneReturnPath);
      else navigate(`${basePath}/task`);
    } catch (error: unknown) {
      console.error('Error deleting task:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Errore nell\'eliminazione della task');
    }
  };

  const handlePmUpdateDueDate = async () => {
    if (!task?.project) return;
    const newDate = prompt('Nuova data scadenza (YYYY-MM-DD):', task.due_date || '');
    if (!newDate) return;
    try {
      await crmProjectTasksApi.updateDueDate(task.project.id, task.id, newDate);
      await reloadTask();
    } catch (error: unknown) {
      console.error('Error updating due date:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Errore nell\'aggiornamento della scadenza');
    }
  };

  const handlePmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.project || !reassignUserId || !reassignDueDate) {
      alert('Seleziona un utente e una data di scadenza');
      return;
    }
    setReassigningTask(true);
    try {
      await crmProjectTasksApi.reassign(task.project.id, task.id, {
        new_user_id: reassignUserId,
        new_due_date: reassignDueDate,
      });
      setShowPmReassignModal(false);
      setReassignUserId(null);
      setReassignDueDate('');
      await reloadTask();
    } catch (error: unknown) {
      console.error('Error reassigning task:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Errore nella riassegnazione');
    } finally {
      setReassigningTask(false);
    }
  };

  const handlePmEditTask = () => {
    if (!gestioneReturnPath || !task) return;
    const separator = gestioneReturnPath.includes('?') ? '&' : '?';
    navigate(`${gestioneReturnPath}${separator}editTask=${task.id}`);
  };

  const handleTakeCharge = async () => {
    if (!task?.project) return;
    setUpdatingStatus(true);
    try {
      const response = await crmProjectTasksApi.takeCharge(task.project.id, task.id);
      setTask({ ...task, ...response.data, project: task.project });
      await reloadTask();
    } catch (error) {
      console.error('Error taking charge:', error);
      alert('Errore durante la presa in carico');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartWork = async () => {
    if (!task?.project) return;
    setUpdatingStatus(true);
    try {
      const response = await crmProjectTasksApi.takeCharge(task.project.id, task.id);
      setTask({ ...task, ...response.data, project: task.project });
      await reloadTask();
    } catch (error) {
      console.error('Error starting work:', error);
      alert('Errore durante l\'avvio della lavorazione');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeliver = async (deliveryData: { filesUploaded: boolean; satisfaction: number; feedback: string }) => {
    if (!task?.project) return;
    setUpdatingStatus(true);
    try {
      await crmProjectTasksApi.deliver(task.project.id, task.id, {
        satisfaction: deliveryData.satisfaction,
        feedback: deliveryData.feedback,
      });
      await reloadTask();
    } catch (error) {
      console.error('Error delivering task:', error);
      alert('Errore durante la consegna');
      throw error;
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendComment = async (data: { comment: string; files: File[] }) => {
    if (!task?.project) return;
    await crmProjectTasksApi.createNote(task.project.id, task.id, data);
    await reloadTask();
  };

  const handleSubtaskToggle = async (subtaskId: number, currentProgress: number) => {
    if (!task?.project) return;
    const newProgress = currentProgress === 100 ? 0 : 100;
    try {
      await crmProjectTasksApi.update(task.project.id, subtaskId, {
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : 'pending',
      });
      const taskResponse = await crmProjectTasksApi.getById(task.project.id, task.id);
      setTask({ ...taskResponse.data, project: task.project });
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleRescheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.project || !rescheduleDate || !rescheduleReason.trim()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    setSubmittingRequest(true);
    try {
      const response = await crmProjectTasksApi.createRescheduleRequest(task.project.id, task.id, {
        requested_due_date: rescheduleDate,
        reason: rescheduleReason,
      });
      setPendingRescheduleRequest(response.data);
      alert('Richiesta di spostamento inviata con successo');
      setShowRescheduleModal(false);
      setRescheduleDate('');
      setRescheduleReason('');
    } catch (error: unknown) {
      console.error('Error creating reschedule request:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Errore durante l\'invio della richiesta');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.project || !deletionReason.trim()) {
      alert('Inserisci il motivo della richiesta');
      return;
    }
    setSubmittingRequest(true);
    try {
      const response = await crmProjectTasksApi.createDeletionRequest(task.project.id, task.id, { reason: deletionReason });
      setPendingDeletionRequest(response.data);
      alert('Richiesta di eliminazione inviata con successo');
      setShowDeletionModal(false);
      setDeletionReason('');
      await reloadTask();
    } catch (error: unknown) {
      console.error('Error creating deletion request:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Errore durante l\'invio della richiesta');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Da fare',
      in_progress: 'In corso',
      review: 'In revisione',
      completed: 'Completato',
      cancelled: 'Annullato',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#8E8E93',
      in_progress: '#0A84FF',
      review: '#FF9F0A',
      completed: '#34C759',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#8E8E93';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: '#8E8E93',
      medium: '#0A84FF',
      normal: '#0A84FF',
      high: '#FF9500',
      urgent: '#FF3B30',
    };
    return colorMap[priority] || '#8E8E93';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && task?.status !== 'completed' && task?.status !== 'cancelled';
  };

  const isUrgent = (dueDate: string | null) => {
    if (!dueDate) return false;
    const diffHours = (new Date(dueDate).getTime() - Date.now()) / 3600000;
    return diffHours > 0 && diffHours <= 24;
  };

  if (loading) {
    return (
      <div className="tw-page task-detail-loading">
        <div className="task-detail-skeleton-header">
          <div className="task-skeleton-line task-skeleton-pulse" style={{ width: 72, height: 36, borderRadius: 8 }} />
          <div className="task-skeleton-line task-skeleton-pulse" style={{ width: 180, height: 14 }} />
        </div>
        <div className="task-detail-skeleton-hero">
          <div className="task-skeleton-line task-skeleton-pulse task-skeleton-hero-title" />
          <div className="task-skeleton-line task-skeleton-pulse task-skeleton-hero-sub" />
          <div className="task-detail-skeleton-chips">
            <div className="task-skeleton-line task-skeleton-pulse task-skeleton-chip" />
            <div className="task-skeleton-line task-skeleton-pulse task-skeleton-chip" />
            <div className="task-skeleton-line task-skeleton-pulse task-skeleton-chip" />
          </div>
          <div className="task-skeleton-line task-skeleton-pulse task-skeleton-desc" />
          <div className="task-skeleton-line task-skeleton-pulse task-skeleton-desc short" />
        </div>
        <div className="task-detail-skeleton-content">
          <div className="task-skeleton-card task-skeleton-pulse" />
          <div className="task-skeleton-card task-skeleton-pulse tall" />
        </div>
      </div>
    );
  }

  if (!task) return null;

  const overdue = isOverdue(task.due_date);
  const urgent = isUrgent(task.due_date);
  const priorityColor = getPriorityColor(task.priority);

  return (
    <div className="tw-page">
      <GuideTour steps={freelanceTaskDetailTourSteps} tourId="freelance-task-detail-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* ── Sticky Header ── */}
      <header className="tw-page-header">
        <div className="tw-header-start">
          <button
            className="tw-back-btn"
            onClick={() => {
              if (gestioneReturnPath) navigate(gestioneReturnPath);
              else if (fromCalendarWeek) navigate(`${basePath}/calendario`, { state: { calendarWeekStart: fromCalendarWeek } });
              else navigate(`${basePath}/task`);
            }}
          >
            <ArrowLeft size={15} />
            <span>Indietro</span>
          </button>

          <nav className="tw-breadcrumb" aria-label="Percorso">
            {task.project && (
              <>
                <span
                  className="tw-breadcrumb-link"
                  onClick={() => navigate(isPmView && gestioneReturnPath ? gestioneReturnPath : `${basePath}/progetti/${task.project!.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`${basePath}/progetti/${task.project!.id}`); }}
                >
                  {task.project.name}
                </span>
                <ChevronRight size={12} className="tw-breadcrumb-sep" />
              </>
            )}
            <span className="tw-breadcrumb-current">{task.title}</span>
          </nav>
        </div>

        <div className="tw-header-actions">
          <TaskLifecycleActions
            task={task}
            currentUserId={user?.id}
            isPmView={isPmView}
            loading={updatingStatus || completingTask}
            onTakeCharge={handleTakeCharge}
            onStartWork={handleStartWork}
            onDeliver={() => setShowDeliveryModal(true)}
            onPmComplete={handlePmMarkComplete}
            variant="header"
          />
          {!isPmView && (
            <button className="tw-report-btn" type="button">
              <AlertCircle size={14} />
              Segnala
            </button>
          )}
        </div>
      </header>

      {/* ── Hero: Title + Chips + Description ── */}
      <div className="tw-hero">
        <div className="tw-hero-inner">
          <div className="tw-title-row">
            <div className="tw-priority-bar" style={{ backgroundColor: priorityColor }} title={`Priorità: ${task.priority}`} />
            <h1 className="tw-title">{task.title}</h1>
          </div>

          <TaskDetailBriefHint brief={aiBrief} onOpenCopilot={() => setCopilotExpanded(true)} />

          <div className="tw-chips-row">
            <span
              className="tw-chip"
              style={{
                color: getStatusColor(task.status),
                borderColor: `${getStatusColor(task.status)}30`,
                backgroundColor: `${getStatusColor(task.status)}14`,
              }}
            >
              {getStatusLabel(task.status)}
            </span>

            {task.due_date && (
              <span
                className={`tw-chip tw-chip-date${overdue ? ' urgent' : urgent ? ' warning' : ''}`}
                onClick={isPmView ? handlePmUpdateDueDate : undefined}
                style={isPmView ? { cursor: 'pointer' } : undefined}
              >
                <Calendar size={11} />
                {formatDate(task.due_date)}
                {overdue && <span className="tw-overdue-tag">In ritardo</span>}
              </span>
            )}

            <span className="tw-chip" style={{ color: priorityColor, borderColor: `${priorityColor}30`, backgroundColor: `${priorityColor}14` }}>
              <Circle size={6} fill="currentColor" />
              {task.priority}
            </span>

            {task.project && (
              <button className="tw-chip tw-chip-link" onClick={() => navigate(`${basePath}/progetti/${task.project!.id}`)}>
                <Building2 size={11} />
                {task.project.name}
              </button>
            )}

            {task.estimated_hours && (
              <span className="tw-chip">
                <Clock size={11} />
                {task.estimated_hours}h stimate
              </span>
            )}
          </div>

          {task.description ? (
            <div className="tw-description">
              {task.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="tw-description tw-description-empty">Nessuna descrizione fornita.</p>
          )}
        </div>
      </div>

      {/* ── Workspace Grid ── */}
      <div className="tw-workspace-grid">

        {/* ── Main Column (65%) ── */}
        <div className="tw-main-col">

          {/* Agent Control Panel */}
          {task.project && task.execution_mode && task.execution_mode !== 'human' && (
            <div className="tw-section">
              <TaskAgentControlPanel
                projectId={task.project.id}
                taskId={task.id}
                task={task}
                readOnly={!isPmView}
                onTaskUpdate={reloadTask}
              />
            </div>
          )}

          {/* Pending Request Banner */}
          <AnimatePresence>
            {(pendingRescheduleRequest || pendingDeletionRequest) && (
              <motion.div
                className="tw-section task-pending-request-banner"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="task-pending-request-icon">
                  <Clock size={20} />
                </div>
                <div className="task-pending-request-content">
                  <h3 className="task-pending-request-title">La tua richiesta è in fase di risposta</h3>
                  {pendingRescheduleRequest && (
                    <div className="task-pending-request-details">
                      <div className="task-pending-request-type">
                        <CalendarIcon size={16} />
                        <span>Richiesta di Spostamento Scadenza</span>
                      </div>
                      <div className="task-pending-request-info">
                        <span>Nuova data richiesta: {formatDate(pendingRescheduleRequest.requested_due_date)}</span>
                        {pendingRescheduleRequest.reason && <span>• Motivo: {pendingRescheduleRequest.reason}</span>}
                      </div>
                      <div className="task-pending-request-date">Richiesta il {formatDateTime(pendingRescheduleRequest.created_at)}</div>
                    </div>
                  )}
                  {pendingDeletionRequest && (
                    <div className="task-pending-request-details">
                      <div className="task-pending-request-type">
                        <X size={16} />
                        <span>Richiesta di Eliminazione Task</span>
                      </div>
                      <div className="task-pending-request-info">
                        <span>Motivo: {pendingDeletionRequest.reason}</span>
                      </div>
                      <div className="task-pending-request-date">Richiesta il {formatDateTime(pendingDeletionRequest.created_at)}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Roadmap — core work, deserves main column */}
          {task.project && (
            <div className="tw-section">
              <TaskAiRoadmap
                projectId={task.project.id}
                taskId={task.id}
                onBriefLoaded={handleBriefLoaded}
              />
            </div>
          )}

          {/* Subtask Checklist */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="tw-section">
              <div className="tw-card">
                <h2 className="tw-card-title">Checklist</h2>
                <div className="task-checklist">
                  {task.subtasks.map((subtask) => {
                    const isDone = subtask.progress === 100;
                    return (
                      <div key={subtask.id} className="task-checklist-item" onClick={() => handleSubtaskToggle(subtask.id, subtask.progress)}>
                        <motion.div
                          className="task-subtask-checkbox"
                          whileTap={{ scale: 0.78 }}
                          animate={{
                            borderColor: isDone ? '#34C759' : 'rgba(255,255,255,0.22)',
                            backgroundColor: isDone ? '#34C759' : 'rgba(0,0,0,0)',
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <AnimatePresence>
                            {isDone && (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        <span className={`task-checklist-text${isDone ? ' completed' : ''}`}>{subtask.title}</span>
                        {subtask.progress > 0 && subtask.progress < 100 && (
                          <span className="task-checklist-progress">{subtask.progress}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Activity Feed & Discussion */}
          <div className="tw-section tw-section-activity">
            <div className="tw-card tw-activity-card">
              <h2 className="tw-card-title">
                <MessageSquare size={15} />
                Attività e discussione
              </h2>
              <TaskActivityFeed
                comments={comments}
                events={events}
                formatDateTime={formatDateTime}
                currentUserId={user?.id}
              />
              <TaskCommentComposer onSubmit={handleSendComment} />
            </div>
          </div>
        </div>

        {/* ── Right Sidebar (35%) ── */}
        <aside className="tw-sidebar">

          {/* AI Chat Assistant */}
          {task.project && (
            <div className="tw-sidebar-copilot">
              <TaskDetailCopilot
                projectId={task.project.id}
                taskId={task.id}
                expanded={copilotExpanded}
                onToggle={() => setCopilotExpanded((prev) => !prev)}
                brief={aiBrief}
                onBriefLoaded={handleBriefLoaded}
              />
            </div>
          )}

          {/* PM Management or Requests */}
          <div className="tw-sidebar-section">
            {isPmView ? (
              <div className="tw-sidebar-card tw-pm-card">
                <h3 className="tw-sidebar-card-title">Gestione PM</h3>
                <p className="tw-sidebar-hint">Azioni dirette sulla task</p>
                <div className="tw-pm-actions">
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <button type="button" className="tw-pm-btn tw-pm-btn-success" onClick={handlePmMarkComplete} disabled={completingTask}>
                      <CheckCircle2 size={15} />
                      <span>{completingTask ? 'Aggiornamento...' : 'Segna completata'}</span>
                    </button>
                  )}
                  <button type="button" className="tw-pm-btn" onClick={handlePmEditTask}>
                    <Edit size={15} />
                    <span>Modifica task</span>
                  </button>
                  <button
                    type="button"
                    className="tw-pm-btn"
                    onClick={() => {
                      setReassignDueDate(task.due_date || '');
                      setShowPmReassignModal(true);
                    }}
                    disabled={task.status === 'completed' || task.status === 'cancelled'}
                  >
                    <UserCheck size={15} />
                    <span>Riassegna</span>
                  </button>
                  <button
                    type="button"
                    className="tw-pm-btn"
                    onClick={handlePmUpdateDueDate}
                    disabled={task.status === 'completed' || task.status === 'cancelled'}
                  >
                    <CalendarIcon size={15} />
                    <span>Modifica scadenza</span>
                  </button>
                  <button type="button" className="tw-pm-btn tw-pm-btn-danger" onClick={handlePmDelete}>
                    <Trash2 size={15} />
                    <span>Elimina</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="tw-sidebar-card tw-requests-card">
                <h3 className="tw-sidebar-card-title">Richieste</h3>
                <p className="tw-sidebar-hint">Sposta la scadenza o richiedi l'annullamento</p>
                <div className="tw-request-actions">
                  <button
                    type="button"
                    className="tw-request-btn tw-request-btn-reschedule"
                    onClick={() => setShowRescheduleModal(true)}
                    disabled={task.status === 'completed' || task.status === 'cancelled'}
                  >
                    <CalendarIcon size={15} />
                    <span>Richiedi spostamento scadenza</span>
                  </button>
                  <button
                    type="button"
                    className="tw-request-btn tw-request-btn-deletion"
                    onClick={() => setShowDeletionModal(true)}
                    disabled={task.status === 'completed' || task.status === 'cancelled'}
                  >
                    <Trash2 size={15} />
                    <span>Richiedi eliminazione task</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Work Notes */}
          {task.project && (
            <div className="tw-sidebar-section">
              <TaskWorkNotes projectId={task.project.id} taskId={task.id} initialNotes={task.work_notes || ''} />
            </div>
          )}

          {/* Files & Attachments */}
          {task.project && (
            <div className="tw-sidebar-section">
              <TaskAttachmentZone projectId={task.project.id} taskId={task.id} onAttachmentChange={reloadTask} />
            </div>
          )}
        </aside>
      </div>

      {/* ── Modals ── */}
      <DeliveryModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} onSubmit={handleDeliver} />

      {showRescheduleModal && (
        <div className="request-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h2 className="request-modal-title">Richiedi Spostamento Scadenza</h2>
              <button className="request-modal-close" onClick={() => setShowRescheduleModal(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRescheduleRequest} className="request-modal-content">
              <div className="request-modal-field">
                <label className="request-modal-label">
                  Nuova Data Scadenza <span className="required">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="request-modal-input"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="request-modal-field">
                <label className="request-modal-label">
                  Motivo <span className="required">*</span>
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="request-modal-textarea"
                  placeholder="Spiega il motivo della richiesta di spostamento..."
                  rows={4}
                  required
                />
              </div>
              <div className="request-modal-actions">
                <button type="button" onClick={() => setShowRescheduleModal(false)} className="request-modal-btn request-modal-btn-secondary" disabled={submittingRequest}>
                  Annulla
                </button>
                <button type="submit" className="request-modal-btn request-modal-btn-primary" disabled={submittingRequest}>
                  {submittingRequest ? 'Invio...' : 'Invia Richiesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPmReassignModal && task && (
        <div className="request-modal-overlay" onClick={() => setShowPmReassignModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h2 className="request-modal-title">Riassegna Task</h2>
              <button className="request-modal-close" onClick={() => setShowPmReassignModal(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePmReassign} className="request-modal-content">
              <div className="request-modal-field">
                <label className="request-modal-label">Nuovo utente *</label>
                <select
                  className="request-modal-input"
                  value={reassignUserId ?? ''}
                  onChange={(e) => setReassignUserId(e.target.value ? Number(e.target.value) : null)}
                  required
                  disabled={reassigningTask}
                >
                  <option value="">Seleziona un utente</option>
                  {teamUsers
                    .filter((u) => !task.assignments?.some((a) => a.is_active && a.user_id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="request-modal-field">
                <label className="request-modal-label">Nuova scadenza *</label>
                <input
                  type="date"
                  className="request-modal-input"
                  value={reassignDueDate}
                  onChange={(e) => setReassignDueDate(e.target.value)}
                  required
                  disabled={reassigningTask}
                />
              </div>
              <div className="request-modal-actions">
                <button type="button" className="request-modal-btn request-modal-btn-secondary" onClick={() => setShowPmReassignModal(false)} disabled={reassigningTask}>
                  Annulla
                </button>
                <button type="submit" className="request-modal-btn request-modal-btn-primary" disabled={reassigningTask || !reassignUserId || !reassignDueDate}>
                  {reassigningTask ? 'Salvataggio...' : 'Riassegna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeletionModal && (
        <div className="request-modal-overlay" onClick={() => setShowDeletionModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h2 className="request-modal-title">Richiedi Eliminazione Task</h2>
              <button className="request-modal-close" onClick={() => setShowDeletionModal(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeletionRequest} className="request-modal-content">
              <div className="request-modal-warning">
                <AlertCircle size={20} />
                <p>Questa richiesta verrà inviata al Project Manager per l'approvazione. La task non verrà eliminata immediatamente.</p>
              </div>
              <div className="request-modal-field">
                <label className="request-modal-label">
                  Motivo <span className="required">*</span>
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="request-modal-textarea"
                  placeholder="Spiega il motivo della richiesta di eliminazione..."
                  rows={5}
                  required
                />
              </div>
              <div className="request-modal-actions">
                <button type="button" onClick={() => setShowDeletionModal(false)} className="request-modal-btn request-modal-btn-secondary" disabled={submittingRequest}>
                  Annulla
                </button>
                <button type="submit" className="request-modal-btn request-modal-btn-danger" disabled={submittingRequest}>
                  {submittingRequest ? 'Invio...' : 'Invia Richiesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreelanceTaskDetailPage;
