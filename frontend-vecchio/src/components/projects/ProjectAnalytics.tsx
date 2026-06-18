import { BarChart3, Clock, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';

interface Task {
    id: number;
    status: string;
    estimated_hours?: number;
    actual_hours?: number;
}

interface ProjectAnalyticsProps {
    project: any;
    tasks: Task[];
}

export function ProjectAnalytics({ project, tasks }: ProjectAnalyticsProps) {
    // Calculate stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalEstimatedHours = tasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0);
    const totalActualHours = tasks.reduce((acc, t) => acc + (Number(t.actual_hours) || 0), 0);

    // Budget calculation (assuming budget is total, and we can estimate spend based on hours * rate, 
    // but we don't have rates yet. So just show budget vs nothing or just budget)
    // For now let's just show Budget and Hours.

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-white">{progress}%</span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Progresso Totale</h3>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-white">{completedTasks}/{totalTasks}</span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Task Completati</h3>
                </div>

                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-white">{totalActualHours}h</span>
                            <span className="text-xs text-slate-500 block">di {totalEstimatedHours}h stimate</span>
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Ore Tracciate</h3>
                </div>

                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-white">
                            {project.budget ? `€${Number(project.budget).toLocaleString()}` : '-'}
                        </span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Budget Totale</h3>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Distribuzione Stato Task</h3>
                    <div className="space-y-4">
                        {['pending', 'in_progress', 'review', 'completed'].map(status => {
                            const count = tasks.filter(t => t.status === status).length;
                            const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                            return (
                                <div key={status}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-400 capitalize">{status.replace('_', ' ')}</span>
                                        <span className="text-white font-medium">{count} ({Math.round(percentage)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${status === 'completed' ? 'bg-green-500' :
                                                status === 'in_progress' ? 'bg-blue-500' :
                                                    status === 'review' ? 'bg-purple-500' : 'bg-slate-600'
                                                }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Salute del Progetto</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-1" />
                            <div>
                                <h4 className="text-white font-medium">Stato Budget</h4>
                                <p className="text-sm text-slate-400 mt-1">
                                    {project.budget
                                        ? "Budget impostato. Monitora le ore per garantire la redditività."
                                        : "Nessun budget definito per questo progetto."}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Clock className="w-5 h-5 text-purple-400 mt-1" />
                            <div>
                                <h4 className="text-white font-medium">Tempistiche</h4>
                                <p className="text-sm text-slate-400 mt-1">
                                    Progetto iniziato il {new Date(project.start_date).toLocaleDateString()}.
                                    {project.end_date
                                        ? ` Scadenza il ${new Date(project.end_date).toLocaleDateString()}.`
                                        : " Nessuna scadenza impostata."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
