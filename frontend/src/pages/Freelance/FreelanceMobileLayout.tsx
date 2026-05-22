import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  MessageSquare,
  HelpCircle,
  Bell,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  UserCog,
  FolderKanban,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import FreelanceMobileNavBar from '../../components/Mobile/FreelanceMobileNavBar';
import BottomSheet from '../../components/Mobile/BottomSheet';
import FreelanceGlobalSearch from '../../components/FreelanceGlobalSearch/FreelanceGlobalSearch';
import CachedFreelanceViews, { getFreelanceCacheKey } from '../../components/FreelanceCache/CachedFreelanceViews';
import './FreelanceMobileLayout.css';

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

const FreelanceMobileLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const searchResultsPortalRef = useRef<HTMLDivElement>(null);
  const [searchPortalReady, setSearchPortalReady] = useState(false);
  /** Visual viewport: quando la tastiera si apre su mobile, overlay e risultati si adattano (stile App Store) */
  const [visualViewport, setVisualViewport] = useState({ height: typeof window !== 'undefined' ? window.innerHeight : 0, offsetTop: 0 });

  useEffect(() => {
    if (showSearchOverlay) {
      const id = requestAnimationFrame(() => setSearchPortalReady(true));
      return () => cancelAnimationFrame(id);
    }
    setSearchPortalReady(false);
  }, [showSearchOverlay]);

  useEffect(() => {
    if (!showSearchOverlay || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setVisualViewport({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [showSearchOverlay]);

  useEffect(() => {
    if (location.pathname === '/freelance/more') {
      setShowMoreMenu(true);
    } else {
      setShowMoreMenu(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    setShowSearchOverlay(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      setShowMoreMenu(false);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login', { replace: true });
    }
  };

  const handleCambiaRuolo = () => {
    hapticButtonPress();
    setShowMoreMenu(false);
    sessionStorage.setItem('role_selection_in_progress', 'true');
    setTimeout(() => navigate('/role-selection', { state: { roles: user?.roles ?? [] }, replace: true }), 100);
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

  const moreMenuItems = [
    { id: 'progetti', label: 'Progetti', icon: FolderKanban, path: '/freelance/progetti' },
    { id: 'richieste', label: 'Richieste', icon: FileText, path: '/freelance/richieste' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/freelance/chat' },
    { id: 'supporto', label: 'Supporto', icon: HelpCircle, path: '/freelance/supporto' },
    { id: 'notifiche', label: 'Notifiche', icon: Bell, path: '/freelance/notifiche' },
  ];

  const userCrmDepartments = user?.crm_departments ?? [];

  return (
    <div className="freelance-mobile-layout">
      <main
        className="ios-system-background freelance-mobile-main"
        style={{
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
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

      <FreelanceMobileNavBar
        onMoreClick={() => setShowMoreMenu(true)}
        isMoreOpen={showMoreMenu}
        onSearchClick={() => setShowSearchOverlay(true)}
      />

      {/* Overlay ricerca stile App Store: barra in basso, risultati emergono dal basso */}
      {showSearchOverlay && (
        <div
          className="freelance-mobile-search-overlay"
          style={{
            ['--vvp-height' as string]: `${visualViewport.height}px`,
            ['--vvp-top' as string]: `${visualViewport.offsetTop}px`,
            top: visualViewport.offsetTop,
            height: visualViewport.height,
          }}
        >
          <div ref={searchResultsPortalRef} className="freelance-mobile-search-results-at-top" />
          <div className="freelance-mobile-search-overlay-backdrop" onClick={() => setShowSearchOverlay(false)} aria-hidden />
          <div className="freelance-mobile-search-overlay-bar">
            <button
              type="button"
              className="freelance-mobile-search-overlay-close"
              onClick={() => setShowSearchOverlay(false)}
              aria-label="Chiudi ricerca"
            >
              <X size={22} />
            </button>
            <div className="freelance-mobile-search-overlay-input-wrap">
              <FreelanceGlobalSearch
                placeholder={t('freelance.search_placeholder')}
                className="freelance-mobile-search-inline freelance-mobile-search-bottom-anchored"
                autoFocus
                onBlur={() => {}}
                resultsPortalRef={searchPortalReady ? searchResultsPortalRef : undefined}
              />
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        isOpen={showMoreMenu}
        onClose={() => {
          setShowMoreMenu(false);
          if (location.pathname === '/freelance/more') {
            navigate(-1);
          }
        }}
        title="Altro"
        snapPoints={[90]}
      >
        <div className="ios-sheet-handle" />
        <div className="freelance-more-sheet-content">

        {userCrmDepartments.length > 0 && (
          <div className="ios-inset-grouped">
            <div className="ios-inset-grouped-header">CRM dedicati</div>
            <ul className="ios-inset-grouped-list">
              {userCrmDepartments.map((crm) => (
                <Link
                  key={crm.id}
                  to={`/freelance/crm/${encodeURIComponent(crm.code)}`}
                  onClick={() => {
                    hapticButtonPress();
                    setShowMoreMenu(false);
                  }}
                  className="ios-inset-grouped-cell"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: crm.color,
                        marginRight: '12px',
                        flexShrink: 0,
                      }}
                    />
                    <span className="ios-body">{crm.name}</span>
                    <ChevronRight size={20} className="ios-chevron-right" />
                  </div>
                </Link>
              ))}
            </ul>
          </div>
        )}

        <div className="ios-inset-grouped freelance-more-actions-group">
          <ul className="ios-inset-grouped-list">
            {moreMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    hapticButtonPress();
                    setShowMoreMenu(false);
                  }}
                  className="ios-inset-grouped-cell"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Icon size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                    <span className="ios-body">{item.label}</span>
                    <ChevronRight size={20} className="ios-chevron-right" />
                  </div>
                </Link>
              );
            })}
            <button onClick={handleCambiaRuolo} className="ios-inset-grouped-cell">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <UserCog size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">Cambia ruolo</span>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </button>
          </ul>
        </div>

        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <button
              onClick={() => setShowMoreMenu(false)}
              className="ios-inset-grouped-cell"
              style={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                <div
                  className="ios-avatar"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {getInitials(user?.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ios-body-bold" style={{ marginBottom: '2px' }}>
                    {user?.name || 'Freelance'}
                  </div>
                  <div className="ios-subhead">{user?.email}</div>
                </div>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </button>
          </ul>
        </div>

        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <button onClick={() => toggleTheme()} className="ios-inset-grouped-cell">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {theme === 'dark' ? (
                  <Sun size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                ) : (
                  <Moon size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                )}
                <span className="ios-body">
                  {theme === 'dark' ? 'Modalità Chiara' : 'Modalità Scura'}
                </span>
              </div>
            </button>
          </ul>
        </div>

        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <button
              onClick={() => {
                hapticButtonPress();
                handleLogout();
              }}
              className="ios-inset-grouped-cell"
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <LogOut size={20} style={{ color: '#FF453A', marginRight: '12px' }} />
                <span className="ios-body" style={{ color: '#FF453A' }}>
                  Esci
                </span>
              </div>
            </button>
          </ul>
        </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default FreelanceMobileLayout;
