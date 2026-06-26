import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Globe, Loader, AlertCircle, X, CheckCircle } from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import type { OrganicWebProject, OrganicStats, SkillStatus, CreateProjectData, CrmProjectOption } from '../../../api/organicWeb';
import OrganicProjectCard from './components/OrganicProjectCard';
import './OrganicWeb.css';

interface SkillStatusMap {
    [projectId: number]: SkillStatus[];
}

const OrganicWebDashboard: React.FC = () => {
    const [projects, setProjects] = useState<OrganicWebProject[]>([]);
    const [skillStatusMap, setSkillStatusMap] = useState<SkillStatusMap>({});
    const [stats, setStats] = useState<OrganicStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projectsRes, statsRes] = await Promise.all([
                organicWebApi.getProjects(),
                organicWebApi.getStats(),
            ]);

            setProjects(projectsRes.data);
            setStats(statsRes);

            const statusResults = await Promise.allSettled(
                projectsRes.data.map(p => organicWebApi.getProject(p.id))
            );
            const map: SkillStatusMap = {};
            statusResults.forEach((r, idx) => {
                if (r.status === 'fulfilled') {
                    map[projectsRes.data[idx].id] = r.value.skill_status;
                }
            });
            setSkillStatusMap(map);
        } catch {
            setError('Errore nel caricamento dei progetti.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gsc_connected') === 'true') {
            showToast('success', 'Account Google Search Console collegato con successo!');
            params.delete('gsc_connected');
            params.delete('project_id');
            const newSearch = params.toString();
            window.history.replaceState(
                null,
                '',
                window.location.pathname + (newSearch ? `?${newSearch}` : '')
            );
        }
    }, [showToast]);

    if (loading) {
        return (
            <div className="ow-loading">
                <div className="ow-spinner" />
                Caricamento Organic Web…
            </div>
        );
    }

    return (
        <div className="ow-page">
            <div className="ow-page-header">
                <div className="ow-page-header-left">
                    <h1 className="ow-page-title">Organic Web</h1>
                    <p className="ow-page-subtitle">SEO e contenuti organici per i tuoi clienti</p>
                </div>
                <div className="ow-page-header-actions">
                    <button className="ow-btn ow-btn--primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={14} /> Aggiungi progetto
                    </button>
                </div>
            </div>

            {error && (
                <div className="ow-error-row" style={{ marginBottom: 20 }}>
                    <AlertCircle size={13} /> {error}
                </div>
            )}

            <div className="ow-stats-row">
                <div className="ow-stat-card">
                    <span className="ow-stat-card-label">Progetti attivi</span>
                    <span className="ow-stat-card-value ow-stat-card-value--accent">
                        {stats?.active_projects ?? projects.filter(p => p.is_active).length}
                    </span>
                </div>
                <div className="ow-stat-card">
                    <span className="ow-stat-card-label">Task in attesa</span>
                    <span className={`ow-stat-card-value ${(stats?.pending_human_tasks ?? 0) > 0 ? 'ow-stat-card-value--warning' : ''}`}>
                        {stats?.pending_human_tasks ?? 0}
                    </span>
                </div>
                <div className="ow-stat-card">
                    <span className="ow-stat-card-label">Skill in esecuzione</span>
                    <span className={`ow-stat-card-value ${(stats?.running_skill_runs ?? 0) > 0 ? 'ow-stat-card-value--running' : ''}`}>
                        {stats?.running_skill_runs ?? 0}
                    </span>
                </div>
                <div className="ow-stat-card">
                    <span className="ow-stat-card-label">Progetti totali</span>
                    <span className="ow-stat-card-value">{projects.length}</span>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="ow-empty">
                    <Globe size={48} className="ow-empty-icon" />
                    <h2 className="ow-empty-title">Nessun progetto Organic Web</h2>
                    <p className="ow-empty-text">
                        Collega il primo sito cliente per iniziare ad automatizzare SEO e contenuti.
                    </p>
                    <button className="ow-btn ow-btn--primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={14} /> Collega primo progetto
                    </button>
                </div>
            ) : (
                <div className="ow-projects-grid">
                    {projects.map(project => (
                        <OrganicProjectCard
                            key={project.id}
                            project={project}
                            skillStatus={skillStatusMap[project.id]}
                        />
                    ))}
                </div>
            )}

            {showAddModal && (
                <AddProjectModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={() => {
                        setShowAddModal(false);
                        loadData();
                    }}
                />
            )}

            {toast && (
                <div className={`ow-toast ow-toast--${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

// ─── Add Project Modal ───────────────────────────────────────────────────────

interface AddProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ onClose, onCreated }) => {
    const [form, setForm] = useState<Partial<CreateProjectData>>({
        crm_project_id: undefined,
        website_url: '',
        blog_platform: 'wordpress',
        language: 'it',
        is_active: true,
    });
    const [crmProjects, setCrmProjects] = useState<CrmProjectOption[]>([]);
    const [loadingCrm, setLoadingCrm] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        organicWebApi.getAvailableCrmProjects()
            .then(res => setCrmProjects(res.projects))
            .catch(() => setCrmProjects([]))
            .finally(() => setLoadingCrm(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.crm_project_id || !form.website_url || !form.blog_platform) {
            setError('Compila tutti i campi obbligatori.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await organicWebApi.createProject(form as CreateProjectData);
            onCreated();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr?.response?.data?.message ?? 'Errore durante la creazione del progetto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ow-modal-overlay" onClick={onClose}>
            <div className="ow-modal" onClick={e => e.stopPropagation()}>
                <div className="ow-modal-header">
                    <h2 className="ow-modal-title">Aggiungi progetto Organic Web</h2>
                    <button className="ow-modal-close" onClick={onClose}><X size={14} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="ow-modal-body">
                        <div className="ow-form-group">
                            <label className="ow-label">Progetto CRM *</label>
                            {loadingCrm ? (
                                <div className="ow-input" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ow-text-muted)' }}>
                                    <Loader size={12} className="ws-spin" /> Caricamento progetti…
                                </div>
                            ) : (
                                <select
                                    className="ow-select"
                                    value={form.crm_project_id ?? ''}
                                    onChange={e => setForm(p => ({ ...p, crm_project_id: parseInt(e.target.value) || undefined }))}
                                    required
                                >
                                    <option value="">— Seleziona progetto CRM —</option>
                                    {crmProjects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.client_name ? `${p.client_name} — ` : ''}{p.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="ow-form-group">
                            <label className="ow-label">URL sito *</label>
                            <input
                                type="url"
                                className="ow-input"
                                placeholder="https://miosito.it"
                                value={form.website_url ?? ''}
                                onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="ow-form-row">
                            <div className="ow-form-group">
                                <label className="ow-label">Piattaforma blog *</label>
                                <select
                                    className="ow-select"
                                    value={form.blog_platform}
                                    onChange={e => setForm(p => ({ ...p, blog_platform: e.target.value as CreateProjectData['blog_platform'] }))}
                                >
                                    <option value="wordpress">WordPress</option>
                                    <option value="webflow">Webflow</option>
                                    <option value="custom">Custom</option>
                                    <option value="other">Altro</option>
                                </select>
                            </div>
                            <div className="ow-form-group">
                                <label className="ow-label">Lingua</label>
                                <input
                                    type="text"
                                    className="ow-input"
                                    placeholder="it"
                                    value={form.language ?? ''}
                                    onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                                    maxLength={5}
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="ow-error-row">
                                <AlertCircle size={13} /> {error}
                            </div>
                        )}
                    </div>
                    <div className="ow-modal-footer">
                        <button type="button" className="ow-btn ow-btn--ghost" onClick={onClose}>
                            Annulla
                        </button>
                        <button type="submit" className="ow-btn ow-btn--primary" disabled={saving}>
                            {saving ? <><Loader size={13} className="ws-spin" /> Creazione…</> : 'Crea progetto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrganicWebDashboard;
