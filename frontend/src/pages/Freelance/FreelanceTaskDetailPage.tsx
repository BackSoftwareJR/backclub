import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import {
  crmProjectTasksApi,
  crmProjectsApi,
  type CrmProjectTaskRescheduleRequest,
  type CrmProjectTaskDeletionRequest,
  type CrmProjectTeamMember,
} from '../../api/crmProjects';
import type { FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceTaskDetailTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import DeliveryModal from './TaskDetail/components/DeliveryModal';
import TaskBentoDashboard from './TaskDetail/TaskBentoDashboard';
import './FreelanceTaskDetailPage.css';

const FreelanceTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const projectIdFromUrl = searchParams.get('projectId');
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const basePath = isCrmScoped && crmDepartmentCode ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}` : '/freelance';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<FreelanceTask | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [, setPendingRescheduleRequest] = useState<CrmProjectTaskRescheduleRequest | null>(null);
  const [, setPendingDeletionRequest] = useState<CrmProjectTaskDeletionRequest | null>(null);
  const [isPmView, setIsPmView] = useState(false);
  const [teamUsers, setTeamUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [showPmReassignModal, setShowPmReassignModal] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<number | null>(null);
  const [reassignDueDate, setReassignDueDate] = useState('');
  const [reassigningTask, setReassigningTask] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);

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
    const taskResponse = await crmProjectTasksApi.getById(task.project.id, task.id);
    setTask({
      ...taskResponse.data,
      project: task.project,
      isOverdue: task.isOverdue,
      hoursUntilDue: task.hoursUntilDue,
    });
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

  return (
    <>
      <GuideTour steps={freelanceTaskDetailTourSteps} tourId="freelance-task-detail-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* Bento Dashboard — takes full available height */}
      <div className="h-full overflow-hidden">
        {task.project ? (
          <TaskBentoDashboard
            projectId={task.project.id}
            taskId={task.id}
            task={task}
            isPmView={isPmView}
            onPmComplete={handlePmMarkComplete}
            onPmEdit={handlePmEditTask}
            onPmReassign={() => {
              setReassignDueDate(task.due_date || '');
              setShowPmReassignModal(true);
            }}
            onPmChangeDeadline={handlePmUpdateDueDate}
            onPmDelete={handlePmDelete}
            onTakeCharge={handleTakeCharge}
            onStartWork={handleStartWork}
            lifecycleLoading={updatingStatus || completingTask}
            onAttachmentChange={reloadTask}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Progetto non trovato
          </div>
        )}
      </div>

      {/* ── Modals (kept at page level) ── */}
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
    </>
  );
};

export default FreelanceTaskDetailPage;
