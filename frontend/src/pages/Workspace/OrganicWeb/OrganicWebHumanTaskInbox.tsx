import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import type { OrganicHumanTask, OrganicWebProject } from '../../../api/organicWeb';
import HumanTaskCard from './components/HumanTaskCard';
import './OrganicWeb.css';

type FilterPriority = 'all' | 'urgent' | 'high';

const OrganicWebHumanTaskInbox: React.FC = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<OrganicHumanTask[]>([]);
    const [projects, setProjects] = useState<OrganicWebProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterProject, setFilterProject] = useState<number | 'all'>('all');
    const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
    const [filterOverdue, setFilterOverdue] = useState(false);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tasksRes, projectsRes] = await Promise.all([
                organicWebApi.getAllHumanTasks(),
                organicWebApi.getProjects(),
            ]);
            setTasks(tasksRes.tasks);
            setProjects(projectsRes.data);
        } catch {
            setError('Errore nel caricamento dei task.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

    const filteredTasks = pendingTasks
        .filter(t => filterProject === 'all' || t.organic_project_id === filterProject)
        .filter(t => {
            if (filterPriority === 'all') return true;
            return t.priority === filterPriority;
        })
        .filter(t => {
            if (!filterOverdue) return true;
            return t.due_at && new Date(t.due_at) < new Date();
        })
        .sort((a, b) => {
            const aOverdue = a.due_at && new Date(a.due_at) < new Date() ? 0 : 1;
            const bOverdue = b.due_at && new Date(b.due_at) < new Date() ? 0 : 1;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;

            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
            const pa = priorityOrder[a.priority] ?? 2;
            const pb = priorityOrder[b.priority] ?? 2;
            if (pa !== pb) return pa - pb;

            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

    const overdueCount = pendingTasks.filter(t => t.due_at && new Date(t.due_at) < new Date()).length;

    if (loading) {
        return (
            <div className="ow-loading">
                <div className="ow-spinner" />
                Caricamento inbox…
            </div>
        );
    }

    return (
        <div className="ow-page">
            <button className="ow-back-btn" onClick={() => navigate('/workspace/organic_web')}>
                <ArrowLeft size={14} /> Organic Web
            </button>

            <div className="ow-page-header">
                <div className="ow-page-header-left">
                    <h1 className="ow-page-title">
                        Inbox — Azioni richieste
                        {pendingTasks.length > 0 && (
                            <span className="ow-tab-badge" style={{ marginLeft: 10, fontSize: 14 }}>
                                {pendingTasks.length}
                            </span>
                        )}
                    </h1>
                    <p className="ow-page-subtitle">
                        Task umani in attesa di completamento
                        {overdueCount > 0 && (
                            <span style={{ color: 'var(--ws-red)', marginLeft: 8 }}>
                                · {overdueCount} scaduti
                            </span>
                        )}
                    </p>
                </div>
                <div className="ow-page-header-actions">
                    <button className="ow-btn ow-btn--secondary" onClick={loadTasks} title="Aggiorna">
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="ow-error-row" style={{ marginBottom: 16 }}>
                    <AlertCircle size={13} /> {error}
                </div>
            )}

            <div className="ow-filters">
                <select
                    className="ow-filter-select"
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                >
                    <option value="all">Tutti i progetti</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.crmProject?.name ?? `Progetto #${p.id}`}
                        </option>
                    ))}
                </select>

                <select
                    className="ow-filter-select"
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value as FilterPriority)}
                >
                    <option value="all">Tutte le priorità</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta priorità</option>
                </select>

                <button
                    className={`ow-filter-btn ${filterOverdue ? 'ow-filter-btn--active' : ''}`}
                    onClick={() => setFilterOverdue(v => !v)}
                >
                    Solo scaduti {overdueCount > 0 && `(${overdueCount})`}
                </button>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="ow-empty">
                    <Inbox size={48} className="ow-empty-icon" />
                    <h2 className="ow-empty-title">Nessun task in attesa</h2>
                    <p className="ow-empty-text">
                        {pendingTasks.length > 0
                            ? 'Nessun task corrisponde ai filtri selezionati.'
                            : 'Ottimo lavoro! Nessuna azione richiesta al momento.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredTasks.map(task => (
                        <HumanTaskCard
                            key={task.id}
                            task={task}
                            showProject
                            onCompleted={() => loadTasks()}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrganicWebHumanTaskInbox;
