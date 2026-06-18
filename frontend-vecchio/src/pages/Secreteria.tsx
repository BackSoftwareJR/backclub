import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { 
    Briefcase, Users, FileText, Receipt, Coins, 
    Mail, Plus, AlertCircle,
    ArrowRight, Search, Filter, Calendar, TrendingUp
} from 'lucide-react';
import api from '../lib/axios';
import { motion } from 'framer-motion';
import { InvoiceList } from '../components/segreteria/invoices/InvoiceList';
import { InvoiceCalendar } from '../components/segreteria/invoices/InvoiceCalendar';
import { CocchiReservoirs } from '../components/segreteria/cocchi/CocchiReservoirs';
import { EmailComposer } from '../components/segreteria/email/EmailComposer';
import { DocumentManager } from '../components/segreteria/documents/DocumentManager';

interface DashboardData {
    overview: {
        total_projects: number;
        active_projects: number;
        total_clients: number;
        total_users: number;
        pending_invoices: number;
        overdue_invoices: number;
    };
    projects_summary: {
        total: number;
        recent: any[];
    };
    clients_summary: {
        total: number;
        list: any[];
    };
    users_summary: {
        total: number;
        list: any[];
    };
    recent_invoices: any[];
    pending_tasks: any[];
    upcoming_events: any[];
}

