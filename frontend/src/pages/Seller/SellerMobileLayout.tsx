import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  UserCircle,
  DollarSign,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  UserCog,
  Calendar,
  X,
  Globe,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../api/auth';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SellerMobileNavBar from '../../components/Mobile/SellerMobileNavBar';
import BottomSheet from '../../components/Mobile/BottomSheet';
import SellerGlobalSearch from '../../components/SellerGlobalSearch/SellerGlobalSearch';
import './SellerMobileLayout.css';

const LANGUAGES = [
  { code: 'it' as const, flag: '🇮🇹' },
  { code: 'en' as const, flag: '🇬🇧' },
  { code: 'es' as const, flag: '🇪🇸' },
  { code: 'fr' as const, flag: '🇫🇷' },
];

const SellerMobileLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const searchResultsPortalRef = useRef<HTMLDivElement>(null);
  const [searchPortalReady, setSearchPortalReady] = useState(false);
  const [visualViewport, setVisualViewport] = useState({ height: typeof window !== 'undefined' ? window.innerHeight : 0, offsetTop: 0 });

  useEffect(() => {
    setShowSearchOverlay(false);
  }, [location.pathname]);

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

  // Check if we're on the "more" route to show the menu
  React.useEffect(() => {
    if (location.pathname === '/seller/more') {
      setShowMoreMenu(true);
    } else {
      // Don't show menu for settings page
      if (location.pathname === '/seller/impostazioni') {
        setShowMoreMenu(false);
      } else {
        // Just close the menu, don't navigate - the route is already correct
        setShowMoreMenu(false);
      }
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      setShowMoreMenu(false);
      await logout();
      // Use replace to prevent back navigation
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if logout fails
      navigate('/login', { replace: true });
    }
  };

  const handleCambiaRuolo = () => {
    hapticButtonPress();
    setShowMoreMenu(false);
    sessionStorage.setItem('role_selection_in_progress', 'true');
    setTimeout(() => navigate('/role-selection', { state: { roles: user?.roles ?? [] }, replace: true }), 100);
  };

  const handleLanguageSelect = async (langCode: string) => {
    hapticButtonPress();
    const prevLng = i18n.language;
    i18n.changeLanguage(langCode);
    setShowLanguageSheet(false);
    try {
      await authApi.updateOnboardingPreferences({ preferred_language: langCode });
      await refreshUser();
    } catch (err) {
      console.error('Error saving language preference:', err);
      i18n.changeLanguage(prevLng);
    }
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

  const moreMenuItems = [
    {
      id: 'agenda',
      label: t('menu.agenda'),
      icon: Calendar,
      path: '/seller/agenda',
    },
    {
      id: 'listini',
      label: t('menu.listini'),
      icon: Package,
      path: '/seller/listini',
    },
    {
      id: 'clienti',
      label: t('menu.clienti'),
      icon: UserCircle,
      path: '/seller/clienti',
    },
    {
      id: 'commissioni',
      label: t('menu.commissioni'),
      icon: DollarSign,
      path: '/seller/commissioni',
    },
    {
      id: 'supporto',
      label: t('menu.supporto'),
      icon: HelpCircle,
      path: '/seller/supporto',
    },
  ];

  return (
    <div className="seller-mobile-layout">
      {/* Main Content Area */}
      <main
        className="ios-system-background seller-mobile-main"
        style={{
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <SellerMobileNavBar
        onMoreClick={() => setShowMoreMenu(true)}
        isMoreOpen={showMoreMenu}
        onSearchClick={() => setShowSearchOverlay(true)}
      />

      {/* Overlay ricerca: stessa UX del Freelance (pillola in basso, risultati in cima) */}
      {showSearchOverlay && (
        <div
          className="seller-mobile-search-overlay"
          style={{
            ['--vvp-height' as string]: `${visualViewport.height}px`,
            ['--vvp-top' as string]: `${visualViewport.offsetTop}px`,
            top: visualViewport.offsetTop,
            height: visualViewport.height,
          }}
        >
          <div ref={searchResultsPortalRef} className="seller-mobile-search-results-at-top" />
          <div className="seller-mobile-search-overlay-backdrop" onClick={() => setShowSearchOverlay(false)} aria-hidden />
          <div className="seller-mobile-search-overlay-bar">
            <button
              type="button"
              className="seller-mobile-search-overlay-close"
              onClick={() => setShowSearchOverlay(false)}
              aria-label={t('menu.chiudi_ricerca', 'Chiudi ricerca')}
            >
              <X size={22} />
            </button>
            <div className="seller-mobile-search-overlay-input-wrap">
              <SellerGlobalSearch
                placeholder={t('menu.cerca_placeholder', 'Cerca clienti, preventivi...')}
                className="seller-mobile-search-inline seller-mobile-search-bottom-anchored"
                autoFocus
                onBlur={() => {}}
                resultsPortalRef={searchPortalReady ? searchResultsPortalRef : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* More Menu Bottom Sheet - iOS Sheet Style */}
      <BottomSheet
        isOpen={showMoreMenu}
        onClose={() => {
          setShowMoreMenu(false);
          if (location.pathname === '/seller/more') {
            navigate(-1);
          }
        }}
        title={t('menu.more')}
        snapPoints={[90]}
      >
        {/* Sheet Handle */}
        <div className="ios-sheet-handle" />

        {/* Navigation Group */}
        <div className="ios-inset-grouped seller-more-actions-group">
          <ul className="ios-inset-grouped-list">
            {moreMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === moreMenuItems.length - 1;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    hapticButtonPress();
                    setShowMoreMenu(false);
                  }}
                  className={`ios-inset-grouped-cell ${isLast ? '' : ''}`}
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
          </ul>
        </div>

        {/* Profile Group */}
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <button
              onClick={() => {
                setShowMoreMenu(false);
                // Navigate to profile if exists
              }}
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
                  }}
                >
                  {getInitials(user?.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ios-body-bold" style={{ marginBottom: '2px' }}>
                    {user?.name || 'Venditore'}
                  </div>
                  <div className="ios-subhead">{user?.email}</div>
                </div>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </button>
          </ul>
        </div>

        {/* Settings Group (Lingua, Tema, Cambia ruolo, Impostazioni) */}
        <div className="ios-inset-grouped seller-more-settings-group">
          <ul className="ios-inset-grouped-list">
            <button
              onClick={() => {
                hapticButtonPress();
                setShowLanguageSheet(true);
              }}
              className="ios-inset-grouped-cell"
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Globe size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">{t('menu.lingua')}</span>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </button>
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="ios-inset-grouped-cell"
            >
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
            <button onClick={handleCambiaRuolo} className="ios-inset-grouped-cell">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <UserCog size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">{t('menu.cambia_ruolo')}</span>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </button>
            <Link
              to="/seller/impostazioni"
              onClick={() => {
                hapticButtonPress();
                setShowMoreMenu(false);
              }}
              className="ios-inset-grouped-cell"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Settings size={20} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">{t('menu.impostazioni')}</span>
                <ChevronRight size={20} className="ios-chevron-right" />
              </div>
            </Link>
          </ul>
        </div>

        {/* Logout Group */}
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
                  {t('menu.logout')}
                </span>
              </div>
            </button>
          </ul>
        </div>
      </BottomSheet>

      {/* Language selection sheet */}
      <BottomSheet
        isOpen={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        title={t('menu.lingua')}
        snapPoints={[50]}
      >
        <div className="ios-sheet-handle" />
        <div className="ios-inset-grouped seller-more-actions-group">
          <ul className="ios-inset-grouped-list">
            {LANGUAGES.map((lang, index) => {
              const isSelected = (i18n.language || 'it').startsWith(lang.code);
              const isLast = index === LANGUAGES.length - 1;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`ios-inset-grouped-cell ${isLast ? 'ios-inset-grouped-cell-last' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '22px', marginRight: '12px' }}>{lang.flag}</span>
                    <span className="ios-body">{t(`languages.${lang.code}`)}</span>
                    {isSelected && (
                      <Check size={20} className="ios-checkmark" style={{ marginLeft: 'auto', color: '#0A84FF' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </ul>
        </div>
      </BottomSheet>
    </div>
  );
};

export default SellerMobileLayout;
