import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Users, FileText, MoreHorizontal, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sellersApi } from '../../api/sellers';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import './SellerMobileNavBar.css';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: number | null;
}

interface SellerMobileNavBarProps {
  /** Se fornito, al tap su "Altro" si apre il menu senza navigare (mantiene scroll e pagina) */
  onMoreClick?: () => void;
  /** Quando true, la tab Altro viene mostrata come attiva (menu aperto) */
  isMoreOpen?: boolean;
  /** Tap sull'icona ricerca: apre la barra di ricerca (stile App Store) */
  onSearchClick?: () => void;
}

const SellerMobileNavBar: React.FC<SellerMobileNavBarProps> = ({ onMoreClick, isMoreOpen, onSearchClick }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [badges, setBadges] = useState<{ quotes: number; leads: number }>({
    quotes: 0,
    leads: 0,
  });

  useEffect(() => {
    if (user?.seller_id) {
      loadBadges();
      const interval = setInterval(() => loadBadges(), 30000);
      return () => clearInterval(interval);
    }
  }, [user?.seller_id]);

  useEffect(() => {
    if (user?.seller_id && location.pathname.startsWith('/seller')) {
      loadBadges();
    }
  }, [location.pathname, user?.seller_id]);

  const loadBadges = async () => {
    if (!user?.seller_id) return;
    try {
      const stats = await sellersApi.getSellerDashboardStats(user.seller_id, '30');
      setBadges({
        quotes: stats.pending_quotes || 0,
        leads: stats.leads_to_contact || 0,
      });
    } catch (error) {
      console.error('Errore nel caricamento badge:', error);
    }
  };

  const tabs: TabItem[] = [
    { id: 'home', label: t('menu.dashboard'), icon: Home, path: '/seller', badge: null },
    { id: 'leads', label: t('menu.contatti'), icon: Users, path: '/seller/contatti', badge: badges.leads > 0 ? badges.leads : null },
    { id: 'sales', label: t('menu.preventivi'), icon: FileText, path: '/seller/preventivi', badge: badges.quotes > 0 ? badges.quotes : null },
    { id: 'more', label: t('menu.more'), icon: MoreHorizontal, path: '/seller/more', badge: null },
  ];

  const isActive = (path: string) => {
    if (path === '/seller') {
      return location.pathname === '/seller' || location.pathname === '/seller/';
    }
    if (path === '/seller/more') {
      if (isMoreOpen) return true;
      const moreRoutes = ['/seller/agenda', '/seller/listini', '/seller/clienti', '/seller/commissioni', '/seller/supporto', '/seller/impostazioni'];
      return moreRoutes.some(route => location.pathname.startsWith(route));
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="seller-mobile-nav-bar" aria-label="Navigazione principale">
      <div className="seller-mobile-nav-bar__row">
      <div className="seller-mobile-nav-bar__pill">
        <div className="seller-mobile-nav-bar__tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                type="button"
                className={`seller-mobile-nav-bar__tab ${active ? 'seller-mobile-nav-bar__tab--active' : ''}`}
                onClick={() => {
                  hapticButtonPress();
                  if (tab.id === 'more' && onMoreClick) {
                    onMoreClick();
                    return;
                  }
                  navigate(tab.path);
                }}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="seller-mobile-nav-bar__tab-pill" aria-hidden />
                <span className="seller-mobile-nav-bar__tab-content">
                  <span className="seller-mobile-nav-bar__tab-icon">
                    <Icon size={22} />
                    {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                      <span className="seller-mobile-nav-bar__badge">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                  </span>
                  <span className="seller-mobile-nav-bar__tab-label">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {onSearchClick && (
        <button
          type="button"
          className="seller-mobile-nav-bar__search-btn"
          onClick={() => {
            hapticButtonPress();
            onSearchClick();
          }}
          aria-label={t('menu.cerca', 'Cerca')}
        >
          <Search size={22} />
        </button>
      )}
      </div>
    </nav>
  );
};

export default SellerMobileNavBar;
