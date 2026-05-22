import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Package, 
  FileText, 
  Briefcase, 
  UserCircle,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSidebarState } from '../../hooks/useSidebarState';
import './VenditoriLayout.css';

const VenditoriLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarState('venditori-layout-sidebar-collapsed', false);

  const menuItems = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: TrendingUp, 
      path: '/venditori/overview' 
    },
    { 
      id: 'venditori', 
      label: 'Amministrazione Venditori', 
      icon: Users, 
      path: '/venditori/amministrazione-venditori' 
    },
    { 
      id: 'listini', 
      label: 'Configurazione Listini', 
      icon: Package, 
      path: '/venditori/configurazione-listini' 
    },
    { 
      id: 'preventivi', 
      label: 'Preventivi', 
      icon: FileText, 
      path: '/venditori/preventivi' 
    },
    { 
      id: 'contratti', 
      label: 'Contratti', 
      icon: Briefcase, 
      path: '/venditori/contratti' 
    },
    { 
      id: 'clienti', 
      label: 'Clienti', 
      icon: UserCircle, 
      path: '/venditori/clienti' 
    },
    { 
      id: 'progetti', 
      label: 'Progetti', 
      icon: Briefcase, 
      path: '/venditori/progetti' 
    },
    { 
      id: 'leads', 
      label: 'Contatti da Chiamare', 
      icon: Phone, 
      path: '/venditori/leads' 
    },
  ];

  const isActive = (path: string) => {
    if (path === '/venditori/overview') {
      return location.pathname === '/venditori' || location.pathname === '/venditori/overview';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="venditori-layout">
      <aside className={`venditori-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="venditori-sidebar-header">
          {!collapsed && (
            <>
              <h2>Venditori</h2>
              <p>Gestione vendite e contratti</p>
            </>
          )}
          <button
            className="venditori-collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        
        <nav className="venditori-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`venditori-nav-item ${active ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="venditori-nav-icon" size={20} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className={`venditori-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default VenditoriLayout;

