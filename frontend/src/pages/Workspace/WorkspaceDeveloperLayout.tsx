import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Bot,
  CheckSquare,
  ArrowLeft,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useWorkspace } from '../../context/WorkspaceContext';
import { workspaceApi } from '../../api/workspace';
import { workspaceAgentsApi } from '../../api/workspaceAgents';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import WorkspaceOnboardingTour from './components/WorkspaceOnboardingTour';
import './workspace-tokens.css';
import './WorkspaceDeveloperLayout.css';

const WorkspaceDeveloperLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const { isFirstVisit } = useWorkspace();
  useSidebarState('workspace-sidebar-collapsed', false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [agentsNotificationCount, setAgentsNotificationCount] = useState(0);

  const menuItems = [
    {
      id: 'progetti',
      label: 'Progetti',
      icon: FolderOpen,
      path: '/workspace/developer/progetti',
    },
    {
      id: 'agenti',
      label: 'Lavorazioni',
      icon: Bot,
      path: '/workspace/developer/agenti',
    },
    {
      id: 'task',
      label: 'Task',
      icon: CheckSquare,
      path: '/workspace/developer/task',
    },
  ];

  const isActive = (path: string) => window.location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'W';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    const loadAgentsNotificationCount = async () => {
      try {
        const projects = await workspaceApi.getWorkspaceProjects();
        let totalCount = 0;
        for (const project of projects) {
          try {
            const agents = await workspaceAgentsApi.getProjectAgents(project.id);
            totalCount += agents.filter(a => a.status === 'review' || a.status === 'failed').length;
          } catch {
            // ignore individual project errors
          }
        }
        setAgentsNotificationCount(totalCount);
      } catch {
        setAgentsNotificationCount(0);
      }
    };

    loadAgentsNotificationCount();
    const interval = setInterval(loadAgentsNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = () => setShowProfileMenu(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfileMenu]);

  return (
    <div
      className="workspace-layout workspace-theme-scope"
      data-theme={resolvedTheme}
    >
      {/* ── Sidebar ── */}
      <aside className="workspace-sidebar">
        {/* Header */}
        <div className="workspace-sidebar-header">
          <div className="workspace-sidebar-brand">
            <span className="workspace-sidebar-brand-name">WorkSpace</span>
            <span className="workspace-sidebar-version">v1</span>
          </div>
        </div>

        {/* Workspace switcher */}
        <div className="workspace-sidebar-switcher">
          <WorkspaceSwitcher />
        </div>

        {/* Nav */}
        <nav className="workspace-sidebar-nav">
          <span className="workspace-sidebar-nav-label">NAVIGATOR</span>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`workspace-nav-item ${active ? 'active' : ''}`}
              >
                <Icon className="workspace-nav-icon" size={14} />
                <span className="workspace-nav-label">{item.label}</span>
                {item.id === 'agenti' && agentsNotificationCount > 0 && (
                  <span className="workspace-nav-badge">
                    {agentsNotificationCount > 99 ? '99+' : agentsNotificationCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="workspace-sidebar-spacer" />

        {/* Profile */}
        <div className="workspace-sidebar-footer">
          <div
            className="workspace-mini-profile"
            onClick={(e) => { e.stopPropagation(); setShowProfileMenu(v => !v); }}
          >
            <div className="workspace-mini-profile-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="workspace-mini-profile-info">
              <span className="workspace-mini-profile-name">
                {user?.name ? user.name.split(' ')[0] : 'Developer'}
              </span>
              <span className="workspace-mini-profile-role">Frontend Dev</span>
            </div>
            <Settings size={13} className="workspace-mini-profile-icon" />
          </div>

          {showProfileMenu && (
            <div className="workspace-profile-menu" onClick={e => e.stopPropagation()}>
              <button
                className="workspace-profile-menu-item"
                onClick={() => { setShowProfileMenu(false); navigate('/impostazioni'); }}
              >
                <User size={13} />
                <span>Profilo</span>
              </button>
              <button
                className="workspace-profile-menu-item workspace-profile-menu-item-danger"
                onClick={handleLogout}
              >
                <LogOut size={13} />
                <span>Esci</span>
              </button>
            </div>
          )}

          {/* Back to dashboard */}
          <Link to="/freelance" className="workspace-back-link">
            <ArrowLeft size={11} />
            <span>Dashboard principale</span>
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="workspace-main">
        <Outlet />
      </main>

      {/* Onboarding */}
      <WorkspaceOnboardingTour isFirstVisit={isFirstVisit} />
    </div>
  );
};

export default WorkspaceDeveloperLayout;
