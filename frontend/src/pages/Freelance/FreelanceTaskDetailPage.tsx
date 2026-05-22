import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Circle,
  Clock,
  Building2,
  ChevronRight,
  MessageSquare,
  Upload,
  X,
  Send,
  AlertCircle,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { crmProjectTasksApi, type CrmProjectTaskComment, type CrmProjectTaskRescheduleRequest, type CrmProjectTaskDeletionRequest } from '../../api/crmProjects';
import type { FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import TaskAgentChatPanel from '../../components/Tasks/TaskAgentChatPanel';
import { freelanceTaskDetailTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceTaskDetailPage.css';

// Delivery Modal Component
const DeliveryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    filesUploaded: boolean;
    satisfaction: number;
    feedback: string;
  }) => Promise<void>;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [filesUploaded, setFilesUploaded] = useState(false);
  const [satisfaction, setSatisfaction] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filesUploaded) {
      alert('Conferma di aver caricato tutti i file richiesti');
      return;
    }
    if (satisfaction === 0) {
      alert('Seleziona una valutazione della lavorazione');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ filesUploaded, satisfaction, feedback });
      // Reset form
      setFilesUploaded(false);
      setSatisfaction(0);
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Error submitting delivery:', error);
      alert('Errore durante la consegna. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const satisfactionEmojis = ['😠', '😐', '😊', '😃', '🤩'];
  const satisfactionLabels = ['Molto insoddisfatto', 'Insoddisfatto', 'Neutro', 'Soddisfatto', 'Molto soddisfatto'];

  return (
    <div className="delivery-modal-overlay" onClick={onClose}>
      <div className="delivery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delivery-modal-header">
          <h2 className="delivery-modal-title">Consegna Lavoro</h2>
          <button className="delivery-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="delivery-modal-content">
          {/* Step 1: Files Confirmation */}
          <div className="delivery-modal-step">
            <label className="delivery-modal-checkbox-label">
              <input
                type="checkbox"
                checked={filesUploaded}
                onChange={(e) => setFilesUploaded(e.target.checked)}
                className="delivery-modal-checkbox"
              />
              <span>Hai caricato tutti i file richiesti?</span>
            </label>
          </div>

          {/* Step 2: Satisfaction Rating */}
          <div className="delivery-modal-step">
            <label className="delivery-modal-label">
              Come valuti questa lavorazione?
            </label>
            <div className="delivery-modal-satisfaction">
              {satisfactionEmojis.map((emoji, index) => {
                const rating = index + 1;
                return (
                  <button
                    key={rating}
                    type="button"
                    className={`delivery-modal-satisfaction-btn ${satisfaction === rating ? 'active' : ''}`}
                    onClick={() => setSatisfaction(rating)}
                  >
                    <span className="delivery-modal-emoji">{emoji}</span>
                    <span className="delivery-modal-satisfaction-label">
                      {satisfactionLabels[index]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Feedback Text */}
          <div className="delivery-modal-step">
            <label className="delivery-modal-label">
              Vuoi lasciare una nota o un suggerimento? (Opzionale)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="delivery-modal-textarea"
              placeholder="Scrivi qui eventuali note o suggerimenti..."
              rows={4}
            />
          </div>

          <div className="delivery-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="delivery-modal-btn delivery-modal-btn-secondary"
              disabled={submitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="delivery-modal-btn delivery-modal-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Invio in corso...' : 'Conferma e Invia in Revisione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FreelanceTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const projectIdFromUrl = searchParams.get('projectId');
  const navigate = useNavigate();
  const fromCalendarWeek = (location.state as { fromCalendarWeek?: string } | null)?.fromCalendarWeek;
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const basePath = isCrmScoped && crmDepartmentCode ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}` : '/freelance';
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<FreelanceTask | null>(null);
  const [comments, setComments] = useState<CrmProjectTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
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

        // Se c'è projectId in URL (es. link dalla gestione come PM), carica direttamente il task del progetto
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

        // Altrimenti carica dalle "mie" task (come prima)
        if (!fullTask) {
          const tasks = await freelanceApi.getFreelancerTasks();
          const foundTask = tasks.find(t => t.id === taskIdNum);
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
          const notesResponse = await crmProjectTasksApi.getNotes(projectId, taskIdNum);
          setComments(notesResponse.data || []);

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
  }, [id, user?.id, projectIdFromUrl, navigate]);

  const handleTakeCharge = async () => {
    if (!task || !task.project) return;
    
    setUpdatingStatus(true);
    try {
      await crmProjectTasksApi.update(task.project.id, task.id, {
        status: 'in_progress',
      });
      
      setTask({ ...task, status: 'in_progress' });
    } catch (error) {
      console.error('Error taking charge:', error);
      alert('Errore durante l\'aggiornamento dello stato');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeliver = async (deliveryData: {
    filesUploaded: boolean;
    satisfaction: number;
    feedback: string;
  }) => {
    if (!task || !task.project) return;

    setUpdatingStatus(true);
    try {
      // Update task status to review
      await crmProjectTasksApi.update(task.project.id, task.id, {
        status: 'review',
      });

      // TODO: Save feedback to backend
      // This should call an API endpoint like:
      // POST /api/crm-projects/{projectId}/tasks/{taskId}/feedback
      // Body: { satisfaction, feedback, user_id }
      // The backend should create a record in task_feedbacks table
      
      console.log('Delivery feedback:', deliveryData);
      
      // For now, we'll add a comment with the feedback
      if (deliveryData.feedback) {
        await crmProjectTasksApi.createNote(
          task.project.id,
          task.id,
          `[Consegna] Valutazione: ${deliveryData.satisfaction}/5\n${deliveryData.feedback}`
        );
      }

      setTask({ ...task, status: 'review' });
      
      // Refresh comments
      const notesResponse = await crmProjectTasksApi.getNotes(task.project.id, task.id);
      setComments(notesResponse.data || []);
    } catch (error) {
      console.error('Error delivering task:', error);
      alert('Errore durante la consegna');
      throw error;
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task || !task.project) return;

    setSendingComment(true);
    try {
      await crmProjectTasksApi.createNote(task.project.id, task.id, newComment);
      setNewComment('');
      
      // Refresh comments
      const notesResponse = await crmProjectTasksApi.getNotes(task.project.id, task.id);
      setComments(notesResponse.data || []);
    } catch (error) {
      console.error('Error sending comment:', error);
      alert('Errore durante l\'invio del commento');
    } finally {
      setSendingComment(false);
    }
  };

  const handleSubtaskToggle = async (subtaskId: number, currentProgress: number) => {
    if (!task || !task.project) return;
    
    // Toggle subtask completion (0% -> 100% or vice versa)
    const newProgress = currentProgress === 100 ? 0 : 100;
    
    try {
      await crmProjectTasksApi.update(task.project.id, subtaskId, {
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : 'pending',
      });
      
      // Refresh task
      const taskResponse = await crmProjectTasksApi.getById(task.project.id, task.id);
      setTask({ ...taskResponse.data, project: task.project });
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleRescheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !task.project || !rescheduleDate || !rescheduleReason.trim()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    setSubmittingRequest(true);
    try {
      const response = await crmProjectTasksApi.createRescheduleRequest(task.project.id, task.id, {
        requested_due_date: rescheduleDate,
        reason: rescheduleReason,
      });
      
      // Set the pending request
      setPendingRescheduleRequest(response.data);
      
      alert('Richiesta di spostamento inviata con successo');
      setShowRescheduleModal(false);
      setRescheduleDate('');
      setRescheduleReason('');
    } catch (error: any) {
      console.error('Error creating reschedule request:', error);
      alert(error.response?.data?.message || 'Errore durante l\'invio della richiesta');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !task.project || !deletionReason.trim()) {
      alert('Inserisci il motivo della richiesta');
      return;
    }

    setSubmittingRequest(true);
    try {
      const response = await crmProjectTasksApi.createDeletionRequest(task.project.id, task.id, {
        reason: deletionReason,
      });
      
      // Set the pending request
      setPendingDeletionRequest(response.data);
      
      alert('Richiesta di eliminazione inviata con successo');
      setShowDeletionModal(false);
      setDeletionReason('');
      
      // Refresh comments
      const notesResponse = await crmProjectTasksApi.getNotes(task.project.id, task.id);
      setComments(notesResponse.data || []);
    } catch (error: any) {
      console.error('Error creating deletion request:', error);
      alert(error.response?.data?.message || 'Errore durante l\'invio della richiesta');
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
      high: '#FF9F0A',
      urgent: '#FF3B30',
    };
    return colorMap[priority] || '#8E8E93';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && task?.status !== 'completed' && task?.status !== 'cancelled';
  };

  const isUrgent = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  };

  if (loading) {
    return (
      <div className="freelance-loading">
        <div className="freelance-spinner"></div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const overdue = isOverdue(task.due_date);
  const urgent = isUrgent(task.due_date);

  // Determine primary action button
  const getPrimaryAction = () => {
    if (task.status === 'pending') {
      return {
        label: '🚀 Prendi in Carico',
        onClick: handleTakeCharge,
        color: '#0A84FF',
        disabled: updatingStatus,
      };
    } else if (task.status === 'in_progress') {
      return {
        label: '✅ Consegna Lavoro',
        onClick: () => setShowDeliveryModal(true),
        color: '#34C759',
        disabled: updatingStatus,
      };
    } else if (task.status === 'review' || task.status === 'completed') {
      return {
        label: getStatusLabel(task.status),
        onClick: null,
        color: getStatusColor(task.status),
        disabled: true,
        isBadge: true,
      };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="task-action-center">
      <GuideTour steps={freelanceTaskDetailTourSteps} tourId="freelance-task-detail-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      {/* Action Header - Sticky */}
      <div className="task-action-header">
        <div className="task-action-header-left">
          <button
            className="task-action-back-btn"
            onClick={() => {
              if (fromCalendarWeek) {
                navigate(`${basePath}/calendario`, { state: { calendarWeekStart: fromCalendarWeek } });
              } else {
                navigate(`${basePath}/task`);
              }
            }}
            title={fromCalendarWeek ? 'Torna al calendario alla settimana in cui eri' : 'Torna alla lista task'}
          >
            <ArrowLeft size={18} />
            <span className="task-action-back-label">Indietro</span>
          </button>
          <div className="task-action-breadcrumbs">
            {task.project && (
              <>
                <span 
                  className="task-action-breadcrumb-link"
                  onClick={() => navigate(`${basePath}/progetti/${task.project!.id}`)}
                >
                  {task.project.name}
                </span>
                <ChevronRight size={14} />
              </>
            )}
            <span className="task-action-breadcrumb-current">{task.title}</span>
          </div>
        </div>
        <div className="task-action-header-right">
          <button
            className="task-action-secondary-btn"
            onClick={() => {/* TODO: Implement problem reporting */}}
          >
            <AlertCircle size={16} />
            Segnala Problema
          </button>
          {primaryAction && (
            primaryAction.isBadge ? (
              <div 
                className="task-action-badge"
                style={{ 
                  backgroundColor: `${primaryAction.color}20`,
                  color: primaryAction.color
                }}
              >
                {primaryAction.label}
              </div>
            ) : (
              <button
                className="task-action-primary-btn"
                onClick={primaryAction.onClick || undefined}
                disabled={primaryAction.disabled}
                style={{ backgroundColor: primaryAction.color }}
              >
                {primaryAction.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Hero: titolo e descrizione in evidenza (cosa più importante) */}
      <div className="task-detail-hero">
        <div className="task-detail-hero-inner">
          <h1 className="task-detail-hero-title">{task.title}</h1>
          {task.description ? (
            <div className="task-detail-hero-description">
              {task.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="task-detail-hero-description task-detail-hero-description-empty">Nessuna descrizione</p>
          )}
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="task-action-content">
        {/* Left Column - Content (66%) */}
        <div className="task-action-main">
          {task.project && (
            <TaskAgentChatPanel
              projectId={task.project.id}
              taskId={task.id}
              executionMode={task.execution_mode}
              initialN8nStatus={task.n8n_status}
            />
          )}

          {/* Pending Requests Banner */}
          {(pendingRescheduleRequest || pendingDeletionRequest) && (
            <div className="task-pending-request-banner">
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
                      {pendingRescheduleRequest.reason && (
                        <span>• Motivo: {pendingRescheduleRequest.reason}</span>
                      )}
                    </div>
                    <div className="task-pending-request-date">
                      Richiesta il {formatDateTime(pendingRescheduleRequest.created_at)}
                    </div>
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
                    <div className="task-pending-request-date">
                      Richiesta il {formatDateTime(pendingDeletionRequest.created_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checklist/Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="task-content-card">
              <h2 className="task-content-card-title">Checklist</h2>
              <div className="task-checklist">
                {task.subtasks.map((subtask) => (
                  <label key={subtask.id} className="task-checklist-item">
                    <input
                      type="checkbox"
                      checked={subtask.progress === 100}
                      onChange={() => handleSubtaskToggle(subtask.id, subtask.progress)}
                      className="task-checklist-checkbox"
                    />
                    <span className={`task-checklist-text ${subtask.progress === 100 ? 'completed' : ''}`}>
                      {subtask.title}
                    </span>
                    {subtask.progress > 0 && subtask.progress < 100 && (
                      <span className="task-checklist-progress">{subtask.progress}%</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Comments/Chat */}
          <div className="task-content-card">
            <h2 className="task-content-card-title">
              <MessageSquare size={18} />
              Discussione
            </h2>
            <div className="task-comments">
              {comments.length > 0 ? (
                <div className="task-comments-list">
                  {comments.map((comment) => (
                    <div key={comment.id} className="task-comment">
                      <div className="task-comment-header">
                        <div className="task-comment-author">
                          {comment.user?.name || 'Utente'}
                        </div>
                        <div className="task-comment-date">
                          {formatDateTime(comment.created_at)}
                        </div>
                      </div>
                      <div className="task-comment-content">
                        {comment.comment}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="task-comments-empty">Nessun commento ancora. Inizia la discussione!</p>
              )}
              
              <form onSubmit={handleSendComment} className="task-comment-form">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  className="task-comment-input"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || sendingComment}
                  className="task-comment-submit"
                >
                  <Send size={16} />
                  {sendingComment ? 'Invio...' : 'Invia'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column - Context (33%) */}
        <div className="task-action-sidebar">
          {/* Meta Card */}
          <div className="task-sidebar-card">
            <h3 className="task-sidebar-card-title">Informazioni</h3>
            <div className="task-sidebar-info">
              {task.due_date && (
                <div className={`task-sidebar-info-item ${overdue ? 'urgent' : urgent ? 'warning' : ''}`}>
                  <Calendar size={16} />
                  <div>
                    <div className="task-sidebar-info-label">Scadenza</div>
                    <div className="task-sidebar-info-value">
                      {formatDate(task.due_date)}
                      {overdue && <span className="task-sidebar-urgent-badge">In ritardo</span>}
                      {urgent && !overdue && <span className="task-sidebar-urgent-badge">Urgente</span>}
                    </div>
                  </div>
                </div>
              )}
              <div className="task-sidebar-info-item">
                <Circle size={16} style={{ color: getPriorityColor(task.priority) }} fill="currentColor" />
                <div>
                  <div className="task-sidebar-info-label">Priorità</div>
                  <div className="task-sidebar-info-value">{task.priority}</div>
                </div>
              </div>
              {task.project && (
                <div className="task-sidebar-info-item task-sidebar-info-link">
                  <Building2 size={16} />
                  <div>
                    <div className="task-sidebar-info-label">Progetto</div>
                    <div 
                      className="task-sidebar-info-value"
                      onClick={() => navigate(`${basePath}/progetti/${task.project!.id}`)}
                    >
                      {task.project.name}
                    </div>
                  </div>
                </div>
              )}
              {task.estimated_hours && (
                <div className="task-sidebar-info-item">
                  <Clock size={16} />
                  <div>
                    <div className="task-sidebar-info-label">Ore stimate</div>
                    <div className="task-sidebar-info-value">{task.estimated_hours}h</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File e Materiali - documenti, immagini, foto */}
          <div className="task-sidebar-card task-upload-card">
            <h3 className="task-sidebar-card-title">File e Materiali</h3>
            <p className="task-upload-hint">Documenti, immagini e foto per questa task</p>
            <div className="task-files">
              <div className="task-files-list">
                <p className="task-files-empty">Nessun file caricato</p>
              </div>
              <label className="task-upload-area">
                <Upload size={28} className="task-upload-icon" />
                <p className="task-upload-text">Trascina qui o tocca per caricare</p>
                <p className="task-upload-formats">PDF, Word, immagini (JPG, PNG…)</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  className="task-upload-input"
                  onChange={(e) => {
                    // TODO: Implement file upload
                    console.log('Files to upload:', e.target.files);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Richieste - spostamento e annullamento in stile app */}
          <div className="task-sidebar-card task-requests-card">
            <h3 className="task-sidebar-card-title">Richieste</h3>
            <p className="task-requests-hint">Sposta la scadenza o richiedi l’annullamento della task</p>
            <div className="task-request-actions">
              <button
                type="button"
                className="task-request-btn task-request-btn-reschedule"
                onClick={() => setShowRescheduleModal(true)}
                disabled={task.status === 'completed' || task.status === 'cancelled'}
              >
                <CalendarIcon size={18} />
                <span>Richiedi spostamento scadenza</span>
              </button>
              <button
                type="button"
                className="task-request-btn task-request-btn-deletion"
                onClick={() => setShowDeletionModal(true)}
                disabled={task.status === 'completed' || task.status === 'cancelled'}
              >
                <Trash2 size={18} />
                <span>Richiedi eliminazione task</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Modal */}
      <DeliveryModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onSubmit={handleDeliver}
      />

      {/* Reschedule Request Modal */}
      {showRescheduleModal && (
        <div className="request-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h2 className="request-modal-title">Richiedi Spostamento Scadenza</h2>
              <button className="request-modal-close" onClick={() => setShowRescheduleModal(false)}>
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
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="request-modal-btn request-modal-btn-secondary"
                  disabled={submittingRequest}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="request-modal-btn request-modal-btn-primary"
                  disabled={submittingRequest}
                >
                  {submittingRequest ? 'Invio...' : 'Invia Richiesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Request Modal */}
      {showDeletionModal && (
        <div className="request-modal-overlay" onClick={() => setShowDeletionModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <h2 className="request-modal-title">Richiedi Eliminazione Task</h2>
              <button className="request-modal-close" onClick={() => setShowDeletionModal(false)}>
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
                <button
                  type="button"
                  onClick={() => setShowDeletionModal(false)}
                  className="request-modal-btn request-modal-btn-secondary"
                  disabled={submittingRequest}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="request-modal-btn request-modal-btn-danger"
                  disabled={submittingRequest}
                >
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
