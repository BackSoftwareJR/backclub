import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Calendar,
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import type { CrmProjectTaskRescheduleRequest, CrmProjectTaskDeletionRequest } from '../../api/crmProjects';
import type { FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceRichiesteTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceRequestsPage.css';

type TaskDeletionRequest = CrmProjectTaskDeletionRequest & {
  task?: FreelanceTask;
};

const FreelanceRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [rescheduleRequests, setRescheduleRequests] = useState<CrmProjectTaskRescheduleRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<TaskDeletionRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        if (isCrmScoped && crmDepartmentCode) {
          const { reschedule, deletion } = await freelanceCrmApi.getRequests(crmDepartmentCode);
          setRescheduleRequests(reschedule);
          setDeletionRequests(deletion);
        } else {
          const { reschedule, deletion } = await freelanceApi.getMyRequests();
          setRescheduleRequests(reschedule);
          setDeletionRequests(deletion);
        }
      } catch (error) {
        console.error('Error loading requests:', error);
        setRescheduleRequests([]);
        setDeletionRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'In attesa',
      approved: 'Approvata',
      rejected: 'Rifiutata',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#FF9F0A',
      approved: '#34C759',
      rejected: '#FF3B30',
    };
    return colorMap[status] || '#8E8E93';
  };

  const getRequestTypeLabel = (type: 'reschedule' | 'deletion') => {
    return type === 'reschedule' ? t('freelance.reschedule_request') : t('freelance.task_deletion');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRescheduleRequests = rescheduleRequests.filter((req) => {
    if (filter !== 'all' && req.status !== filter) return false;
    const task = req.task as FreelanceTask;
    if (searchTerm && !task?.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredDeletionRequests = deletionRequests.filter((req) => {
    if (filter !== 'all' && req.status !== filter) return false;
    const task = req.task as FreelanceTask;
    if (searchTerm && !task?.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const allRequests = [
    ...filteredRescheduleRequests.map(req => ({ ...req, type: 'reschedule' as const, task: req.task as FreelanceTask })),
    ...filteredDeletionRequests.map(req => ({ ...req, type: 'deletion' as const, task: req.task as FreelanceTask })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="freelance-loading">
        <div className="freelance-spinner"></div>
      </div>
    );
  }

  return (
    <div className="freelance-requests">
      <GuideTour steps={freelanceRichiesteTourSteps} tourId="freelance-richieste-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      <div className="freelance-requests-header">
        <div>
          <h1 className="freelance-requests-title">Richieste</h1>
          <p className="freelance-requests-subtitle">
            {allRequests.length} {allRequests.length === 1 ? 'richiesta' : 'richieste'} totali
          </p>
        </div>
        <div className="freelance-requests-filters">
          <div className="freelance-requests-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('freelance.search_by_task')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="freelance-requests-search-input"
            />
          </div>
          <div className="freelance-requests-filter">
            <Filter size={16} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="freelance-requests-filter-select"
            >
              <option value="all">Tutte</option>
              <option value="pending">In attesa</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Rifiutate</option>
            </select>
          </div>
        </div>
      </div>

      <div className="freelance-requests-list">
        {allRequests.length === 0 ? (
          <div className="freelance-requests-empty">
            <FileText size={48} />
            <p>{t('freelance.no_requests_found')}</p>
          </div>
        ) : (
          allRequests.map((request) => (
            <div key={`${request.type}-${request.id}`} className="freelance-request-card">
              <div className="freelance-request-header">
                <div className="freelance-request-type">
                  {request.type === 'reschedule' ? (
                    <Calendar size={18} />
                  ) : (
                    <X size={18} />
                  )}
                  <span>{getRequestTypeLabel(request.type)}</span>
                </div>
                <div
                  className="freelance-request-status"
                  style={{
                    backgroundColor: `${getStatusColor(request.status)}20`,
                    color: getStatusColor(request.status),
                  }}
                >
                  {getStatusLabel(request.status)}
                </div>
              </div>

              <div className="freelance-request-content">
                <h3
                  className="freelance-request-task-title"
                  onClick={() => {
                    if (request.task) {
                      navigate(`/freelance/task/${request.task.id}`);
                    }
                  }}
                >
                  {request.task?.title || 'Task non disponibile'}
                </h3>

                {(request.task as FreelanceTask)?.project && (
                  <div className="freelance-request-project">
                    <Building2 size={14} />
                    <span>{(request.task as FreelanceTask).project!.name}</span>
                  </div>
                )}

                {request.type === 'reschedule' && (
                  <div className="freelance-request-details">
                    <div className="freelance-request-detail-item">
                      <span className="freelance-request-detail-label">Data attuale:</span>
                      <span className="freelance-request-detail-value">
                        {formatDate((request as CrmProjectTaskRescheduleRequest).current_due_date)}
                      </span>
                    </div>
                    <div className="freelance-request-detail-item">
                      <span className="freelance-request-detail-label">Data richiesta:</span>
                      <span className="freelance-request-detail-value">
                        {formatDate((request as CrmProjectTaskRescheduleRequest).requested_due_date)}
                      </span>
                    </div>
                    {(request as CrmProjectTaskRescheduleRequest).reason && (
                      <div className="freelance-request-reason">
                        <strong>Motivo:</strong> {(request as CrmProjectTaskRescheduleRequest).reason}
                      </div>
                    )}
                  </div>
                )}

                {request.type === 'deletion' && (
                  <div className="freelance-request-details">
                    <div className="freelance-request-reason">
                      <strong>Motivo:</strong> {(request as TaskDeletionRequest).reason}
                    </div>
                  </div>
                )}

                {request.status !== 'pending' && (
                  <div className="freelance-request-review">
                    <div className="freelance-request-review-header">
                      {request.status === 'approved' ? (
                        <CheckCircle2 size={16} style={{ color: '#34C759' }} />
                      ) : (
                        <XCircle size={16} style={{ color: '#FF3B30' }} />
                      )}
                      <span>
                        {request.status === 'approved' ? 'Approvata' : 'Rifiutata'} da{' '}
                        {request.reviewer?.name || 'Admin'}
                      </span>
                      <span className="freelance-request-review-date">
                        {formatDate(request.reviewed_at)}
                      </span>
                    </div>
                    {request.review_notes && (
                      <div className="freelance-request-review-notes">
                        <strong>Note:</strong> {request.review_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="freelance-request-footer">
                <div className="freelance-request-date">
                  <Clock size={14} />
                  <span>Richiesta il {formatDate(request.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FreelanceRequestsPage;
