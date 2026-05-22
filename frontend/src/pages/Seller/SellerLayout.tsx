import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home,
  Package, 
  FileText, 
  Briefcase, 
  UserCircle,
  DollarSign,
  Phone,
  Calendar,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Bell,
  Settings,
  PlayCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useGuide } from '../../context/GuideContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import Header from '../../components/Layout/Header';
import SellerMobileLayout from './SellerMobileLayout';
import './SellerLayout.css';

const SellerLayout: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const { startTour } = useGuide();
  const [collapsed, setCollapsed] = useSidebarState('seller-sidebar-collapsed', false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);

  // Monitora i cambiamenti di ruolo e reindirizza se l'utente non è più un venditore
  // Solo se siamo effettivamente nella route /seller
  useEffect(() => {
    if (user && location.pathname.startsWith('/seller')) {
      const activeRole = user.current_role || user.role;
      const isSeller = user.seller_id || activeRole === 'seller' || activeRole === 'venditori';
      
      if (!isSeller) {
        // L'utente non è più un venditore, reindirizza alla dashboard principale
        // Usa window.location per forzare un reload completo
        window.location.href = '/dashboard';
      }
    }
  }, [user?.current_role, user?.role, user?.seller_id, location.pathname]);

  const menuItems = [
    { 
      id: 'dashboard', 
      label: t('menu.dashboard'), 
      icon: Home, 
      path: '/seller',
      badge: null
    },
    { 
      id: 'listini', 
      label: t('menu.listini'), 
      icon: Package, 
      path: '/seller/listini',
      badge: null
    },
    { 
      id: 'preventivi', 
      label: t('menu.preventivi'), 
      icon: FileText, 
      path: '/seller/preventivi',
      badge: 'pending' // Will be calculated from API
    },
    { 
      id: 'contratti', 
      label: t('menu.contratti'), 
      icon: Briefcase, 
      path: '/seller/contratti',
      badge: null
    },
    { 
      id: 'clienti', 
      label: t('menu.clienti'), 
      icon: UserCircle, 
      path: '/seller/clienti',
      badge: null
    },
    { 
      id: 'commissioni', 
      label: t('menu.commissioni'), 
      icon: DollarSign, 
      path: '/seller/commissioni',
      badge: null
    },
    { 
      id: 'contatti', 
      label: t('menu.contatti'), 
      icon: Phone, 
      path: '/seller/contatti',
      badge: 'new' // Will be calculated from API
    },
    { 
      id: 'agenda', 
      label: t('menu.agenda'), 
      icon: Calendar, 
      path: '/seller/agenda',
      badge: null
    },
    { 
      id: 'supporto', 
      label: t('menu.supporto'), 
      icon: HelpCircle, 
      path: '/seller/supporto',
      badge: null
    },
  ];

  const isActive = (path: string) => {
    if (path === '/seller') {
      return location.pathname === '/seller' || location.pathname === '/seller/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'V';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render mobile layout if on mobile device
  if (isMobile) {
    return <SellerMobileLayout />;
  }

  return (
    <div className="seller-layout">
      <aside className={`seller-sidebar ${collapsed ? 'collapsed' : ''} ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="seller-sidebar-header">
          {!collapsed && (
            <div className="seller-sidebar-brand">
              <h2 className="seller-sidebar-title">Venditore</h2>
              <p className="seller-sidebar-subtitle">Home</p>
            </div>
          )}
          <button
            className="seller-sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="seller-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`seller-nav-item ${active ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="seller-nav-item-content">
                  <Icon className="seller-nav-icon" size={20} />
                  {!collapsed && (
                    <>
                      <span className="seller-nav-label">{item.label}</span>
                      {item.badge && (
                        <span className="seller-nav-badge">
                          <Bell size={12} />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </NavLink>
            );
          })}
          
          {/* Tutorial Button */}
          <div className="seller-tutorial-wrapper">
            <button
              className="seller-tutorial-btn"
              onClick={() => {
                hapticButtonPress();
                setShowTutorialMenu(!showTutorialMenu);
              }}
              title={collapsed ? t('menu.tutorial') : undefined}
            >
              <PlayCircle className="seller-nav-icon" size={20} />
              {!collapsed && (
                <>
                  <span className="seller-nav-label">{t('menu.tutorial')}</span>
                  <ChevronRight 
                    size={16} 
                    className={`seller-tutorial-chevron ${showTutorialMenu ? 'open' : ''}`}
                  />
                </>
              )}
            </button>
            
            {!collapsed && showTutorialMenu && (
              <div className="seller-tutorial-menu">
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    // Naviga alla dashboard per il tour completo
                    if (location.pathname !== '/seller') {
                      navigate('/seller');
                      // Se dobbiamo navigare, aspettiamo di più
                      setTimeout(() => {
                        startTour('complete-tour');
                      }, 800);
                    } else {
                      // Se siamo già sulla dashboard, possiamo avviare subito
                      setTimeout(() => {
                        startTour('complete-tour');
                      }, 300);
                    }
                  }}
                >
                  <PlayCircle size={16} />
                  <span>Tour Completo</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller') {
                      navigate('/seller');
                    }
                    setTimeout(() => {
                      startTour('dashboard-tour');
                    }, 500);
                  }}
                >
                  <Home size={16} />
                  <span>{t('menu.dashboard')}</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/listini') {
                      navigate('/seller/listini');
                    }
                    setTimeout(() => {
                      startTour('listini-tour');
                    }, 500);
                  }}
                >
                  <Package size={16} />
                  <span>Listini</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/preventivi') {
                      navigate('/seller/preventivi');
                    }
                    setTimeout(() => {
                      startTour('preventivi-tour');
                    }, 500);
                  }}
                >
                  <FileText size={16} />
                  <span>Preventivi</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/contratti') {
                      navigate('/seller/contratti');
                    }
                    setTimeout(() => {
                      startTour('contratti-tour');
                    }, 500);
                  }}
                >
                  <Briefcase size={16} />
                  <span>Contratti</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/clienti') {
                      navigate('/seller/clienti');
                    }
                    setTimeout(() => {
                      startTour('clienti-tour');
                    }, 500);
                  }}
                >
                  <UserCircle size={16} />
                  <span>Clienti</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/commissioni') {
                      navigate('/seller/commissioni');
                    }
                    setTimeout(() => {
                      startTour('commissioni-tour');
                    }, 500);
                  }}
                >
                  <DollarSign size={16} />
                  <span>Commissioni</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/contatti') {
                      navigate('/seller/contatti');
                    }
                    setTimeout(() => {
                      startTour('contatti-tour');
                    }, 500);
                  }}
                >
                  <Phone size={16} />
                  <span>Contatti</span>
                </button>
                <button
                  className="seller-tutorial-menu-item"
                  onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/agenda') {
                      navigate('/seller/agenda');
                      setTimeout(() => {
                        startTour('agenda-tour');
                      }, 800);
                    } else {
                      setTimeout(() => {
                        startTour('agenda-tour');
                      }, 300);
                    }
                  }}
                >
                  <Calendar size={16} />
                  <span>Agenda</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {!collapsed && (
          <div className="seller-sidebar-footer">
            <div 
              className="seller-mini-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="seller-mini-profile-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="seller-mini-profile-name">
                {user?.name ? (user.name.length > 20 ? user.name.substring(0, 20) + '...' : user.name) : 'Venditore'}
              </div>
              <Settings size={16} className="seller-mini-profile-icon" />
            </div>
            
            {showProfileMenu && (
              <div className="seller-profile-menu">
                <button 
                  className="seller-profile-menu-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Navigate to profile settings if exists
                  }}
                >
                  <User size={16} />
                  <span>Profilo</span>
                </button>
                <button 
                  className="seller-profile-menu-item"
                  onClick={() => {
                    hapticButtonPress();
                    setShowProfileMenu(false);
                    navigate('/seller/impostazioni');
                  }}
                >
                  <Settings size={16} />
                  <span>{t('menu.impostazioni')}</span>
                </button>
                <button 
                  className="seller-profile-menu-item seller-profile-menu-item-danger"
                  onClick={() => {
                    hapticButtonPress();
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>{t('menu.logout')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {collapsed && (
          <div className="seller-sidebar-footer-collapsed">
            <div 
              className="seller-profile-avatar-small"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={user?.name || 'Venditore'}
            >
              {getInitials(user?.name)}
            </div>
            {showProfileMenu && (
              <div className="seller-profile-menu seller-profile-menu-collapsed">
                <button 
                  className="seller-profile-menu-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Navigate to profile if exists
                  }}
                >
                  <User size={16} />
                  <span>Profilo</span>
                </button>
                <button 
                  className="seller-profile-menu-item"
                  onClick={() => {
                    hapticButtonPress();
                    setShowProfileMenu(false);
                    navigate('/seller/impostazioni');
                  }}
                >
                  <Settings size={16} />
                  <span>{t('menu.impostazioni')}</span>
                </button>
                <button 
                  className="seller-profile-menu-item seller-profile-menu-item-danger"
                  onClick={() => {
                    hapticButtonPress();
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>{t('menu.logout')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className={`seller-content-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className={`seller-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;

