import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Circle,
    FolderKanban,
    Users,
    Receipt,
    Mail,
    Settings,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    UserCog,
    HelpCircle,
    GitBranch,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSidebarState } from '../../hooks/useSidebarState';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useSidebarState('sidebar-collapsed', false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Circle, label: 'Cocchi', path: '/cocchi' },
        { icon: FolderKanban, label: 'Progetti', path: '/progetti' },
        { icon: Users, label: 'Clienti', path: '/clienti' },
        { icon: ShoppingCart, label: 'Venditori', path: '/venditori' },
        { icon: Receipt, label: 'Spese', path: '/spese' },
        { icon: Mail, label: 'Segreteria', path: '/segreteria' },
        { icon: Wallet, label: 'Portfolio Azienda', path: '/portfolio-azienda' },
        { icon: GitBranch, label: 'Timeline', path: '/timeline' },
        { icon: HelpCircle, label: 'Gestione Supporto', path: '/gestione-supporto' },
        { icon: UserCog, label: 'Gestione Team e Utenti', path: '/gestione-utenti' },
        { icon: Settings, label: 'Impostazioni', path: '/impostazioni' },
    ];

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className={`sidebar glass-card ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-header">
                {!collapsed && (
                    <h1 className="sidebar-logo text-gradient">Back Club</h1>
                )}
                <button
                    className="collapse-button"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Profile Card */}
            <div className="sidebar-footer">
                <div className="user-profile-card">
                    <div className="user-avatar-sidebar">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.nome} />
                        ) : (
                            <span>{getInitials(user?.nome || 'U')}</span>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="user-info">
                            <div className="user-name-sidebar">{user?.nome}</div>
                            <div className="user-role-sidebar">
                                {user?.role === 'admin' && 'Amministratore'}
                                {user?.role === 'manager' && 'Manager'}
                                {user?.role === 'freelancer' && 'Freelancer'}
                                {user?.role === 'client' && 'Cliente'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
