import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw, XCircle, Loader } from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import type { OrganicSkillRun, SkillDefinition } from '../../../api/organicWeb';
import SkillRunStatusBadge from './components/SkillRunStatusBadge';
import SkillStepTimeline from './components/SkillStepTimeline';
import './OrganicWeb.css';

const OrganicWebSkillRunDetail: React.FC = () => {
    const { runId } = useParams<{ runId: string }>();
    const navigate = useNavigate();
    const id = parseInt(runId ?? '0');

    const [run, setRun] = useState<OrganicSkillRun | null>(null);
    const [skillDef, setSkillDef] = useState<SkillDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const projectId = run?.organic_project_id;

    const loadRun = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await organicWebApi.getSkillRun(id);
            setRun(res.run);
            setSkillDef(res.skill_definition);
        } catch {
            setError('Errore nel caricamento della skill run.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadRun();
    }, [loadRun]);

    // Auto-refresh when run is active
    useEffect(() => {
        if (!run) return;
        if (run.status !== 'running' && run.status !== 'waiting_human') return;

        const interval = setInterval(loadRun, 5000);
        return () => clearInterval(interval);
    }, [run, loadRun]);

    const handleCancel = async () => {
        if (!run) return;
        setCancelling(true);
        try {
            await organicWebApi.cancelSkillRun(run.id);
            await loadRun();
        } catch {
            setError('Errore durante la cancellazione della run.');
        } finally {
            setCancelling(false);
        }
    };

    const canCancel = run && !['completed', 'failed', 'cancelled'].includes(run.status);

    const backUrl = projectId
        ? `/workspace/organic_web/project/${projectId}`
        : '/workspace/organic_web';

    if (loading) {
        return (
            <div className="ow-loading">
                <div className="ow-spinner" />
                Caricamento skill run…
            </div>
        );
    }

    if (error || !run) {
        return (
            <div className="ow-page">
                <button className="ow-back-btn" onClick={() => navigate(backUrl)}>
                    <ArrowLeft size={14} /> Torna al progetto
                </button>
                <div className="ow-error-row">
                    <AlertCircle size={13} /> {error ?? 'Skill run non trovata.'}
                </div>
            </div>
        );
    }

    const projectName = run.organicProject
        ? run.organicProject.website_url
        : `Progetto #${run.organic_project_id}`;

    const steps = run.steps ?? [];
    const isActive = run.status === 'running' || run.status === 'waiting_human';

    return (
        <div className="ow-page">
            <button className="ow-back-btn" onClick={() => navigate(backUrl)}>
                <ArrowLeft size={14} /> {projectName}
            </button>

            <div className="ow-page-header">
                <div className="ow-page-header-left">
                    <h1 className="ow-page-title">
                        {skillDef?.name ?? run.skill_id}
                    </h1>
                    <p className="ow-page-subtitle">
                        Run #{run.id} · {projectName}
                    </p>
                </div>
                <div className="ow-page-header-actions">
                    <SkillRunStatusBadge status={run.status} />

                    {isActive && (
                        <button
                            className="ow-btn ow-btn--ghost"
                            onClick={loadRun}
                            title="Aggiorna"
                        >
                            <RefreshCw size={13} className={isActive ? 'ws-spin' : ''} />
                        </button>
                    )}

                    {canCancel && (
                        <button
                            className="ow-btn ow-btn--danger"
                            onClick={handleCancel}
                            disabled={cancelling}
                        >
                            {cancelling
                                ? <><Loader size={13} className="ws-spin" /> Cancellazione…</>
                                : <><XCircle size={13} /> Cancella run</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* Run metadata */}
            <div className="ow-overview-section" style={{ marginBottom: 20 }}>
                <div className="ow-overview-kv">
                    <span className="ow-overview-k">Skill</span>
                    <span className="ow-overview-v">{run.skill_id}</span>
                    <span className="ow-overview-k">Avviata il</span>
                    <span className="ow-overview-v">
                        {run.started_at
                            ? new Date(run.started_at).toLocaleString('it-IT')
                            : run.created_at ? new Date(run.created_at).toLocaleString('it-IT') : '—'}
                    </span>
                    <span className="ow-overview-k">Completata il</span>
                    <span className="ow-overview-v">
                        {run.completed_at
                            ? new Date(run.completed_at).toLocaleString('it-IT')
                            : '—'}
                    </span>
                    {run.error_message && (
                        <>
                            <span className="ow-overview-k">Errore</span>
                            <span className="ow-overview-v" style={{ color: 'var(--ws-red)' }}>
                                {run.error_message}
                            </span>
                        </>
                    )}
                    <span className="ow-overview-k">Step corrente</span>
                    <span className="ow-overview-v">{run.current_step_index + 1} / {steps.length}</span>
                </div>
            </div>

            {error && (
                <div className="ow-error-row" style={{ marginBottom: 16 }}>
                    <AlertCircle size={13} /> {error}
                </div>
            )}

            {/* Timeline */}
            <div className="ow-overview-section" style={{ padding: '16px 18px' }}>
                <h4 className="ow-overview-section-title" style={{ marginBottom: 16 }}>
                    Step esecuzione
                </h4>
                <SkillStepTimeline
                    steps={steps}
                    currentStepIndex={run.current_step_index}
                    onHumanTaskCompleted={loadRun}
                />
            </div>
        </div>
    );
};

export default OrganicWebSkillRunDetail;
