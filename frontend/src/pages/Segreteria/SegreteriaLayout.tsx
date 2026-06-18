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
  AlertCircle,
  DollarSign,
  Wallet
} from 'lucide-react';
import { paymentPlansApi } from '../../api/paymentPlans';
import './SegreteriaLayout.css';

const SegreteriaLayout: React.FC = () => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const response = await paymentPlansApi.getPending();
        const count = response.data?.length || 0;
        setPendingCount(count);
      } catch (error) {
        console.error('Errore nel caricamento conteggio contratti in attesa:', error);
      }
    };
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/segreteria/dashboard' },
    { id: 'contatti', label: 'Anagrafica', icon: Users, path: '/segreteria/contatti' },
    { id: 'preventivi', label: 'Preventivi', icon: FileText, path: '/segreteria/preventivi' },
    { id: 'contratti', label: 'Contratti', icon: Briefcase, path: '/segreteria/contratti' },
    { id: 'fatture', label: 'Fatture', icon: Receipt, path: '/segreteria/fatture' },
    { id: 'commissioni-venditori', label: 'Commissioni', icon: DollarSign, path: '/segreteria/commissioni-venditori' },
    { id: 'piani-in-attesa', label: 'Piani in Attesa', icon: AlertCircle, path: '/segreteria/piani-pagamento-in-attesa' },
    { id: 'spese', label: 'Spese', icon: Receipt, path: '/segreteria/spese' },
    { id: 'email', label: 'Comunicazioni', icon: Mail, path: '/segreteria/email' },
    { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/segreteria/agenda' },
    { id: 'portfolio-azienda', label: 'Portfolio', icon: Wallet, path: '/portfolio-azienda' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === 'dashboard') {
      return location.pathname === '/segreteria' || location.pathname === '/segreteria/dashboard';
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="segreteria-layout">
      <div className="segreteria-tab-bar">
        <div className="segreteria-tab-bar-inner">
          <div className="segreteria-section-title"><span>Segreteria</span></div>
          <nav className="segreteria-tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = isActive(tab);
              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={`segreteria-tab ${active ? 'active' : ''}`}
                >
                  <Icon size={13} />
                  {tab.label}
                  {tab.id === 'piani-in-attesa' && pendingCount > 0 && (
                    <span className="segreteria-tab-badge">{pendingCount}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="segreteria-content">
        <Outlet />
      </div>
    </div>
  );
};

export default SegreteriaLayout;
