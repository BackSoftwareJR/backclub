import React, { useEffect, Suspense } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  Home,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  Calendar,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FreelanceCrmProvider, useFreelanceCrm } from '../../context/FreelanceCrmContext';
import './FreelanceCrmHub.css';

const HubFallback = () => (
  <div className="freelance-crm-hub-fallback">
    <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid var(--color-bg-tertiary)', borderTopColor: 'var(--color-accent-blue)', borderRadius: '50%' }} />
  </div>
);

const crmSubRoutes = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '' },
  { id: 'progetti', label: 'Progetti', icon: FolderKanban, path: '/progetti' },
  { id: 'task', label: 'Task', icon: CheckSquare, path: '/task' },
  { id: 'richieste', label: 'Richieste', icon: FileText, path: '/richieste' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/chat' },
  { id: 'calendario', label: 'Calendario', icon: Calendar, path: '/calendario' },
  { id: 'supporto', label: 'Supporto', icon: HelpCircle, path: '/supporto' },
];

function FreelanceCrmHubContent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crmDepartment } = useFreelanceCrm();

  const assignedCodes = (user?.crm_departments ?? []).map((c) => c.code);
  const isAllowed = code && assignedCodes.includes(decodeURIComponent(code));

  useEffect(() => {
    if (code && !isAllowed) {
      navigate('/freelance', { replace: true });
    }
  }, [code, isAllowed, navigate]);

  if (!code || !isAllowed) {
    return (
      <div className="freelance-crm-hub-fallback">
        <p>Reindirizzamento...</p>
      </div>
    );
  }

  const basePath = `/freelance/crm/${encodeURIComponent(code)}`;

  return (
    <div className="freelance-crm-hub">
      <div className="freelance-crm-hub-header">
        <div
          className="freelance-crm-hub-badge"
          style={{
            backgroundColor: crmDepartment ? `${crmDepartment.color}20` : undefined,
            borderColor: crmDepartment?.color,
            color: crmDepartment?.color,
          }}
        >
          {crmDepartment?.name ?? code}
        </div>
        <p className="freelance-crm-hub-subtitle">Vista dedicata a questo CRM</p>
      </div>
      <nav className="freelance-crm-hub-nav">
        {crmSubRoutes.map((route) => {
          const Icon = route.icon;
          const to = route.path ? `${basePath}${route.path}` : basePath;
          return (
            <NavLink
              key={route.id}
              to={to}
              end={route.path === ''}
              className={({ isActive }) =>
                `freelance-crm-hub-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{route.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="freelance-crm-hub-body">
        <Suspense fallback={<HubFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Layout per la vista dedicata a un CRM: sottomenu (Dashboard, Progetti, Task, ...) e area contenuto.
 * Va usato con FreelanceCrmProvider che fornisce il code dall'URL.
 */
const FreelanceCrmHub: React.FC = () => {
  return (
    <FreelanceCrmProvider>
      <FreelanceCrmHubContent />
    </FreelanceCrmProvider>
  );
};

export default FreelanceCrmHub;
