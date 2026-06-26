import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, X, Loader, AlertCircle, RefreshCw,
    ChevronRight, Globe, Edit2, FileText, BarChart2, Settings,
    Sparkles, Check, Pencil, Users, Mic2, Tag, Zap, Calendar, CheckCircle
} from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import type {
    OrganicWebProject, SkillStatus, OrganicSkillRun,
    OrganicHumanTask, OrganicBlogPost, OrganicSeoAudit, SkillDefinition
} from '../../../api/organicWeb';
import SkillRunStatusBadge from './components/SkillRunStatusBadge';
import HumanTaskCard from './components/HumanTaskCard';
import OrganicProjectSettingsForm from './components/OrganicProjectSettingsForm';
import GscBentoDashboard from './components/GscBentoDashboard';
import GscPropertySelector from './components/GscPropertySelector';
import './OrganicWeb.css';

type TabId = 'overview' | 'runs' | 'tasks' | 'posts' | 'seo' | 'settings';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Globe size={13} /> },
    { id: 'runs', label: 'Console', icon: <Play size={13} /> },
    { id: 'tasks', label: 'Task Umani', icon: <Edit2 size={13} /> },
    { id: 'posts', label: 'Post Blog', icon: <FileText size={13} /> },
    { id: 'seo', label: 'SEO Audit', icon: <BarChart2 size={13} /> },
    { id: 'settings', label: 'Impostazioni', icon: <Settings size={13} /> },
];

const OrganicWebProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = parseInt(id ?? '0');

    const [project, setProject] = useState<OrganicWebProject | null>(null);
    const [skillStatus, setSkillStatus] = useState<SkillStatus[]>([]);
    const [runs, setRuns] = useState<OrganicSkillRun[]>([]);
    const [humanTasks, setHumanTasks] = useState<OrganicHumanTask[]>([]);
    const [blogPosts, setBlogPosts] = useState<OrganicBlogPost[]>([]);
    const [seoAudits, setSeoAudits] = useState<OrganicSeoAudit[]>([]);
    const [skillDefs, setSkillDefs] = useState<SkillDefinition[]>([]);

    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);

    // GSC per-progetto
    const [gscConnected, setGscConnected] = useState<boolean | null>(null);
    const [gscConnectedAt, setGscConnectedAt] = useState<string | null>(null);
    const [gscPropertyUrl, setGscPropertyUrl] = useState<string | null>(null);
    const [gscConnecting, setGscConnecting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        window.setTimeout(() => setToast(null), 5000);
    }, []);

    const loadProject = useCallback(async () => {
        setLoading(true);
        setError(null);
        setGscConnected(null);
        try {
            const [projectRes, skillDefsRes] = await Promise.all([
                organicWebApi.getProject(projectId),
                organicWebApi.getSkillDefinitions(),
            ]);
            setProject(projectRes.project);
            setSkillStatus(projectRes.skill_status);
            setSkillDefs(skillDefsRes.skills);
            setGscConnected(projectRes.gsc?.connected ?? false);
            setGscConnectedAt(projectRes.gsc?.connected_at ?? null);
            setGscPropertyUrl(projectRes.gsc?.property_url ?? null);
        } catch {
            setError('Errore nel caricamento del progetto.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const loadTabData = useCallback(async (tab: TabId) => {
        if (tab === 'runs') {
            const res = await organicWebApi.getSkillRuns(projectId);
            setRuns(res.data);
        } else if (tab === 'tasks') {
            const res = await organicWebApi.getProjectHumanTasks(projectId);
            setHumanTasks(res.tasks);
        } else if (tab === 'posts') {
            const res = await organicWebApi.getBlogPosts(projectId);
            setBlogPosts(res.data);
        } else if (tab === 'seo') {
            const res = await organicWebApi.getSeoAudits(projectId);
            setSeoAudits(res.data);
        }
    }, [projectId]);

    const loadGscStatus = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await organicWebApi.checkGoogleConnection(projectId);
            setGscConnected(res.connected);
            setGscConnectedAt(res.connected_at);
        } catch {
            setGscConnected(false);
        }
    }, [projectId]);

    const handleConnectGsc = async () => {
        setGscConnecting(true);
        try {
            const url = await organicWebApi.getGoogleAuthUrl(projectId);
            window.location.href = url;
        } catch {
            setGscConnecting(false);
        }
    };

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gsc_connected') === 'true') {
            showToast('success', 'Google Search Console collegata con successo!');
            loadProject();
            params.delete('gsc_connected');
            const newSearch = params.toString();
            window.history.replaceState(
                null,
                '',
                window.location.pathname + (newSearch ? `?${newSearch}` : '')
            );
        } else if (params.get('gsc_error')) {
            showToast('error', decodeURIComponent(params.get('gsc_error') ?? 'Collegamento fallito'));
            params.delete('gsc_error');
            const newSearch = params.toString();
            window.history.replaceState(
                null,
                '',
                window.location.pathname + (newSearch ? `?${newSearch}` : '')
            );
        }
    }, [showToast, loadProject]);

    useEffect(() => {
        if (project) loadTabData(activeTab);
    }, [activeTab, project, loadTabData]);

    const pendingTasksCount = humanTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

    if (loading) {
        return (
            <div className="ow-loading">
                <div className="ow-spinner" />
                Caricamento progetto…
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="ow-page">
                <button className="ow-back-btn" onClick={() => navigate('/workspace/organic_web')}>
                    <ArrowLeft size={14} /> Torna alla dashboard
                </button>
                <div className="ow-error-row">
                    <AlertCircle size={13} /> {error ?? 'Progetto non trovato.'}
                </div>
            </div>
        );
    }

    const projectName = project.crmProject?.name ?? `Progetto #${project.id}`;

    return (
        <div className="ow-page">
            <button className="ow-back-btn" onClick={() => navigate('/workspace/organic_web')}>
                <ArrowLeft size={14} /> Organic Web
            </button>

            <div className="ow-page-header">
                <div className="ow-page-header-left">
                    <h1 className="ow-page-title">{projectName}</h1>
                    <a
                        href={project.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 'var(--ws-font-sm)', color: 'var(--ws-accent)', textDecoration: 'none' }}
                    >
                        {project.website_url}
                    </a>
                </div>
                <div className="ow-page-header-actions">
                    {project.is_active ? (
                        <span className="ow-badge ow-badge--green">Attivo</span>
                    ) : (
                        <span className="ow-badge ow-badge--gray">Inattivo</span>
                    )}
                    <button
                        className="ow-btn ow-btn--secondary"
                        onClick={() => { loadProject(); loadGscStatus(); }}
                        title="Aggiorna"
                    >
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* ── Google Search Console per questo progetto ── */}
            <div className={`ow-gsc-section ${gscConnected ? 'ow-gsc-section--connected' : ''}`} style={{ marginBottom: 16 }}>
                <div className="ow-gsc-left">
                    <div className="ow-gsc-icon">
                        <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </div>
                    <div>
                        <span className="ow-gsc-title">Google Search Console</span>
                        <span className="ow-gsc-desc">
                            {gscConnected
                                ? 'Account collegato — monitoraggio ricerca organica attivo'
                                : 'Performance di ricerca organica per questo progetto'}
                        </span>
                    </div>
                </div>
                <div className="ow-gsc-right">
                    {gscConnected === null ? (
                        <div className="ow-skeleton ow-skeleton--btn" />
                    ) : gscConnected ? (
                        <div className="ow-gsc-status-connected">
                            <GscPropertySelector
                                projectId={projectId}
                                currentPropertyUrl={gscPropertyUrl}
                                onPropertySelected={(propertyUrl) => {
                                    setGscPropertyUrl(propertyUrl);
                                    showToast('success', 'Proprietà GSC cambiata con successo');
                                }}
                            />
                            <span className="ow-badge ow-badge--green ow-gsc-badge">
                                <CheckCircle size={12} />
                                Connessa
                            </span>
                            {gscConnectedAt && (
                                <span className="ow-gsc-connected-date">
                                    Collegata il {new Date(gscConnectedAt).toLocaleDateString('it-IT', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            )}
                        </div>
                    ) : (
                        <button
                            className="ow-btn ow-btn--secondary"
                            onClick={handleConnectGsc}
                            disabled={gscConnecting}
                        >
                            {gscConnecting
                                ? <><Loader size={13} className="ws-spin" /> Reindirizzamento…</>
                                : <>
                                    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }}>
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    {' '}Collega Google Search Console
                                </>
                            }
                        </button>
                    )}
                </div>
            </div>

            {gscConnected && gscPropertyUrl && <GscBentoDashboard projectId={projectId} key={gscPropertyUrl} />}

            <div className="ow-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`ow-tab ${activeTab === tab.id ? 'ow-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'tasks' && pendingTasksCount > 0 && (
                            <span className="ow-tab-badge">{pendingTasksCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <OverviewTab project={project} skillStatus={skillStatus} onProjectUpdated={updated => setProject(updated)} />
            )}
            {activeTab === 'runs' && (
                <RunsTab
                    projectId={projectId}
                    runs={runs}
                    skillDefs={skillDefs}
                    showStartModal={showStartModal}
                    setShowStartModal={setShowStartModal}
                    onRunStarted={() => loadTabData('runs')}
                />
            )}
            {activeTab === 'tasks' && (
                <TasksTab
                    tasks={humanTasks}
                    onTaskCompleted={() => loadTabData('tasks')}
                />
            )}
            {activeTab === 'posts' && (
                <PostsTab posts={blogPosts} />
            )}
            {activeTab === 'seo' && (
                <SeoTab audits={seoAudits} />
            )}
            {activeTab === 'settings' && (
                <OrganicProjectSettingsForm
                    project={project}
                    onSaved={updated => setProject(updated)}
                />
            )}

            {toast && (
                <div className={`ow-toast ow-toast--${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

// ─── Overview Tab ────────────────────────────────────────────────────────────

const BLOG_PLATFORMS = [
    { value: 'wordpress', label: 'WordPress' },
    { value: 'webflow', label: 'Webflow' },
    { value: 'custom', label: 'Custom' },
    { value: 'other', label: 'Altro' },
];

const LANGUAGES = [
    { value: 'it', label: '🇮🇹 Italiano' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
];

interface OverviewTabProps {
    project: OrganicWebProject;
    skillStatus: SkillStatus[];
    onProjectUpdated: (updated: OrganicWebProject) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ project, skillStatus, onProjectUpdated }) => {
    const [saving, setSaving] = useState(false);
    const [suggestingField, setSuggestingField] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [form, setForm] = useState({
        blog_platform: project.blog_platform,
        language: project.language ?? 'it',
        posting_frequency: project.posting_frequency ?? 4,
        tone_of_voice: project.tone_of_voice ?? '',
        target_audience: project.target_audience ?? '',
        target_keywords: (project.target_keywords ?? []).join(', '),
    });

    const [editing, setEditing] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            const keywords = form.target_keywords
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
            const res = await organicWebApi.updateProject(project.id, {
                blog_platform: form.blog_platform as OrganicWebProject['blog_platform'],
                language: form.language,
                posting_frequency: form.posting_frequency,
                tone_of_voice: form.tone_of_voice,
                target_audience: form.target_audience,
                target_keywords: keywords,
            });
            onProjectUpdated(res.project);
            setEditing(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            // silent - global error shown below
        } finally {
            setSaving(false);
        }
    };

    const handleAiSuggest = async (field: 'tone_of_voice' | 'target_audience' | 'target_keywords') => {
        setSuggestingField(field);
        try {
            const res = await organicWebApi.aiSuggest(project.id, field);
            if (field === 'target_keywords') {
                const arr = Array.isArray(res.suggestion) ? res.suggestion : [];
                setForm(f => ({ ...f, target_keywords: arr.join(', ') }));
            } else {
                setForm(f => ({ ...f, [field]: res.suggestion as string }));
            }
            setEditing(field);
        } catch {
            // silent
        } finally {
            setSuggestingField(null);
        }
    };

    const platformLabel = BLOG_PLATFORMS.find(p => p.value === form.blog_platform)?.label ?? form.blog_platform;
    const languageLabel = LANGUAGES.find(l => l.value === form.language)?.label ?? form.language;

    return (
        <div className="ow-overview-cards">

            {/* ── Config card ── */}
            <div className="ow-card ow-card--config">
                <div className="ow-card-header">
                    <span className="ow-card-icon"><Zap size={16} /></span>
                    <span className="ow-card-title">Configurazione</span>
                    <button className="ow-card-edit-btn" onClick={() => setEditing(editing === 'config' ? null : 'config')}>
                        {editing === 'config' ? <X size={13} /> : <Pencil size={13} />}
                    </button>
                </div>

                {editing === 'config' ? (
                    <div className="ow-card-edit-body">
                        <div className="ow-card-field-row">
                            <label className="ow-card-label">Piattaforma</label>
                            <select
                                className="ow-select ow-select--sm"
                                value={form.blog_platform}
                                onChange={e => setForm(f => ({ ...f, blog_platform: e.target.value as typeof form.blog_platform }))}
                            >
                                {BLOG_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="ow-card-field-row">
                            <label className="ow-card-label">Lingua</label>
                            <select
                                className="ow-select ow-select--sm"
                                value={form.language}
                                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                            >
                                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </div>
                        <div className="ow-card-field-row">
                            <label className="ow-card-label">Post/mese</label>
                            <input
                                type="number" min={1} max={30}
                                className="ow-input ow-input--sm ow-input--narrow"
                                value={form.posting_frequency}
                                onChange={e => setForm(f => ({ ...f, posting_frequency: parseInt(e.target.value) || 4 }))}
                            />
                        </div>
                        <button className="ow-card-save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader size={12} className="ws-spin" /> : <Check size={12} />}
                            Salva
                        </button>
                    </div>
                ) : (
                    <div className="ow-card-stats">
                        <div className="ow-card-stat">
                            <span className="ow-card-stat-value">{platformLabel}</span>
                            <span className="ow-card-stat-label">Piattaforma</span>
                        </div>
                        <div className="ow-card-stat">
                            <span className="ow-card-stat-value">{languageLabel}</span>
                            <span className="ow-card-stat-label">Lingua</span>
                        </div>
                        <div className="ow-card-stat">
                            <span className="ow-card-stat-value">{form.posting_frequency}</span>
                            <span className="ow-card-stat-label">Post/mese</span>
                        </div>
                        <div className="ow-card-stat">
                            <span className="ow-card-stat-value">
                                {project.last_audit_at
                                    ? new Date(project.last_audit_at).toLocaleDateString('it-IT')
                                    : '—'}
                            </span>
                            <span className="ow-card-stat-label">Ultimo audit</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tono di voce card ── */}
            <div className="ow-card ow-card--tone">
                <div className="ow-card-header">
                    <span className="ow-card-icon"><Mic2 size={16} /></span>
                    <span className="ow-card-title">Tono di voce</span>
                    <button
                        className="ow-card-ai-btn"
                        onClick={() => handleAiSuggest('tone_of_voice')}
                        disabled={suggestingField === 'tone_of_voice'}
                        title="Suggerisci con AI"
                    >
                        {suggestingField === 'tone_of_voice' ? <Loader size={12} className="ws-spin" /> : <Sparkles size={12} />}
                        AI
                    </button>
                    <button className="ow-card-edit-btn" onClick={() => setEditing(editing === 'tone_of_voice' ? null : 'tone_of_voice')}>
                        {editing === 'tone_of_voice' ? <X size={13} /> : <Pencil size={13} />}
                    </button>
                </div>

                {editing === 'tone_of_voice' ? (
                    <div className="ow-card-edit-body">
                        <textarea
                            className="ow-textarea ow-textarea--sm"
                            rows={4}
                            placeholder="Professionale e diretto, con esempi pratici…"
                            value={form.tone_of_voice}
                            onChange={e => setForm(f => ({ ...f, tone_of_voice: e.target.value }))}
                        />
                        <button className="ow-card-save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader size={12} className="ws-spin" /> : <Check size={12} />}
                            Salva
                        </button>
                    </div>
                ) : (
                    <p className="ow-card-text">
                        {form.tone_of_voice || <span className="ow-card-empty">Non definito — clicca ✏️ per modificare o ✨ per suggerimento AI</span>}
                    </p>
                )}
            </div>

            {/* ── Target audience card ── */}
            <div className="ow-card ow-card--audience">
                <div className="ow-card-header">
                    <span className="ow-card-icon"><Users size={16} /></span>
                    <span className="ow-card-title">Audience</span>
                    <button
                        className="ow-card-ai-btn"
                        onClick={() => handleAiSuggest('target_audience')}
                        disabled={suggestingField === 'target_audience'}
                        title="Suggerisci con AI"
                    >
                        {suggestingField === 'target_audience' ? <Loader size={12} className="ws-spin" /> : <Sparkles size={12} />}
                        AI
                    </button>
                    <button className="ow-card-edit-btn" onClick={() => setEditing(editing === 'target_audience' ? null : 'target_audience')}>
                        {editing === 'target_audience' ? <X size={13} /> : <Pencil size={13} />}
                    </button>
                </div>

                {editing === 'target_audience' ? (
                    <div className="ow-card-edit-body">
                        <textarea
                            className="ow-textarea ow-textarea--sm"
                            rows={4}
                            placeholder="PMI italiane nel settore manifatturiero…"
                            value={form.target_audience}
                            onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                        />
                        <button className="ow-card-save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader size={12} className="ws-spin" /> : <Check size={12} />}
                            Salva
                        </button>
                    </div>
                ) : (
                    <p className="ow-card-text">
                        {form.target_audience || <span className="ow-card-empty">Non definita — clicca ✏️ per modificare o ✨ per suggerimento AI</span>}
                    </p>
                )}
            </div>

            {/* ── Keywords card ── */}
            <div className="ow-card ow-card--keywords">
                <div className="ow-card-header">
                    <span className="ow-card-icon"><Tag size={16} /></span>
                    <span className="ow-card-title">Keyword target</span>
                    <button
                        className="ow-card-ai-btn"
                        onClick={() => handleAiSuggest('target_keywords')}
                        disabled={suggestingField === 'target_keywords'}
                        title="Suggerisci con AI"
                    >
                        {suggestingField === 'target_keywords' ? <Loader size={12} className="ws-spin" /> : <Sparkles size={12} />}
                        AI
                    </button>
                    <button className="ow-card-edit-btn" onClick={() => setEditing(editing === 'target_keywords' ? null : 'target_keywords')}>
                        {editing === 'target_keywords' ? <X size={13} /> : <Pencil size={13} />}
                    </button>
                </div>

                {editing === 'target_keywords' ? (
                    <div className="ow-card-edit-body">
                        <input
                            type="text"
                            className="ow-input ow-input--sm"
                            placeholder="seo, marketing digitale, ottimizzazione…"
                            value={form.target_keywords}
                            onChange={e => setForm(f => ({ ...f, target_keywords: e.target.value }))}
                        />
                        <p style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)', margin: '4px 0 0' }}>Separate da virgola</p>
                        <button className="ow-card-save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader size={12} className="ws-spin" /> : <Check size={12} />}
                            Salva
                        </button>
                    </div>
                ) : (
                    <div className="ow-card-tags">
                        {form.target_keywords
                            ? form.target_keywords.split(',').map(k => k.trim()).filter(Boolean).map(kw => (
                                <span key={kw} className="ow-card-tag">{kw}</span>
                            ))
                            : <span className="ow-card-empty">Nessuna keyword — clicca ✏️ per aggiungere o ✨ per AI</span>
                        }
                    </div>
                )}
            </div>

            {/* ── Skill status card ── */}
            {skillStatus.length > 0 && (
                <div className="ow-card ow-card--skills" style={{ gridColumn: '1 / -1' }}>
                    <div className="ow-card-header">
                        <span className="ow-card-icon"><Calendar size={16} /></span>
                        <span className="ow-card-title">Stato skill attive</span>
                    </div>
                    <div className="ow-skill-status-grid">
                        {skillStatus.map(s => (
                            <div key={s.skill_id} className="ow-skill-status-item">
                                <div className="ow-skill-status-top">
                                    <span className="ow-skill-status-name">{s.skill_name}</span>
                                    {s.last_run_status ? (
                                        <SkillRunStatusBadge status={s.last_run_status} />
                                    ) : (
                                        <span className="ow-badge ow-badge--gray ow-badge--sm">Mai eseguita</span>
                                    )}
                                </div>
                                <div className="ow-skill-status-meta">
                                    {s.pending_human_tasks > 0 && (
                                        <span className="ow-badge ow-badge--yellow ow-badge--sm">
                                            {s.pending_human_tasks} task in attesa
                                        </span>
                                    )}
                                    {s.last_run_at && (
                                        <span className="ow-skill-status-date">
                                            {new Date(s.last_run_at).toLocaleDateString('it-IT')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {saveSuccess && (
                <div className="ow-success-row" style={{ gridColumn: '1 / -1' }}>
                    <Check size={13} /> Modifiche salvate con successo.
                </div>
            )}
        </div>
    );
};

// ─── Runs Tab ────────────────────────────────────────────────────────────────

interface RunsTabProps {
    projectId: number;
    runs: OrganicSkillRun[];
    skillDefs: SkillDefinition[];
    showStartModal: boolean;
    setShowStartModal: (v: boolean) => void;
    onRunStarted: () => void;
}

const RunsTab: React.FC<RunsTabProps> = ({
    projectId, runs, skillDefs, showStartModal, setShowStartModal, onRunStarted
}) => {
    const navigate = useNavigate();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="ow-btn ow-btn--primary" onClick={() => setShowStartModal(true)}>
                    <Play size={13} /> Avvia skill
                </button>
            </div>

            {runs.length === 0 ? (
                <div className="ow-empty">
                    <Play size={36} className="ow-empty-icon" />
                    <p className="ow-empty-text">Nessuna skill run registrata.</p>
                </div>
            ) : (
                <div className="ow-runs-list">
                    {runs.map(run => (
                        <div
                            key={run.id}
                            className="ow-run-row"
                            onClick={() => navigate(`/workspace/organic_web/skill-runs/${run.id}`)}
                        >
                            <SkillRunStatusBadge status={run.status} size="sm" />
                            <span className="ow-run-row-skill">{run.skill_id}</span>
                            <span className="ow-run-row-date">
                                {new Date(run.created_at).toLocaleString('it-IT', {
                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                            <ChevronRight size={14} style={{ color: 'var(--ws-text-tertiary)', flexShrink: 0 }} />
                        </div>
                    ))}
                </div>
            )}

            {showStartModal && (
                <StartSkillModal
                    projectId={projectId}
                    skillDefs={skillDefs}
                    onClose={() => setShowStartModal(false)}
                    onStarted={() => { setShowStartModal(false); onRunStarted(); }}
                />
            )}
        </div>
    );
};

// ─── Start Skill Modal ───────────────────────────────────────────────────────

interface StartSkillModalProps {
    projectId: number;
    skillDefs: SkillDefinition[];
    onClose: () => void;
    onStarted: () => void;
}

const StartSkillModal: React.FC<StartSkillModalProps> = ({ projectId, skillDefs, onClose, onStarted }) => {
    const [selectedSkill, setSelectedSkill] = useState(skillDefs[0]?.id ?? '');
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async () => {
        if (!selectedSkill) return;
        setStarting(true);
        setError(null);
        try {
            await organicWebApi.startSkillRun(projectId, selectedSkill);
            onStarted();
        } catch {
            setError('Errore durante l\'avvio della skill run.');
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="ow-modal-overlay" onClick={onClose}>
            <div className="ow-modal" onClick={e => e.stopPropagation()}>
                <div className="ow-modal-header">
                    <h2 className="ow-modal-title">Avvia skill</h2>
                    <button className="ow-modal-close" onClick={onClose}><X size={14} /></button>
                </div>
                <div className="ow-modal-body">
                    <div className="ow-form-group">
                        <label className="ow-label">Seleziona skill</label>
                        <select
                            className="ow-select"
                            value={selectedSkill}
                            onChange={e => setSelectedSkill(e.target.value)}
                        >
                            {skillDefs.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    {error && (
                        <div className="ow-error-row">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}
                </div>
                <div className="ow-modal-footer">
                    <button className="ow-btn ow-btn--ghost" onClick={onClose}>Annulla</button>
                    <button className="ow-btn ow-btn--primary" onClick={handleStart} disabled={starting || !selectedSkill}>
                        {starting ? <><Loader size={13} className="ws-spin" /> Avvio…</> : <><Play size={13} /> Avvia</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Tasks Tab ───────────────────────────────────────────────────────────────

interface TasksTabProps {
    tasks: OrganicHumanTask[];
    onTaskCompleted: () => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks, onTaskCompleted }) => {
    if (tasks.length === 0) {
        return (
            <div className="ow-empty">
                <p className="ow-empty-text">Nessun task umano in attesa per questo progetto.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(task => (
                <HumanTaskCard
                    key={task.id}
                    task={task}
                    onCompleted={onTaskCompleted}
                />
            ))}
        </div>
    );
};

// ─── Posts Tab ───────────────────────────────────────────────────────────────

const POST_STATUS_BADGE: Record<string, string> = {
    draft: 'gray',
    review: 'yellow',
    scheduled: 'blue',
    published: 'green',
    failed: 'red',
};

const PostsTab: React.FC<{ posts: OrganicBlogPost[] }> = ({ posts }) => {
    if (posts.length === 0) {
        return (
            <div className="ow-empty">
                <FileText size={36} className="ow-empty-icon" />
                <p className="ow-empty-text">Nessun post blog generato.</p>
            </div>
        );
    }

    return (
        <div className="ow-table-wrapper">
            <table className="ow-table">
                <thead>
                    <tr>
                        <th>Titolo</th>
                        <th>Keyword</th>
                        <th>Programmato</th>
                        <th>Stato</th>
                        <th>Score SEO</th>
                    </tr>
                </thead>
                <tbody>
                    {posts.map(post => (
                        <tr key={post.id}>
                            <td style={{ maxWidth: 260 }}>
                                <span style={{ fontWeight: 500 }}>{post.title}</span>
                            </td>
                            <td>
                                <span style={{ color: 'var(--ws-text-secondary)', fontSize: 'var(--ws-font-xs)' }}>
                                    {post.focus_keyword ?? '—'}
                                </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                                {post.scheduled_at
                                    ? new Date(post.scheduled_at).toLocaleDateString('it-IT')
                                    : '—'}
                            </td>
                            <td>
                                <span className={`ow-badge ow-badge--sm ow-badge--${POST_STATUS_BADGE[post.status] ?? 'gray'}`}>
                                    {post.status}
                                </span>
                            </td>
                            <td>
                                {post.seo_score != null ? (
                                    <span style={{
                                        color: post.seo_score >= 70 ? 'var(--ws-green)' : post.seo_score >= 40 ? 'var(--ws-orange)' : 'var(--ws-red)',
                                        fontWeight: 600,
                                        fontSize: 'var(--ws-font-sm)',
                                    }}>
                                        {post.seo_score}
                                    </span>
                                ) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── SEO Tab ─────────────────────────────────────────────────────────────────

const SeoTab: React.FC<{ audits: OrganicSeoAudit[] }> = ({ audits }) => {
    const [expanded, setExpanded] = useState<number | null>(audits[0]?.id ?? null);

    if (audits.length === 0) {
        return (
            <div className="ow-empty">
                <BarChart2 size={36} className="ow-empty-icon" />
                <p className="ow-empty-text">Nessun audit SEO eseguito.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {audits.map(audit => (
                <div
                    key={audit.id}
                    className="ow-overview-section"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === audit.id ? null : audit.id)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 'var(--ws-font-sm)', flex: 1, color: 'var(--ws-text-secondary)' }}>
                            {new Date(audit.audit_date).toLocaleDateString('it-IT')}
                        </span>
                        {audit.overall_score != null && (
                            <span style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: audit.overall_score >= 70 ? 'var(--ws-green)' : audit.overall_score >= 40 ? 'var(--ws-orange)' : 'var(--ws-red)',
                            }}>
                                {audit.overall_score}
                            </span>
                        )}
                        <div className="ow-audit-breakdown">
                            {audit.critical_issues > 0 && (
                                <span className="ow-audit-pill ow-audit-pill--critical">
                                    {audit.critical_issues} critici
                                </span>
                            )}
                            {audit.warning_issues > 0 && (
                                <span className="ow-audit-pill ow-audit-pill--warning">
                                    {audit.warning_issues} avvisi
                                </span>
                            )}
                            {audit.info_issues > 0 && (
                                <span className="ow-audit-pill ow-audit-pill--info">
                                    {audit.info_issues} info
                                </span>
                            )}
                        </div>
                    </div>

                    {expanded === audit.id && audit.issues && audit.issues.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {audit.issues.map((issue, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 'var(--ws-radius-sm)',
                                        background: 'var(--ws-surface)',
                                        borderLeft: `3px solid ${issue.severity === 'critical' ? 'var(--ws-red)' : issue.severity === 'warning' ? 'var(--ws-orange)' : 'var(--ws-accent)'}`,
                                        fontSize: 'var(--ws-font-xs)',
                                        color: 'var(--ws-text)',
                                    }}
                                >
                                    <strong style={{ color: 'var(--ws-text-secondary)' }}>[{issue.code}]</strong> {issue.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default OrganicWebProjectDetail;
