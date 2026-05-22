import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Mail,
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  DollarSign,
  Wallet
} from 'lucide-react';
import { paymentPlansApi } from '../../api/paymentPlans';
import { useSidebarState } from '../../hooks/useSidebarState';
import './SegreteriaLayout.css';

const SegreteriaLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarState('segreteria-sidebar-collapsed', false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    // Carica il conteggio dei contratti in attesa
    const loadPendingCount = async () => {
      try {
        const response = await paymentPlansApi.getPending();
        // La risposta è già {success: true, data: Array}
        const count = response.data?.length || 0;
        setPendingCount(count);
      } catch (error) {
        console.error('Errore nel caricamento conteggio contratti in attesa:', error);
      }
    };
    loadPendingCount();
    // Ricarica ogni 30 secondi
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/segreteria/dashboard' 
    },
    { 
      id: 'contatti', 
      label: 'Anagrafica', 
      icon: Users, 
      path: '/segreteria/contatti' 
    },
    { 
      id: 'preventivi', 
      label: 'Preventivi', 
      icon: FileText, 
      path: '/segreteria/preventivi' 
    },
    { 
      id: 'contratti', 
      label: 'Contratti', 
      icon: Briefcase, 
      path: '/segreteria/contratti' 
    },
    { 
      id: 'fatture', 
      label: 'Fatture', 
      icon: Receipt, 
      path: '/segreteria/fatture' 
    },
    { 
      id: 'commissioni-venditori', 
      label: 'Commissioni Venditori', 
      icon: DollarSign, 
      path: '/segreteria/commissioni-venditori' 
    },
    { 
      id: 'piani-in-attesa', 
      label: 'Piani in Attesa', 
      icon: AlertCircle, 
      path: '/segreteria/piani-pagamento-in-attesa' 
    },
    { 
      id: 'spese', 
      label: 'Spese', 
      icon: Receipt, 
      path: '/segreteria/spese' 
    },
    { 
      id: 'email', 
      label: 'Comunicazioni', 
      icon: Mail, 
      path: '/segreteria/email' 
    },
    { 
      id: 'agenda', 
      label: 'Agenda', 
      icon: Calendar, 
      path: '/segreteria/agenda' 
    },
    { 
      id: 'portfolio-azienda', 
      label: 'Portfolio Azienda', 
      icon: Wallet, 
      path: '/portfolio-azienda' 
    },
  ];

  const isActive = (path: string) => {
    if (path === '/segreteria/dashboard') {
      return location.pathname === '/segreteria' || location.pathname === '/segreteria/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="segreteria-layout">
      <aside className={`segreteria-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="segreteria-sidebar-header">
          {!collapsed && (
            <>
              <h2>Segreteria</h2>
              <p>Gestionale completo</p>
            </>
          )}
          <button
            className="segreteria-collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            title={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        
        <nav className="segreteria-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`segreteria-nav-item ${active ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <div style={{ position: 'relative' }}>
                <Icon className="segreteria-nav-icon" size={20} />
                  {item.id === 'piani-in-attesa' && pendingCount > 0 && (
                    <span className="segreteria-nav-badge">{pendingCount}</span>
                  )}
                </div>
                {!collapsed && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.label}
                    {item.id === 'piani-in-attesa' && pendingCount > 0 && (
                      <span className="segreteria-nav-badge-inline">{pendingCount}</span>
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className={`segreteria-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default SegreteriaLayout;

