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
  Settings,
  PlayCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { isSellerUser, getHomeRouteForUser } from '../../utils/userRoles';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useGuide } from '../../context/GuideContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import Header from '../../components/Layout/Header';
import SellerMobileLayout from './SellerMobileLayout';
import './SellerLayout.css';

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 60;

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

  // Redirect if user is no longer a seller
  useEffect(() => {
    if (user && location.pathname.startsWith('/seller')) {
      if (!isSellerUser(user)) {
        window.location.href = getHomeRouteForUser(user);
      }
    }
  }, [user?.current_role, user?.role, user?.seller_id, location.pathname]);

  const menuItems = [
    { id: 'dashboard',   label: t('menu.dashboard'),   icon: Home,       path: '/seller',              badge: null },
    { id: 'listini',     label: t('menu.listini'),     icon: Package,    path: '/seller/listini',      badge: null },
    { id: 'preventivi',  label: t('menu.preventivi'),  icon: FileText,   path: '/seller/preventivi',   badge: 'pending' },
    { id: 'contratti',   label: t('menu.contratti'),   icon: Briefcase,  path: '/seller/contratti',    badge: null },
    { id: 'clienti',     label: t('menu.clienti'),     icon: UserCircle, path: '/seller/clienti',      badge: null },
    { id: 'commissioni', label: t('menu.commissioni'), icon: DollarSign, path: '/seller/commissioni',  badge: null },
    { id: 'contatti',    label: t('menu.contatti'),    icon: Phone,      path: '/seller/contatti',     badge: 'new' },
    { id: 'agenda',      label: t('menu.agenda'),      icon: Calendar,   path: '/seller/agenda',       badge: null },
    { id: 'supporto',    label: t('menu.supporto'),    icon: HelpCircle, path: '/seller/supporto',     badge: null },
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

  if (isMobile) {
    return <SellerMobileLayout />;
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const labelVariants = {
    expanded: { opacity: 1, x: 0,  width: 'auto', transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const } },
    collapsed:{ opacity: 0, x: -6, width: 0,      transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] as const } },
  };

  const profileInfoVariants = {
    expanded: { opacity: 1, width: 'auto', transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const } },
    collapsed:{ opacity: 0, width: 0,      transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] as const } },
  };

  return (
    <div className="seller-layout" data-theme={resolvedTheme}>
      {/* ── Animated Sidebar ─────────────────────────────────── */}
      <motion.aside
        className={`seller-sidebar${collapsed ? ' collapsed' : ''}`}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }}
        style={{ willChange: 'width' }}
      >
        {/* Header */}
        <div className="seller-sidebar-header">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                className="seller-sidebar-brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
              >
                <span className="seller-sidebar-title">Venditore</span>
                <span className="seller-sidebar-subtitle">Portale</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="seller-sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="seller-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`seller-nav-item${active ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="seller-nav-item-content">
                  <Icon className="seller-nav-icon" size={20} />
                  <motion.span
                    className="seller-nav-label"
                    variants={labelVariants}
                    animate={collapsed ? 'collapsed' : 'expanded'}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
                  >
                    {item.label}
                  </motion.span>
                  {!collapsed && item.badge && (
                    <span className="seller-nav-badge" />
                  )}
                </div>
              </NavLink>
            );
          })}

          {/* Tutorial section */}
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
              <motion.span
                variants={labelVariants}
                animate={collapsed ? 'collapsed' : 'expanded'}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
              >
                {t('menu.tutorial')}
              </motion.span>
              {!collapsed && (
                <ChevronRight
                  size={14}
                  className={`seller-tutorial-chevron${showTutorialMenu ? ' open' : ''}`}
                />
              )}
            </button>

            <AnimatePresence>
              {!collapsed && showTutorialMenu && (
                <motion.div
                  className="seller-tutorial-menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller') {
                      navigate('/seller');
                      setTimeout(() => startTour('complete-tour'), 800);
                    } else {
                      setTimeout(() => startTour('complete-tour'), 300);
                    }
                  }}>
                    <PlayCircle size={14} /><span>Tour Completo</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller') navigate('/seller');
                    setTimeout(() => startTour('dashboard-tour'), 500);
                  }}>
                    <Home size={14} /><span>{t('menu.dashboard')}</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/listini') navigate('/seller/listini');
                    setTimeout(() => startTour('listini-tour'), 500);
                  }}>
                    <Package size={14} /><span>Listini</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/preventivi') navigate('/seller/preventivi');
                    setTimeout(() => startTour('preventivi-tour'), 500);
                  }}>
                    <FileText size={14} /><span>Preventivi</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/contratti') navigate('/seller/contratti');
                    setTimeout(() => startTour('contratti-tour'), 500);
                  }}>
                    <Briefcase size={14} /><span>Contratti</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/clienti') navigate('/seller/clienti');
                    setTimeout(() => startTour('clienti-tour'), 500);
                  }}>
                    <UserCircle size={14} /><span>Clienti</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/commissioni') navigate('/seller/commissioni');
                    setTimeout(() => startTour('commissioni-tour'), 500);
                  }}>
                    <DollarSign size={14} /><span>Commissioni</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/contatti') navigate('/seller/contatti');
                    setTimeout(() => startTour('contatti-tour'), 500);
                  }}>
                    <Phone size={14} /><span>Contatti</span>
                  </button>
                  <button className="seller-tutorial-menu-item" onClick={() => {
                    setShowTutorialMenu(false);
                    if (location.pathname !== '/seller/agenda') {
                      navigate('/seller/agenda');
                      setTimeout(() => startTour('agenda-tour'), 800);
                    } else {
                      setTimeout(() => startTour('agenda-tour'), 300);
                    }
                  }}>
                    <Calendar size={14} /><span>Agenda</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Footer — expanded: mini profile with name/role */}
        <AnimatePresence initial={false} mode="wait">
          {!collapsed ? (
            <motion.div
              key="footer-expanded"
              className="seller-sidebar-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <div
                className="seller-mini-profile"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="seller-mini-profile-avatar">
                  {getInitials(user?.name)}
                </div>
                <motion.div
                  className="seller-mini-profile-info"
                  variants={profileInfoVariants}
                  animate="expanded"
                  style={{ overflow: 'hidden' }}
                >
                  <div className="seller-mini-profile-name">
                    {user?.name
                      ? user.name.length > 18 ? user.name.substring(0, 18) + '…' : user.name
                      : 'Venditore'}
                  </div>
                  <div className="seller-mini-profile-role">Venditore</div>
                </motion.div>
                <Settings size={14} className="seller-mini-profile-icon" />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    className="seller-profile-menu"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      className="seller-profile-menu-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User size={14} /><span>Profilo</span>
                    </button>
                    <button
                      className="seller-profile-menu-item"
                      onClick={() => {
                        hapticButtonPress();
                        setShowProfileMenu(false);
                        navigate('/seller/impostazioni');
                      }}
                    >
                      <Settings size={14} /><span>{t('menu.impostazioni')}</span>
                    </button>
                    <button
                      className="seller-profile-menu-item seller-profile-menu-item-danger"
                      onClick={() => {
                        hapticButtonPress();
                        handleLogout();
                      }}
                    >
                      <LogOut size={14} /><span>{t('menu.logout')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="footer-collapsed"
              className="seller-sidebar-footer-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <div
                className="seller-profile-avatar-small"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={user?.name || 'Venditore'}
              >
                {getInitials(user?.name)}
              </div>
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    className="seller-profile-menu seller-profile-menu-collapsed"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      className="seller-profile-menu-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User size={14} /><span>Profilo</span>
                    </button>
                    <button
                      className="seller-profile-menu-item"
                      onClick={() => {
                        hapticButtonPress();
                        setShowProfileMenu(false);
                        navigate('/seller/impostazioni');
                      }}
                    >
                      <Settings size={14} /><span>{t('menu.impostazioni')}</span>
                    </button>
                    <button
                      className="seller-profile-menu-item seller-profile-menu-item-danger"
                      onClick={() => {
                        hapticButtonPress();
                        handleLogout();
                      }}
                    >
                      <LogOut size={14} /><span>{t('menu.logout')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ── Content wrapper ──────────────────────────────────── */}
      <motion.div
        className={`seller-content-wrapper${collapsed ? ' sidebar-collapsed' : ''}`}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }}
        style={{ width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
      >
        <Header />
        <main className="seller-main">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
};

export default SellerLayout;
