import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
    TrendingUp, Coins,
    ArrowUpRight, ArrowDownRight, AlertCircle,
    Settings
} from 'lucide-react';
import api from '../lib/axios';
import { motion } from 'framer-motion';

interface MasterData {
    overview: {
        total_projects: number;
        active_projects: number;
        total_tasks: number;
        completed_tasks: number;
        total_clients: number;
        active_clients: number;
        total_users: number;
        new_this_period: {
            projects: number;
            tasks: number;
            clients: number;
        };
    };
    financial: {
        entrate_periodo: number;
        uscite_periodo: number;
        saldo_periodo: number;
        budget_totale: number;
        speso_totale: number;
        disponibile: number;
    };
    projects: {
        by_status: Record<string, number>;
        by_priority: Record<string, number>;
        overdue: number;
    };
    crm_status: {
        total: number;
        active: number;
        list: any[];
    };
    recent_activity: any[];
    analytics: {
        stored: Record<string, any>;
        calculated: {
            tasks_completion_rate: number;
            projects_on_time: number;
            average_project_duration: number;
        };
    };
}

export default function Master() {
    const [data, setData] = useState<MasterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get(`/master/dashboard?period=${period}`);
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch master dashboard', error);
        } finally {
            setIsLoading(false);
        }
    };

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
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white mb-1">Master Dashboard</h1>
                    <p className="text-xs text-slate-500">Controllo completo sistema e sotto-CRM</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="day">Oggi</option>
                        <option value="week">Settimana</option>
                        <option value="month">Mese</option>
                        <option value="year">Anno</option>
                    </select>
                    <button className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-slate-500">Entrate</span>
                    </div>
                    <div className="text-xl font-semibold text-white mb-1">
                        {data?.financial.entrate_periodo.toFixed(2)} ₵
                    </div>
                    <div className="text-xs text-slate-500">Periodo selezionato</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                            <ArrowDownRight className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-slate-500">Uscite</span>
                    </div>
                    <div className="text-xl font-semibold text-white mb-1">
                        {data?.financial.uscite_periodo.toFixed(2)} ₵
                    </div>
                    <div className="text-xs text-slate-500">Periodo selezionato</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-slate-500">Saldo</span>
                    </div>
                    <div className={`text-xl font-semibold mb-1 ${
                        (data?.financial.saldo_periodo || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                        {data?.financial.saldo_periodo.toFixed(2)} ₵
                    </div>
                    <div className="text-xs text-slate-500">Periodo selezionato</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Coins className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-slate-500">Disponibile</span>
                    </div>
                    <div className="text-xl font-semibold text-white mb-1">
                        {data?.financial.disponibile.toFixed(2)} ₵
                    </div>
                    <div className="text-xs text-slate-500">
                        di {data?.financial.budget_totale.toFixed(2)} ₵
                    </div>
                </motion.div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Progetti', value: data?.overview.total_projects || 0, active: data?.overview.active_projects || 0, color: 'blue' },
                    { label: 'Task', value: data?.overview.total_tasks || 0, completed: data?.overview.completed_tasks || 0, color: 'emerald' },
                    { label: 'Clienti', value: data?.overview.total_clients || 0, active: data?.overview.active_clients || 0, color: 'purple' },
                    { label: 'Utenti', value: data?.overview.total_users || 0, color: 'orange' },
                ].map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                    >
                        <div className="text-xs text-slate-500 mb-2">{stat.label}</div>
                        <div className="text-lg font-semibold text-white mb-1">{stat.value}</div>
                        {stat.active !== undefined && (
                            <div className="text-xs text-slate-500">{stat.active} attivi</div>
                        )}
                        {stat.completed !== undefined && (
                            <div className="text-xs text-slate-500">{stat.completed} completate</div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* CRM Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-1">Sotto-CRM</h3>
                        <p className="text-xs text-slate-500">{data?.crm_status.active} attivi di {data?.crm_status.total}</p>
                    </div>
                    <button className="text-xs text-blue-400 hover:text-blue-300">+ Nuovo CRM</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data?.crm_status.list.slice(0, 6).map((crm) => (
                        <div key={crm.id} className="p-4 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-semibold text-white">{crm.name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                    crm.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-slate-500/20 text-slate-400'
                                }`}>
                                    {crm.status}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mb-3">{crm.client}</div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Budget</span>
                                    <span className="text-white font-medium">{crm.budget_cocchi.toFixed(2)} ₵</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Speso</span>
                                    <span className="text-white font-medium">{crm.spent_cocchi.toFixed(2)} ₵</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                                    <div
                                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${Math.min(crm.progress, 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-500 text-center mt-1">
                                    {crm.progress.toFixed(1)}% utilizzato
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Performance</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500">Completamento Task</span>
                                <span className="text-xs font-semibold text-white">
                                    {data?.analytics.calculated.tasks_completion_rate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data?.analytics.calculated.tasks_completion_rate || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500">Progetti in Tempo</span>
                                <span className="text-xs font-semibold text-white">
                                    {data?.analytics.calculated.projects_on_time.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data?.analytics.calculated.projects_on_time || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500">Durata Media Progetti</span>
                                <span className="text-xs font-semibold text-white">
                                    {data?.analytics.calculated.average_project_duration} giorni
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Attività Recenti</h3>
                    <div className="space-y-3">
                        {data?.recent_activity.slice(0, 8).map((activity, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-white mb-1">{activity.title}</div>
                                    <div className="text-xs text-slate-500">{activity.description}</div>
                                    <div className="text-xs text-slate-600 mt-1">{activity.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Projects Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Stato Progetti</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data?.projects.by_status || {}).map(([status, count]) => (
                        <div key={status} className="text-center">
                            <div className="text-2xl font-semibold text-white mb-1">{count}</div>
                            <div className="text-xs text-slate-500 capitalize">{status.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
                {data?.projects.overdue && data.projects.overdue > 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400">
                            {data.projects.overdue} progetti in ritardo
                        </span>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

