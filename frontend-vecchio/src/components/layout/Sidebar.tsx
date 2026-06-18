import { NavLink } from 'react-router-dom';
import { Layout, Users, Briefcase, CheckSquare, Settings, LogOut, Activity, Clock, BarChart3, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function Sidebar() {
    const { logout, user, canAccessMaster, canAccessSecreteria, hasAnyRole } = useAuth();

    const navItems = [
        { 
            icon: BarChart3, 
            label: 'Master', 
            path: '/master',
            roles: ['admin', 'project_master'],
            check: canAccessMaster
        },
        { 
            icon: FileText, 
            label: 'Segreteria', 
            path: '/segreteria',
            roles: ['segreteria', 'admin', 'project_master'],
            check: canAccessSecreteria
        },
        { icon: Layout, label: 'Dashboard', path: '/' },
        { icon: Briefcase, label: 'Progetti', path: '/projects' },
        { icon: CheckSquare, label: 'Task', path: '/tasks' },
        { 
            icon: Users, 
            label: 'Clienti', 
            path: '/clients',
            roles: ['admin', 'segreteria', 'project_manager', 'venditori', 'commercialista']
        },
        { 
            icon: Users, 
            label: 'Team', 
            path: '/users',
            roles: ['admin', 'segreteria', 'risorse_umane']
        },
        { 
            icon: Clock, 
            label: 'Richieste', 
            path: '/requests',
            roles: ['admin', 'freelance', 'dipendente', 'project_manager']
        },
        { icon: Settings, label: 'Impostazioni', path: '/settings' },
    ];

    return (
        <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Activity className="w-6 h-6" />
                </div>
                <Logo size="md" />
            </div>

            <nav className="flex-1 px-4 space-y-2 py-4">
                {navItems.map((item) => {
                    // Check role-based access
                    if (item.check) {
                        if (!item.check()) return null;
                    } else if (item.roles) {
                        if (!hasAnyRole(item.roles)) return null;
                    }

                    // Legacy filter logic for backward compatibility
                    if (user?.role === 'freelance' && !hasAnyRole(['admin', 'segreteria'])) {
                        if (['/clients', '/users'].includes(item.path)) return null;
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm',
                                    isActive
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                )
                            }
                        >
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={logout}
                    className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Esci</span>
                </button>
            </div>
        </aside>
    );
}
