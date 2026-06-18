import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { CheckCircle2, Circle, Clock, Calendar, Activity } from 'lucide-react';
import api from '../lib/axios';

interface DashboardStats {
    pending: number;
    in_progress: number;
    completed: number;
    reschedule_requested: number;
}

interface RecentActivity {
    id: string;
    title: string;
    time: string;
    type: string;
    project: string;
    status_label: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            setStats(response.data.stats);
            setRecentActivity(response.data.recent_activity);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        {
            label: 'In Attesa',
            value: stats?.pending || 0,
            change: 'Da iniziare',
            icon: Circle,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
        },
        {
            label: 'Presa in Carico',
            value: stats?.in_progress || 0,
            change: 'In lavorazione',
            icon: Clock,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
        },
        {
            label: 'Completate',
            value: stats?.completed || 0,
            change: 'Terminate',
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
        },
        {
            label: 'Richieste Spostamento',
            value: stats?.reschedule_requested || 0,
            change: 'In revisione',
            icon: Calendar,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
        },
    ];

    return (
        <DashboardLayout>
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Ciao, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name}</span>
                </h1>
                <p className="text-slate-400">
                    Ecco la situazione delle tue task oggi.
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Caricamento dati...</div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {statCards.map((stat, index) => (
                            <div
                                key={index}
                                className="glass-card p-6 rounded-2xl hover:bg-slate-800/50 transition-all duration-300 group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} border ${stat.border}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                                        {stat.change}
                                    </span>
                                </div>
                                <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Dashboard Calendar */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            Calendario Attività
                        </h3>
                        <DashboardCalendar />
                    </div>

                    {/* Recent Activity */}
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-400" />
                            Attività Recenti
                        </h3>
                        <div className="space-y-6">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-4">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
                                        <div>
                                            <p className="text-sm text-slate-200 font-medium">{activity.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">{activity.project}</span>
                                                <span className="text-slate-700">•</span>
                                                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{activity.status_label}</span>
                                                <span className="text-slate-700">•</span>
                                                <span className="text-xs text-slate-500">{activity.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">Nessuna attività recente.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}
