import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Calendar, MoreHorizontal, Search } from 'lucide-react';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import './FreelanceMobileNavBar.css';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
}

interface FreelanceMobileNavBarProps {
  /** Se fornito, al tap su "Altro" si apre il menu senza navigare (mantiene scroll e pagina) */
  onMoreClick?: () => void;
  /** Quando true, la tab Altro viene mostrata come attiva (menu aperto) */
  isMoreOpen?: boolean;
  /** Tap sull'icona ricerca: apre la barra di ricerca (stile App Store) */
  onSearchClick?: () => void;
}

const FreelanceMobileNavBar: React.FC<FreelanceMobileNavBarProps> = ({ onMoreClick, isMoreOpen, onSearchClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: TabItem[] = [
    { id: 'home', label: 'Dashboard', icon: Home, path: '/freelance' },
    { id: 'task', label: 'Task', icon: CheckSquare, path: '/freelance/task' },
    { id: 'calendario', label: 'Calendario', icon: Calendar, path: '/freelance/calendario' },
    { id: 'more', label: 'Altro', icon: MoreHorizontal, path: '/freelance/more' },
  ];

  const isActive = (path: string) => {
    if (path === '/freelance') {
      return location.pathname === '/freelance' || location.pathname === '/freelance/';
    }
    if (path === '/freelance/more') {
      if (isMoreOpen) return true;
      const moreRoutes = ['/freelance/progetti', '/freelance/richieste', '/freelance/chat', '/freelance/supporto', '/freelance/notifiche', '/freelance/crm'];
      return moreRoutes.some(route => location.pathname.startsWith(route));
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="freelance-mobile-nav-bar" aria-label="Navigazione principale">
      <div className="freelance-mobile-nav-bar__row">
      <div className="freelance-mobile-nav-bar__pill">
        <div className="freelance-mobile-nav-bar__tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                type="button"
                className={`freelance-mobile-nav-bar__tab ${active ? 'freelance-mobile-nav-bar__tab--active' : ''}`}
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
                <span className="freelance-mobile-nav-bar__tab-pill" aria-hidden />
                <span className="freelance-mobile-nav-bar__tab-content">
                  <span className="freelance-mobile-nav-bar__tab-icon">
                    <Icon size={22} />
                  </span>
                  <span className="freelance-mobile-nav-bar__tab-label">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {onSearchClick && (
        <button
          type="button"
          className="freelance-mobile-nav-bar__search-btn"
          onClick={() => {
            hapticButtonPress();
            onSearchClick();
          }}
          aria-label="Cerca"
        >
          <Search size={22} />
        </button>
      )}
      </div>
    </nav>
  );
};

export default FreelanceMobileNavBar;
