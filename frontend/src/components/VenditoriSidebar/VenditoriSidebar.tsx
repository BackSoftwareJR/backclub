import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import './VenditoriSidebar.css';

const VenditoriSidebar: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarState('venditori-sidebar-collapsed', false);

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
    // Check if current path matches or is a detail page related to this section
    if (path === '/venditori/contratti' && location.pathname.startsWith('/venditori/contratti')) {
      return true;
    }
    if (path === '/venditori/clienti' && location.pathname.startsWith('/venditori/clienti')) {
      return true;
    }
    if (path === '/venditori/progetti' && (location.pathname.startsWith('/venditori/progetti') || location.pathname.startsWith('/gestione-progetti') || location.pathname.startsWith('/progetti-in-attesa'))) {
      return true;
    }
    if (path === '/venditori/preventivi' && location.pathname.startsWith('/venditori/preventivi')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  // Show sidebar for vendor-related routes that use MainLayout
  // NOT for routes that use VenditoriLayout (all /venditori/* routes)
  const shouldShow = 
    location.pathname.startsWith('/gestione-progetti') ||
    location.pathname.startsWith('/progetti-in-attesa') ||
    (location.pathname.startsWith('/clienti/') && location.pathname.includes('/gestisci'));

  // Add/remove class to body for layout adjustments
  useEffect(() => {
    const mainLayout = document.querySelector('.main-layout');
    if (shouldShow) {
      mainLayout?.classList.add('has-venditori-sidebar');
      if (collapsed) {
        mainLayout?.classList.add('venditori-sidebar-collapsed');
      } else {
        mainLayout?.classList.remove('venditori-sidebar-collapsed');
      }
    } else {
      mainLayout?.classList.remove('has-venditori-sidebar', 'venditori-sidebar-collapsed');
    }
    
    return () => {
      mainLayout?.classList.remove('has-venditori-sidebar', 'venditori-sidebar-collapsed');
    };
  }, [shouldShow, collapsed]);

  if (!shouldShow) {
    return null;
  }

  return (
    <aside className={`venditori-sidebar-standalone ${collapsed ? 'collapsed' : ''}`}>
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
  );
};

export default VenditoriSidebar;

