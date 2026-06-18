import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Check, X, Clock, Calendar, AlertTriangle } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';


interface TaskRequestsProps {
    projectId?: string;
}

export default function TaskRequests({ projectId }: TaskRequestsProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'requests' | 'overdue'>('requests');
    const [requests, setRequests] = useState<any[]>([]);
    const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = projectId ? { params: { project_id: projectId } } : {};
            const [requestsRes, overdueRes] = await Promise.all([
                api.get('/reschedule-requests', params),
                api.get('/tasks/overdue', params)
            ]);
            setRequests(requestsRes.data);
            setOverdueTasks(overdueRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (requestId: number, status: 'approved' | 'rejected') => {
        try {
            await api.put(`/reschedule-requests/${requestId}`, { status });
            fetchData(); // Refresh list
        } catch (error) {
            console.error(`Failed to ${status} request`, error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium border border-green-500/20">Approvata</span>;
            case 'rejected':
                return <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium border border-red-500/20">Rifiutata</span>;
            default:
                return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-medium border border-yellow-500/20">In Attesa</span>;
        }
    };

    const content = (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard Task</h1>
                <p className="text-slate-400 mt-2">Gestisci le richieste e monitora i ritardi</p>
            </div>

            <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-1">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'requests' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Richieste Spostamento
                    {requests.length > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {requests.length}
                        </span>
                    )}
                    {activeTab === 'requests' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('overdue')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'overdue' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Task Scaduti
                    {overdueTasks.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {overdueTasks.length}
                        </span>
                    )}
                    {activeTab === 'overdue' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-400 rounded-t-full" />
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Caricamento...</div>
            ) : (
                <>
                    {activeTab === 'requests' && (
                        requests.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nessuna richiesta trovata</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {requests.map((request) => (
                                    <div key={request.id} className="glass-card p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                                                    {request.task?.project?.name || 'Progetto sconosciuto'}
                                                </span>
                                                <span className="text-slate-500 text-sm">•</span>
                                                <span className="text-slate-400 text-sm">Richiesto da {request.user?.name}</span>
                                                <span className="ml-2">{getStatusBadge(request.status)}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">{request.task?.title}</h3>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Attuale: <span className="text-white">{new Date(request.task?.due_date).toLocaleDateString()}</span>
                                                </span>
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 text-blue-400" />
                                                    Richiesta: <span className="text-blue-400 font-bold">{new Date(request.requested_date).toLocaleDateString()}</span>
                                                </span>
                                            </div>
                                            {request.reason && (
                                                <div className="mt-3 bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300 border border-slate-800/50">
                                                    "{request.reason}"
                                                </div>
                                            )}
                                        </div>

                                        {/* Show actions only if user is NOT the requester AND status is pending */}
                                        {user?.id !== request.user_id && request.status === 'pending' && (
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <Button
                                                    variant="danger"
                                                    onClick={() => handleAction(request.id, 'rejected')}
                                                    className="flex-1 md:flex-none"
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    Rifiuta
                                                </Button>
                                                <Button
                                                    onClick={() => handleAction(request.id, 'approved')}
                                                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20"
                                                >
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Approva
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'overdue' && (
                        overdueTasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                                <Check className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                                <p>Nessun task scaduto! Ottimo lavoro.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {overdueTasks.map((task) => (
                                    <div key={task.id} className="glass-card p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-red-500">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300">
                                                    {task.project?.name}
                                                </span>
                                                {task.assignees?.map((assignee: any) => (
                                                    <span key={assignee.id} className="text-slate-400 text-sm flex items-center gap-1">
                                                        • Assegnato a {assignee.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                                {task.title}
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                            </h3>
                                            <div className="text-sm text-red-400 font-medium">
                                                Scaduto il: {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Future: Add quick actions here like 'Contact' or 'Reschedule' */}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}
        </>
    );

    if (projectId) {
        return <div className="mt-6">{content}</div>;
    }

    return (
        <DashboardLayout>
            {content}
        </DashboardLayout>
    );
}