export default function Secreteria() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'invoices' | 'calendar' | 'cocchi' | 'payments' | 'documents' | 'projects' | 'clients' | 'users'>('overview');
    const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/segreteria/dashboard');
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        {
            label: 'Progetti Attivi',
            value: data?.overview.active_projects || 0,
            total: data?.overview.total_projects || 0,
            icon: Briefcase,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
        },
        {
            label: 'Clienti',
            value: data?.overview.total_clients || 0,
            icon: Users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
        },
        {
            label: 'Dipendenti/Freelance',
            value: data?.overview.total_users || 0,
            icon: Users,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
        },
        {
            label: 'Fatture in Sospeso',
            value: data?.overview.pending_invoices || 0,
            overdue: data?.overview.overdue_invoices || 0,
            icon: Receipt,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
        },
    ];

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-slate-500 text-sm">Caricamento...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white mb-1">Segreteria</h1>
                <p className="text-xs text-slate-500">Gestione completa progetti, clienti e documenti</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            {stat.total && (
                                <span className="text-xs text-slate-500">di {stat.total}</span>
                            )}
                        </div>
                        <div className="text-xl font-semibold text-white mb-1">{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                        {stat.overdue && stat.overdue > 0 && (
                            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {stat.overdue} scadute
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { icon: Mail, label: 'Invia Email', color: 'text-blue-400', bg: 'bg-blue-500/10', action: () => setIsEmailComposerOpen(true) },
                    { icon: Plus, label: 'Nuova Fattura', color: 'text-emerald-400', bg: 'bg-emerald-500/10', action: () => setActiveSection('invoices') },
                    { icon: Coins, label: 'Assegna Cocchi', color: 'text-purple-400', bg: 'bg-purple-500/10', action: () => setActiveSection('cocchi') },
                    { icon: FileText, label: 'Documenti', color: 'text-orange-400', bg: 'bg-orange-500/10', action: () => setActiveSection('documents') },
                ].map((action, index) => (
                    <motion.button
                        key={index}
                        onClick={action.action}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className={`${action.bg} border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all text-left group`}
                    >
                        <action.icon className={`w-5 h-5 ${action.color} mb-2`} />
                        <div className="text-xs font-medium text-white">{action.label}</div>
                    </motion.button>
                ))}
            </div>

            {/* Sections Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Panoramica', icon: Briefcase },
                    { id: 'invoices', label: 'Fatture', icon: Receipt },
                    { id: 'calendar', label: 'Calendario Fatture', icon: Calendar },
                    { id: 'cocchi', label: 'Serbatoi Cocchi', icon: Coins },
                    { id: 'payments', label: 'Pagamenti', icon: TrendingUp },
                    { id: 'documents', label: 'Documenti', icon: FileText },
                    { id: 'projects', label: 'Progetti', icon: Briefcase },
                    { id: 'clients', label: 'Clienti', icon: Users },
                    { id: 'users', label: 'Utenti', icon: Users },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                            activeSection === tab.id
                                ? 'text-blue-400 border-blue-400'
                                : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Email Composer */}
            <EmailComposer
                isOpen={isEmailComposerOpen}
                onClose={() => setIsEmailComposerOpen(false)}
                onSuccess={() => {
                    setIsEmailComposerOpen(false);
                    fetchDashboardData();
                }}
            />

            {/* Content Sections */}
            <div className="space-y-6">
                {activeSection === 'invoices' && (
                    <InvoiceList />
                )}

                {activeSection === 'calendar' && (
                    <InvoiceCalendar />
                )}

                {activeSection === 'cocchi' && (
                    <CocchiReservoirs />
                )}

                {activeSection === 'documents' && (
                    <DocumentManager />
                )}

                {activeSection === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Invoices */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Fatture Recenti</h3>
                                <button className="text-xs text-blue-400 hover:text-blue-300">Vedi tutte</button>
                            </div>
                            <div className="space-y-3">
                                {data?.recent_invoices.slice(0, 5).map((invoice) => (
                                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                        <div>
                                            <div className="text-xs font-medium text-white">{invoice.invoice_number}</div>
                                            <div className="text-xs text-slate-500">{invoice.client}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-semibold text-white">{invoice.total_cocchi.toFixed(2)} ₵</div>
                                            <div className={`text-xs ${
                                                invoice.status === 'paid' ? 'text-emerald-400' :
                                                invoice.status === 'overdue' ? 'text-red-400' :
                                                'text-slate-500'
                                            }`}>
                                                {invoice.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pending Tasks */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Task in Sospeso</h3>
                                <button className="text-xs text-blue-400 hover:text-blue-300">Vedi tutte</button>
                            </div>
                            <div className="space-y-3">
                                {data?.pending_tasks.slice(0, 5).map((task) => (
                                    <div key={task.id} className="p-3 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="text-xs font-medium text-white">{task.title}</div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                                task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500">{task.project}</div>
                                        {task.due_date && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Scadenza: {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Eventi Imminenti</h3>
                                <button className="text-xs text-blue-400 hover:text-blue-300">Vedi calendario</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {data?.upcoming_events.slice(0, 4).map((event) => (
                                    <div key={event.id} className="p-3 bg-slate-800/50 rounded-lg">
                                        <div className="text-xs font-medium text-white mb-1">{event.title}</div>
                                        <div className="text-xs text-slate-500">{event.project}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {new Date(event.start_date).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'projects' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Tutti i Progetti</h3>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Cerca..."
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 pl-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {data?.projects_summary.recent.map((project) => (
                                <div key={project.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors group">
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-white mb-1">{project.name}</div>
                                        <div className="text-xs text-slate-500">{project.client} • {project.manager}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-xs font-semibold text-white">{project.budget_cocchi.toFixed(2)} ₵</div>
                                            <div className="text-xs text-slate-500">Budget</div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            project.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                            project.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                            {project.status}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'clients' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Tutti i Clienti</h3>
                            <button className="text-xs text-blue-400 hover:text-blue-300">+ Nuovo Cliente</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data?.clients_summary.list.map((client) => (
                                <div key={client.id} className="p-4 bg-slate-800/50 rounded-lg">
                                    <div className="text-xs font-semibold text-white mb-2">{client.company_name}</div>
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <div>{client.email}</div>
                                        <div>{client.phone}</div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                                            <span>{client.projects_count} progetti</span>
                                            <span className="text-emerald-400 font-medium">{client.total_invoiced.toFixed(2)} ₵</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'users' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Dipendenti e Freelance</h3>
                            <button className="text-xs text-blue-400 hover:text-blue-300">+ Nuovo Utente</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data?.users_summary.list.map((user) => (
                                <div key={user.id} className="p-4 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-semibold text-white">{user.name}</div>
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <div>{user.email}</div>
                                        <div>{user.phone}</div>
                                        {user.department && <div>{user.department}</div>}
                                        <div className="mt-2 pt-2 border-t border-slate-700">
                                            <span className="text-white">{user.tasks_count}</span> task assegnate
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

