import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { TrendingUp, Users, Package, FileText, Briefcase, UserCircle, Phone } from 'lucide-react';
import './VenditoriLayout.css';

const VenditoriLayout: React.FC = () => {
  const location = useLocation();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, path: '/venditori/overview' },
    { id: 'amministrazione', label: 'Amministrazione', icon: Users, path: '/venditori/amministrazione-venditori' },
    { id: 'listini', label: 'Listini', icon: Package, path: '/venditori/configurazione-listini' },
    { id: 'preventivi', label: 'Preventivi', icon: FileText, path: '/venditori/preventivi' },
    { id: 'contratti', label: 'Contratti', icon: Briefcase, path: '/venditori/contratti' },
    { id: 'clienti', label: 'Clienti', icon: UserCircle, path: '/venditori/clienti' },
    { id: 'progetti', label: 'Progetti', icon: Briefcase, path: '/venditori/progetti' },
    { id: 'leads', label: 'Contatti', icon: Phone, path: '/venditori/leads' },
  ];

  const isActive = (path: string) => {
    if (path === '/venditori/overview') {
      return location.pathname === '/venditori' || location.pathname === '/venditori/overview';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="venditori-layout">
      <div className="venditori-tab-bar">
        <div className="venditori-tab-bar-inner">
          <div className="venditori-section-title">
            <span>Venditori</span>
          </div>
          <nav className="venditori-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={`venditori-tab ${active ? 'active' : ''}`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="venditori-content">
        <Outlet />
      </div>
    </div>
  );
};

export default VenditoriLayout;
