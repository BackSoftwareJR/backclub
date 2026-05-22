import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FolderKanban,
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
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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

const ViewCacheFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid var(--color-bg-tertiary)', borderTopColor: 'var(--color-accent-blue)', borderRadius: '50%' }} />
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
    default:
      return null;
  }
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

  // Espandi il menu CRM quando si è in una vista CRM
  useEffect(() => {
    if (isCrmPath) setShowCrmMenu(true);
  }, [isCrmPath]);

  // Monitor role changes and redirect if user is no longer a freelance
  useEffect(() => {
    if (user && location.pathname.startsWith('/freelance')) {
      const activeRole = user.current_role || user.role;
      const isFreelance = activeRole === 'freelance' || user.roles?.includes('freelance');
      
      if (!isFreelance) {
        window.location.href = '/dashboard';
      }
    }
  }, [user?.current_role, user?.role, user?.roles, location.pathname]);

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Home, 
      path: '/freelance',
    },
    { 
      id: 'progetti', 
      label: 'Progetti', 
      icon: FolderKanban, 
      path: '/freelance/progetti',
    },
    { 
      id: 'task', 
      label: 'Task', 
      icon: CheckSquare, 
      path: '/freelance/task',
    },
    { 
      id: 'richieste', 
      label: 'Richieste', 
      icon: FileText, 
      path: '/freelance/richieste',
    },
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: MessageSquare, 
      path: '/freelance/chat',
    },
    { 
      id: 'calendario', 
      label: 'Calendario', 
      icon: Calendar, 
      path: '/freelance/calendario',
    },
    { 
      id: 'supporto', 
      label: 'Supporto', 
      icon: HelpCircle, 
      path: '/freelance/supporto',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/freelance') {
      return location.pathname === '/freelance' || location.pathname === '/freelance/';
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
        <div className="freelance-sidebar-header">
          {!collapsed && (
            <div className="freelance-sidebar-brand">
              <h2 className="freelance-sidebar-title">Freelance</h2>
              <p className="freelance-sidebar-subtitle">Il tuo lavoro</p>
            </div>
          )}
          <button
            className="freelance-sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="freelance-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`freelance-nav-item ${active ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="freelance-nav-item-content">
                  <Icon className="freelance-nav-icon" size={20} />
                  {!collapsed && (
                    <span className="freelance-nav-label">{item.label}</span>
                  )}
                </div>
              </NavLink>
            );
          })}

          {/* CRM dedicati - solo se l'utente ha almeno un CRM assegnato */}
          {hasCrmDepartments && (
            <div className="freelance-crm-wrapper">
              <button
                type="button"
                className={`freelance-nav-item ${isCrmPath ? 'active' : ''}`}
                onClick={() => setShowCrmMenu(!showCrmMenu)}
                title={collapsed ? 'CRM dedicati' : undefined}
              >
                <div className="freelance-nav-item-content">
                  <LayoutGrid className="freelance-nav-icon" size={20} />
                  {!collapsed && (
                    <>
                      <span className="freelance-nav-label">CRM dedicati</span>
                      <ChevronDown
                        size={16}
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
                      <span
                        className="freelance-crm-dot"
                        style={{ backgroundColor: crm.color }}
                      />
                      <span className="freelance-crm-submenu-label">{crm.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Tutorial Button */}
          <div className="freelance-tutorial-wrapper">
            <button
              className="freelance-tutorial-btn"
              onClick={() => setShowTutorialMenu(!showTutorialMenu)}
              title={collapsed ? 'Tutorial' : undefined}
            >
              <PlayCircle className="freelance-nav-icon" size={20} />
              {!collapsed && (
                <>
                  <span className="freelance-nav-label">Tutorial</span>
                  <ChevronRight
                    size={16}
                    className={`freelance-tutorial-chevron ${showTutorialMenu ? 'open' : ''}`}
                  />
                </>
              )}
            </button>
            {!collapsed && showTutorialMenu && (
              <div className="freelance-tutorial-menu">
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance') {
                    navigate('/freelance');
                    setTimeout(() => {
                      startTour('freelance-complete-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-complete-tour');
                    }, 300);
                  }
                }}>
                  <PlayCircle size={16} /><span>Tour Completo</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance') {
                    navigate('/freelance');
                    setTimeout(() => {
                      startTour('freelance-dashboard-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-dashboard-tour');
                    }, 300);
                  }
                }}>
                  <Home size={16} /><span>Dashboard</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/progetti') {
                    navigate('/freelance/progetti');
                    setTimeout(() => {
                      startTour('freelance-progetti-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-progetti-tour');
                    }, 300);
                  }
                }}>
                  <FolderKanban size={16} /><span>Progetti</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/task') {
                    navigate('/freelance/task');
                    setTimeout(() => {
                      startTour('freelance-task-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-task-tour');
                    }, 300);
                  }
                }}>
                  <CheckSquare size={16} /><span>Task</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/richieste') {
                    navigate('/freelance/richieste');
                    setTimeout(() => {
                      startTour('freelance-richieste-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-richieste-tour');
                    }, 300);
                  }
                }}>
                  <FileText size={16} /><span>Richieste</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/chat') {
                    navigate('/freelance/chat');
                    setTimeout(() => {
                      startTour('freelance-chat-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-chat-tour');
                    }, 300);
                  }
                }}>
                  <MessageSquare size={16} /><span>Chat</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/calendario') {
                    navigate('/freelance/calendario');
                    setTimeout(() => {
                      startTour('freelance-calendario-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-calendario-tour');
                    }, 300);
                  }
                }}>
                  <Calendar size={16} /><span>Calendario</span>
                </button>
                <button onClick={() => {
                  setShowTutorialMenu(false);
                  if (location.pathname !== '/freelance/supporto') {
                    navigate('/freelance/supporto');
                    setTimeout(() => {
                      startTour('freelance-supporto-tour');
                    }, 800);
                  } else {
                    setTimeout(() => {
                      startTour('freelance-supporto-tour');
                    }, 300);
                  }
                }}>
                  <HelpCircle size={16} /><span>Supporto</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {!collapsed && (
          <div className="freelance-sidebar-footer">
            <div 
              className="freelance-mini-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="freelance-mini-profile-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="freelance-mini-profile-name">
                {user?.name ? (user.name.length > 20 ? user.name.substring(0, 20) + '...' : user.name) : 'Freelance'}
              </div>
              <Settings size={16} className="freelance-mini-profile-icon" />
            </div>
            
            {showProfileMenu && (
              <div className="freelance-profile-menu">
                <button 
                  className="freelance-profile-menu-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Navigate to profile settings if exists
                  }}
                >
                  <User size={16} />
                  <span>Profilo</span>
                </button>
                <button 
                  className="freelance-profile-menu-item freelance-profile-menu-item-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Esci</span>
                </button>
              </div>
            )}
          </div>
        )}

        {collapsed && (
          <div className="freelance-sidebar-footer-collapsed">
            <div 
              className="freelance-profile-avatar-small"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={user?.name || 'Freelance'}
            >
              {getInitials(user?.name)}
            </div>
            {showProfileMenu && (
              <div className="freelance-profile-menu freelance-profile-menu-collapsed">
                <button 
                  className="freelance-profile-menu-item"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User size={16} />
                  <span>Profilo</span>
                </button>
                <button 
                  className="freelance-profile-menu-item freelance-profile-menu-item-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Esci</span>
                </button>
              </div>
            )}
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
