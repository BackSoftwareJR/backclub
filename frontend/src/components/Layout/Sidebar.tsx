import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    ShoppingCart,
    Receipt,
    Mail,
    GitBranch,
    HelpCircle,
    UserCog,
    Settings,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSidebarState } from '../../hooks/useSidebarState';
import { getActiveRole, getRoleLabel } from '../../utils/userRoles';
import './Sidebar.css';

interface NavGroup {
    label?: string;
    items: {
        icon: React.ElementType;
        label: string;
        path: string;
    }[];
}

const navGroups: NavGroup[] = [
    {
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        ],
    },
    {
        label: 'BUSINESS',
        items: [
            { icon: FolderKanban, label: 'Progetti', path: '/progetti' },
            { icon: Users, label: 'Clienti', path: '/clienti' },
            { icon: ShoppingCart, label: 'Venditori', path: '/venditori' },
        ],
    },
    {
        label: 'FINANCE',
        items: [
            { icon: TrendingUp, label: 'Cocchi', path: '/cocchi' },
            { icon: Receipt, label: 'Spese', path: '/spese' },
            { icon: Wallet, label: 'Portfolio Azienda', path: '/portfolio-azienda' },
        ],
    },
    {
        label: 'OPS',
        items: [
            { icon: Mail, label: 'Segreteria', path: '/segreteria' },
            { icon: GitBranch, label: 'Timeline', path: '/timeline' },
        ],
    },
    {
        label: 'SUPPORT',
        items: [
            { icon: HelpCircle, label: 'Gestione Supporto', path: '/gestione-supporto' },
        ],
    },
    {
        label: 'ADMIN',
        items: [
            { icon: UserCog, label: 'Gestione Team e Utenti', path: '/gestione-utenti' },
            { icon: Settings, label: 'Impostazioni', path: '/impostazioni' },
        ],
    },
];

const Sidebar: React.FC = () => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useSidebarState('sidebar-collapsed', false);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo / Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo-mark">BC</div>
                {!collapsed && <span className="sidebar-logo-text">Back Club</span>}
                <button
                    className="collapse-button"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navGroups.map((group, idx) => (
                    <div key={idx} className="nav-group">
                        {group.label && (
                            <div className="nav-group-label">{group.label}</div>
                        )}
                        {group.items.map((item) => {
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
                                    <Icon size={16} />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* User Footer */}
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
                                {getRoleLabel(getActiveRole(user))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
