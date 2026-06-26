import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarState } from '../../hooks/useSidebarState';
import { getWorkspaceTypeConfig } from './config/workspaceTypes';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import './workspace-tokens.css';
import './WorkspaceDeveloperLayout.css';

const WorkspaceAreaLayout: React.FC = () => {
  const { areaCode: paramAreaCode } = useParams<{ areaCode: string }>();
  const location = useLocation();
  // For fixed-path routes like /workspace/organic_web, :areaCode param is absent;
  // extract it from the pathname segment instead.
  const areaCode = paramAreaCode ?? location.pathname.split('/')[2] ?? undefined;
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  useSidebarState('workspace-sidebar-collapsed', false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const config = getWorkspaceTypeConfig(areaCode);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'W';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = () => setShowProfileMenu(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfileMenu]);

  return (
    <div className="workspace-layout workspace-theme-scope" data-theme={resolvedTheme}>
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-header">
          <div className="workspace-sidebar-brand">
            <span className="workspace-sidebar-brand-name">WorkSpace</span>
            <span className="workspace-sidebar-version">v1</span>
          </div>
        </div>

        <div className="workspace-sidebar-switcher">
          <WorkspaceSwitcher />
        </div>

        <div className="workspace-sidebar-spacer" />

        <div className="workspace-sidebar-footer">
          <div
            className="workspace-mini-profile"
            onClick={(e) => { e.stopPropagation(); setShowProfileMenu((v) => !v); }}
          >
            <div className="workspace-mini-profile-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="workspace-mini-profile-info">
              <span className="workspace-mini-profile-name">
                {user?.name ? user.name.split(' ')[0] : 'Freelance'}
              </span>
              <span className="workspace-mini-profile-role">{config?.name ?? 'WorkSpace'}</span>
            </div>
            <Settings size={13} className="workspace-mini-profile-icon" />
          </div>

          {showProfileMenu && (
            <div className="workspace-profile-menu" onClick={(e) => e.stopPropagation()}>
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

          <Link to="/freelance" className="workspace-back-link">
            <ArrowLeft size={11} />
            <span>Dashboard principale</span>
          </Link>
        </div>
      </aside>

      <main className="workspace-main">
        <Outlet />
      </main>
    </div>
  );
};

export default WorkspaceAreaLayout;
