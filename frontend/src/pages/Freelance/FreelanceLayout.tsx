import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Settings,
  FileText,
  PlayCircle,
  LayoutGrid,
  Zap,
  InboxIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFreelanceUser } from '../../utils/userRoles';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useGuide } from '../../context/GuideContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import Header from '../../components/Layout/Header';
import CachedFreelanceViews, { getFreelanceCacheKey } from '../../components/FreelanceCache/CachedFreelanceViews';
import FreelanceMobileLayout from './FreelanceMobileLayout';
import './FreelanceLayout.css';

const FreelanceDashboardPage = lazy(() => import('./FreelanceDashboardPage'));
const FreelanceProjectsPage = lazy(() => import('./FreelanceProjectsPage'));
const FreelanceTasksPage = lazy(() => import('./FreelanceTasksPage'));
const FreelanceRequestsPage = lazy(() => import('./FreelanceRequestsPage'));
const FreelanceChatPage = lazy(() => import('./FreelanceChatPage'));
const FreelanceAgendaPage = lazy(() => import('./FreelanceAgendaPage'));
const FreelanceSupportPage = lazy(() => import('./FreelanceSupportPage'));
const FreelanceNotificationsPage = lazy(() => import('./FreelanceNotificationsPage'));
const FreelanceSettingsPage = lazy(() => import('./FreelanceSettingsPage'));

const ViewCacheFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#007AFF', borderRadius: '50%' }} />
  </div>
);

function renderCachedView(cacheKey: string, isActive: boolean) {
  switch (cacheKey) {
    case '/freelance':
      return <FreelanceDashboardPage />;
    case '/freelance/progetti':
      return <FreelanceProjectsPage />;
    case '/freelance/task':
      return <FreelanceTasksPage />;
    case '/freelance/richieste':
      return <FreelanceRequestsPage />;
    case '/freelance/chat':
      return <FreelanceChatPage />;
    case '/freelance/calendario':
      return <FreelanceAgendaPage isVisible={isActive} />;
    case '/freelance/supporto':
      return <FreelanceSupportPage />;
    case '/freelance/notifiche':
      return <FreelanceNotificationsPage />;
    case '/freelance/impostazioni':
      return <FreelanceSettingsPage />;
    default:
      return null;
  }
}

interface NavItemProps {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  isWorkspace?: boolean;
}

const FreelanceLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const { startTour } = useGuide();
  const [collapsed, setCollapsed] = useSidebarState('freelance-sidebar-collapsed', false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);
  const [showCrmMenu, setShowCrmMenu] = useState(false);

  const userCrmDepartments = user?.crm_departments ?? [];
  const hasCrmDepartments = userCrmDepartments.length > 0;
  const isCrmPath = location.pathname.startsWith('/freelance/crm/');

  useEffect(() => {
    if (isCrmPath) {
      setShowCrmMenu(true);
    } else {
      setShowCrmMenu(false);
    }
  }, [isCrmPath]);

  useEffect(() => {
    if (user && location.pathname.startsWith('/freelance')) {
      if (!isFreelanceUser(user)) {
        const target = user.current_role === 'venditori' || user.current_role === 'seller'
          ? '/seller'
          : '/dashboard';
        window.location.href = target;
      }
    }
  }, [user?.current_role, user?.role, user?.roles, location.pathname]);

  const mainNavItems: NavItemProps[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/freelance' },
    { id: 'progetti', label: 'Progetti', icon: FolderOpen, path: '/freelance/progetti' },
    { id: 'task', label: 'Task', icon: CheckSquare, path: '/freelance/task' },
    { id: 'richieste', label: 'Richieste', icon: InboxIcon, path: '/freelance/richieste' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/freelance/chat' },
    { id: 'calendario', label: 'Calendario', icon: Calendar, path: '/freelance/calendario' },
  ];

  const isActive = (path: string) => {
    if (path === '/freelance') {
      return location.pathname === '/freelance' || location.pathname === '/freelance/';
    }
    if (path === '/workspace') {
      return location.pathname.startsWith('/workspace');
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'F';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isMobile) {
    return <FreelanceMobileLayout />;
  }

  return (
    <div className="freelance-layout">
      <aside className={`freelance-sidebar ${collapsed ? 'collapsed' : ''} ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        {/* Header */}
        <div className="freelance-sidebar-header">
          {!collapsed && (
            <div className="freelance-sidebar-brand">
              <span className="freelance-sidebar-logo">backclub</span>
              <span className="freelance-sidebar-version">Freelance</span>
            </div>
          )}
          <button
            className="freelance-sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={1.5} /> : <ChevronLeft size={14} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="freelance-sidebar-nav">
          {/* Section label */}
          {!collapsed && <div className="freelance-nav-section-label">Principale</div>}

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`freelance-nav-item ${active ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <motion.span
                    className="freelance-nav-active-indicator"
                    layoutId="activeNavIndicator"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  />
                )}
                <div className="freelance-nav-item-content">
                  <Icon className="freelance-nav-icon" size={16} strokeWidth={1.5} />
                  {!collapsed && <span className="freelance-nav-label">{item.label}</span>}
                </div>
              </NavLink>
            );
          })}

          {/* Workspace shortcut */}
          {!collapsed && <div className="freelance-nav-section-label" style={{ marginTop: '8px' }}>Strumenti</div>}
          <NavLink
            to="/workspace"
            className={`freelance-nav-item freelance-nav-item-workspace ${isActive('/workspace') ? 'active' : ''}`}
            title={collapsed ? 'WorkSpace' : undefined}
          >
            {isActive('/workspace') && (
              <motion.span
                className="freelance-nav-active-indicator"
                layoutId="activeNavIndicator"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              />
            )}
            <div className="freelance-nav-item-content">
              <Zap className="freelance-nav-icon freelance-nav-icon-workspace" size={16} strokeWidth={1.5} />
              {!collapsed && <span className="freelance-nav-label freelance-nav-label-workspace">WorkSpace</span>}
            </div>
          </NavLink>

          {/* CRM dedicati */}
          {hasCrmDepartments && (
            <div className="freelance-crm-wrapper">
              <button
                type="button"
                className={`freelance-nav-item ${isCrmPath ? 'active' : ''}`}
                onClick={() => setShowCrmMenu(!showCrmMenu)}
                title={collapsed ? 'CRM dedicati' : undefined}
              >
                <div className="freelance-nav-item-content">
                  <LayoutGrid className="freelance-nav-icon" size={16} strokeWidth={1.5} />
                  {!collapsed && (
                    <>
                      <span className="freelance-nav-label">CRM dedicati</span>
                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        className={`freelance-crm-chevron ${showCrmMenu ? 'open' : ''}`}
                      />
                    </>
                  )}
                </div>
              </button>
              {!collapsed && showCrmMenu && (
                <div className="freelance-crm-submenu">
                  {userCrmDepartments.map((crm) => (
                    <NavLink
                      key={crm.id}
                      to={`/freelance/crm/${encodeURIComponent(crm.code)}`}
                      className={({ isActive }) =>
                        `freelance-crm-submenu-item ${isActive ? 'active' : ''}`
                      }
                      style={
                        isCrmPath && location.pathname.includes(`/freelance/crm/${crm.code}`)
                          ? { borderLeftColor: crm.color }
                          : undefined
                      }
                      onClick={() => setShowCrmMenu(false)}
                    >
                      <span className="freelance-crm-dot" style={{ backgroundColor: crm.color }} />
                      <span className="freelance-crm-submenu-label">{crm.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tutorial */}
          {!collapsed && <div className="freelance-nav-section-label" style={{ marginTop: '8px' }}>Supporto</div>}
          <div className="freelance-tutorial-wrapper">
            <button
              className="freelance-tutorial-btn"
              onClick={() => setShowTutorialMenu(!showTutorialMenu)}
              title={collapsed ? 'Tutorial' : undefined}
            >
              <PlayCircle className="freelance-nav-icon" size={16} strokeWidth={1.5} />
              {!collapsed && (
                <>
                  <span className="freelance-nav-label">Tutorial</span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className={`freelance-tutorial-chevron ${showTutorialMenu ? 'open' : ''}`}
                  />
                </>
              )}
            </button>
            <AnimatePresence>
              {!collapsed && showTutorialMenu && (
                <motion.div
                  className="freelance-tutorial-menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                >
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance') {
                      navigate('/freelance');
                      setTimeout(() => startTour('freelance-complete-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-complete-tour'), 300);
                    }
                  }}>
                    <PlayCircle size={14} strokeWidth={1.5} /><span>Tour Completo</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance') {
                      navigate('/freelance');
                      setTimeout(() => startTour('freelance-dashboard-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-dashboard-tour'), 300);
                    }
                  }}>
                    <LayoutDashboard size={14} strokeWidth={1.5} /><span>Dashboard</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/progetti') {
                      navigate('/freelance/progetti');
                      setTimeout(() => startTour('freelance-progetti-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-progetti-tour'), 300);
                    }
                  }}>
                    <FolderOpen size={14} strokeWidth={1.5} /><span>Progetti</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/task') {
                      navigate('/freelance/task');
                      setTimeout(() => startTour('freelance-task-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-task-tour'), 300);
                    }
                  }}>
                    <CheckSquare size={14} strokeWidth={1.5} /><span>Task</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/richieste') {
                      navigate('/freelance/richieste');
                      setTimeout(() => startTour('freelance-richieste-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-richieste-tour'), 300);
                    }
                  }}>
                    <FileText size={14} strokeWidth={1.5} /><span>Richieste</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/chat') {
                      navigate('/freelance/chat');
                      setTimeout(() => startTour('freelance-chat-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-chat-tour'), 300);
                    }
                  }}>
                    <MessageSquare size={14} strokeWidth={1.5} /><span>Chat</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/calendario') {
                      navigate('/freelance/calendario');
                      setTimeout(() => startTour('freelance-calendario-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-calendario-tour'), 300);
                    }
                  }}>
                    <Calendar size={14} strokeWidth={1.5} /><span>Calendario</span>
                  </button>
                  <button onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/freelance/supporto') {
                      navigate('/freelance/supporto');
                      setTimeout(() => startTour('freelance-supporto-tour'), 800);
                    } else {
                      setTimeout(() => startTour('freelance-supporto-tour'), 300);
                    }
                  }}>
                    <HelpCircle size={14} strokeWidth={1.5} /><span>Supporto</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Supporto */}
          <NavLink
            to="/freelance/supporto"
            className={`freelance-nav-item ${isActive('/freelance/supporto') ? 'active' : ''}`}
            title={collapsed ? 'Supporto' : undefined}
          >
            {isActive('/freelance/supporto') && (
              <motion.span
                className="freelance-nav-active-indicator"
                layoutId="activeNavIndicator"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              />
            )}
            <div className="freelance-nav-item-content">
              <HelpCircle className="freelance-nav-icon" size={16} strokeWidth={1.5} />
              {!collapsed && <span className="freelance-nav-label">Supporto</span>}
            </div>
          </NavLink>
        </nav>

        {/* Footer */}
        {!collapsed ? (
          <div className="freelance-sidebar-footer">
            <div
              className="freelance-mini-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="freelance-mini-profile-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="freelance-mini-profile-info">
                <div className="freelance-mini-profile-name">
                  {user?.name ? (user.name.length > 18 ? user.name.substring(0, 18) + '…' : user.name) : 'Freelance'}
                </div>
                <div className="freelance-mini-profile-role">Freelance</div>
              </div>
              <Settings size={14} strokeWidth={1.5} className="freelance-mini-profile-icon" />
            </div>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="freelance-profile-menu"
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                >
                  <button
                    className="freelance-profile-menu-item"
                    onClick={() => { setShowProfileMenu(false); navigate('/freelance/impostazioni'); }}
                  >
                    <User size={14} strokeWidth={1.5} />
                    <span>Profilo</span>
                  </button>
                  <button
                    className="freelance-profile-menu-item freelance-profile-menu-item-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    <span>Esci</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="freelance-sidebar-footer-collapsed">
            <div
              className="freelance-profile-avatar-small"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={user?.name || 'Freelance'}
            >
              {getInitials(user?.name)}
            </div>
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="freelance-profile-menu freelance-profile-menu-collapsed"
                  initial={{ opacity: 0, x: 8, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                >
                  <button
                    className="freelance-profile-menu-item"
                    onClick={() => { setShowProfileMenu(false); navigate('/freelance/impostazioni'); }}
                  >
                    <User size={14} strokeWidth={1.5} />
                    <span>Profilo</span>
                  </button>
                  <button
                    className="freelance-profile-menu-item freelance-profile-menu-item-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    <span>Esci</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </aside>

      <div className={`freelance-content-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className={`freelance-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {getFreelanceCacheKey(location.pathname) !== null ? (
            <CachedFreelanceViews
              renderView={(key, isActive) => (
                <Suspense fallback={<ViewCacheFallback />}>
                  {renderCachedView(key, isActive)}
                </Suspense>
              )}
            />
          ) : (
            <Suspense fallback={<ViewCacheFallback />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
};

export default FreelanceLayout;
