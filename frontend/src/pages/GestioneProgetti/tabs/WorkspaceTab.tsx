import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Plus, 
    Edit, 
    Trash2, 
    GitBranch,
    Save,
    X,
    Monitor,
    Globe,
    ExternalLink,
    Loader,
    CheckCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    getProjectWorkspaceConfig,
    updateProjectWorkspaceSettings,
    createProjectBranch,
    updateProjectBranch,
    deleteProjectBranch,
    type WorkspaceProjectConfig,
    type BranchWithRoles
} from '../../../api/workspacePmConfig';
import type { CrmProject } from '../../../api/crmProjects';
import organicWebApi, { type OrganicWebProject, type BlogPlatform } from '../../../api/organicWeb';

interface WorkspaceTabProps {
    projectId: number;
    project?: CrmProject | null;
}

const AVAILABLE_COLORS = [
    { name: 'Blu', value: '#007AFF' },
    { name: 'Verde', value: '#34C759' },
    { name: 'Arancio', value: '#FF9500' },
    { name: 'Viola', value: '#5856D6' },
    { name: 'Rosso', value: '#FF3B30' },
    { name: 'Grigio', value: '#8E8E93' },
    { name: 'Rosa', value: '#FF2D92' },
    { name: 'Teal', value: '#5AC8FA' }
];

const AVAILABLE_ROLES = [
    { value: 'developer', label: 'Developer' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'admin', label: 'Admin' }
];

const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ projectId, project }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<WorkspaceProjectConfig | null>(null);
    const [saving, setSaving] = useState(false);

    // Workspace settings form state
    const [isEnabled, setIsEnabled] = useState(false);
    const [stagingUrl, setStagingUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');

    // Branch modal state
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<BranchWithRoles | null>(null);
    const [branchForm, setBranchForm] = useState({
        name: '',
        description: '',
        git_branch: '',
        color: AVAILABLE_COLORS[0].value,
        roles: [] as string[]
    });

    // Check if user can access this tab  
    const canAccess = user?.role === 'admin' || (user && project && user.id === project.manager_id);

    // ── Organic Web state ──────────────────────────────────────────────────────
    const [owProject, setOwProject] = useState<OrganicWebProject | null | undefined>(undefined); // undefined = loading
    const [owLoading, setOwLoading] = useState(true);
    const [owSaving, setOwSaving] = useState(false);
    const [owError, setOwError] = useState<string | null>(null);
    const [owForm, setOwForm] = useState({
        website_url: project?.website_url ?? '',
        blog_platform: 'wordpress' as BlogPlatform,
        language: 'it',
    });

    const loadOwProject = async () => {
        try {
            setOwLoading(true);
            const res = await organicWebApi.getProjects();
            const found = res.data.find((p) => p.crm_project_id === projectId) ?? null;
            setOwProject(found);
        } catch {
            setOwProject(null);
        } finally {
            setOwLoading(false);
        }
    };

    const handleOwActivate = async () => {
        if (!owForm.website_url) {
            setOwError('Inserisci l\'URL del sito.');
            return;
        }
        setOwSaving(true);
        setOwError(null);
        try {
            const res = await organicWebApi.createProject({
                crm_project_id: projectId,
                website_url: owForm.website_url,
                blog_platform: owForm.blog_platform,
                language: owForm.language,
                is_active: true,
            });
            setOwProject(res.project);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setOwError(err?.response?.data?.message ?? 'Errore durante l\'attivazione.');
        } finally {
            setOwSaving(false);
        }
    };

    const handleOwToggleActive = async () => {
        if (!owProject) return;
        setOwSaving(true);
        try {
            const res = await organicWebApi.updateProject(owProject.id, { is_active: !owProject.is_active });
            setOwProject(res.project);
        } catch {
            // silently ignore
        } finally {
            setOwSaving(false);
        }
    };

    useEffect(() => {
        if (canAccess) {
            loadWorkspaceConfig();
            loadOwProject();
        }
    }, [projectId, canAccess]);

    const loadWorkspaceConfig = async () => {
        try {
            setLoading(true);
            const data = await getProjectWorkspaceConfig(projectId);
            setConfig(data);
            
            // Load current settings (assuming developer workspace type)
            const developerSettings = data.settings?.find(s => s.workspace_type_code === 'developer');
            if (developerSettings) {
                setIsEnabled(developerSettings.is_enabled);
                setStagingUrl(developerSettings.staging_url || '');
                setPreviewUrl(developerSettings.preview_url || '');
            } else {
                // Set default values when no settings exist
                setIsEnabled(false);
                setStagingUrl('');
                setPreviewUrl('');
            }
        } catch (error: any) {
            console.error('Error loading workspace config:', error);
            // Don't show alert for normal cases where no config exists yet
            // Just set default values and let user create new config
            setConfig({ settings: [], branches: [] });
            setIsEnabled(false);
            setStagingUrl('');
            setPreviewUrl('');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await updateProjectWorkspaceSettings(projectId, {
                workspace_type_code: 'developer',
                is_enabled: isEnabled,
                staging_url: stagingUrl || undefined,
                preview_url: previewUrl || undefined
            });
            alert('✓ Configurazione salvata con successo!');
            await loadWorkspaceConfig();
        } catch (error: any) {
            console.error('Error saving workspace settings:', error);
            const errorMessage = error.response?.data?.message || 'Errore nel salvare la configurazione';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenBranchModal = (branch?: BranchWithRoles) => {
        if (branch) {
            setEditingBranch(branch);
            setBranchForm({
                name: branch.name,
                description: branch.description || '',
                git_branch: branch.git_branch || '',
                color: branch.color || AVAILABLE_COLORS[0].value,
                roles: branch.roles.map(r => r.role)
            });
        } else {
            setEditingBranch(null);
            setBranchForm({
                name: '',
                description: '',
                git_branch: '',
                color: AVAILABLE_COLORS[0].value,
                roles: []
            });
        }
        setShowBranchModal(true);
    };

    const handleCloseBranchModal = () => {
        setShowBranchModal(false);
        setEditingBranch(null);
        setBranchForm({
            name: '',
            description: '',
            git_branch: '',
            color: AVAILABLE_COLORS[0].value,
            roles: []
        });
    };

    const handleSaveBranch = async () => {
        if (!branchForm.name.trim()) {
            alert('Il nome del branch è obbligatorio');
            return;
        }

        try {
            setSaving(true);
            
            const branchData = {
                name: branchForm.name,
                description: branchForm.description || undefined,
                git_branch: branchForm.git_branch || undefined,
                color: branchForm.color,
                workspace_type_code: 'developer',
                roles: branchForm.roles.length > 0 ? branchForm.roles : undefined
            };

            if (editingBranch) {
                await updateProjectBranch(projectId, editingBranch.id, branchData);
                alert('✓ Branch aggiornato con successo!');
            } else {
                await createProjectBranch(projectId, branchData);
                alert('✓ Branch creato con successo!');
            }

            handleCloseBranchModal();
            await loadWorkspaceConfig();
        } catch (error: any) {
            console.error('Error saving branch:', error);
            const errorMessage = error.response?.data?.message || 'Errore nel salvare il branch';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBranch = async (branch: BranchWithRoles) => {
        if (!confirm(`Sei sicuro di voler eliminare il branch "${branch.name}"?`)) {
            return;
        }

        try {
            await deleteProjectBranch(projectId, branch.id);
            alert('✓ Branch eliminato con successo!');
            await loadWorkspaceConfig();
        } catch (error: any) {
            console.error('Error deleting branch:', error);
            const errorMessage = error.response?.data?.message || 'Errore nell\'eliminazione del branch';
            alert(`Errore: ${errorMessage}`);
        }
    };

    const handleRoleToggle = (role: string) => {
        setBranchForm(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    if (!canAccess) {
        return (
            <div className="tab-panel workspace-panel">
                <div className="section-header">
                    <h2 className="section-title">Accesso Negato</h2>
                </div>
                <div className="empty-state">
                    <Monitor size={48} style={{ opacity: 0.3 }} />
                    <p>Non hai i permessi per accedere a questa sezione.</p>
                    <p>Solo amministratori e project manager possono configurare il workspace.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="tab-panel workspace-panel">
                <div className="section-header">
                    <h2 className="section-title">WorkSpace Developer</h2>
                </div>
                <div className="loading-state">
                    <p>Caricamento configurazione...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="tab-panel workspace-panel">
                <div className="section-header">
                    <h2 className="section-title">WorkSpace Developer</h2>
                    <p className="section-subtitle">
                        Configura il workspace developer per questo progetto per permettere agli sviluppatori 
                        di visualizzarlo e lavorarci.
                    </p>
                </div>

                {/* Configurazione Workspace */}
                <div className="section-card">
                    <div className="section-card-header">
                        <div className="section-card-title">
                            <Settings size={20} />
                            <span>Configurazione WorkSpace</span>
                        </div>
                    </div>
                    <div className="section-card-content">
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => setIsEnabled(e.target.checked)}
                                />
                                <span className="checkbox-text">
                                    Abilita workspace developer per questo progetto
                                </span>
                            </label>
                            {!isEnabled && (
                                <p className="form-help">
                                    Quando disabilitato, gli sviluppatori non vedranno questo progetto nel loro workspace.
                                </p>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">
                                    Staging URL
                                    <span className="required">*</span>
                                </label>
                                <input
                                    type="url"
                                    className="form-input"
                                    placeholder="https://staging.example.com"
                                    value={stagingUrl}
                                    onChange={(e) => setStagingUrl(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Preview URL</label>
                                <input
                                    type="url"
                                    className="form-input"
                                    placeholder="https://preview.example.com"
                                    value={previewUrl}
                                    onChange={(e) => setPreviewUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveSettings}
                                disabled={saving}
                            >
                                <Save size={16} />
                                {saving ? 'Salvando...' : 'Salva Configurazione'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Branch di Lavoro */}
                <div className="section-card">
                    <div className="section-card-header">
                        <div className="section-card-title">
                            <GitBranch size={20} />
                            <span>Branch di Lavoro</span>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenBranchModal()}
                        >
                            <Plus size={16} />
                            Aggiungi Branch
                        </button>
                    </div>
                    <div className="section-card-content">
                        {config?.branches && config.branches.length > 0 ? (
                            <div className="branches-list">
                                {config.branches.map((branch) => (
                                    <div key={branch.id} className="branch-item">
                                        <div className="branch-info">
                                            <div className="branch-header">
                                                <div 
                                                    className="branch-color"
                                                    style={{ backgroundColor: branch.color || AVAILABLE_COLORS[0].value }}
                                                />
                                                <h4 className="branch-name">{branch.name}</h4>
                                                {branch.git_branch && (
                                                    <span className="branch-git">
                                                        <GitBranch size={14} />
                                                        {branch.git_branch}
                                                    </span>
                                                )}
                                            </div>
                                            {branch.description && (
                                                <p className="branch-description">{branch.description}</p>
                                            )}
                                            {branch.roles && branch.roles.length > 0 && (
                                                <div className="branch-roles">
                                                    <span className="roles-label">Visibile a:</span>
                                                    {branch.roles.map((roleObj, idx) => (
                                                        <span key={idx} className="role-tag">
                                                            {AVAILABLE_ROLES.find(r => r.value === roleObj.role)?.label || roleObj.role}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {(!branch.roles || branch.roles.length === 0) && (
                                                <div className="branch-roles">
                                                    <span className="roles-label">Visibile a tutti</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="branch-actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleOpenBranchModal(branch)}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteBranch(branch)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <GitBranch size={48} style={{ opacity: 0.3 }} />
                                <p>Nessun branch configurato</p>
                                <p>Aggiungi dei branch per organizzare il lavoro degli sviluppatori.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Organic Web ─────────────────────────────────────────── */}
                <div className="section-card" style={{ marginTop: 24 }}>
                    <div className="section-card-header">
                        <div className="section-card-title">
                            <Globe size={20} />
                            <span>Organic Web</span>
                        </div>
                        {owProject && (
                            <a
                                href={`/workspace/organic_web/project/${owProject.id}`}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <ExternalLink size={14} />
                                Apri workspace
                            </a>
                        )}
                    </div>
                    <div className="section-card-content">
                        {owLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary, #888)', padding: '8px 0' }}>
                                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Caricamento…
                            </div>
                        ) : owProject ? (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <CheckCircle size={16} color={owProject.is_active ? '#34C759' : '#8E8E93'} />
                                    <span style={{ fontWeight: 500 }}>
                                        Organic Web {owProject.is_active ? 'attivo' : 'disattivato'}
                                    </span>
                                    <span style={{ color: 'var(--text-secondary, #888)', fontSize: 13 }}>
                                        · {owProject.website_url}
                                    </span>
                                </div>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={owProject.is_active}
                                        onChange={handleOwToggleActive}
                                        disabled={owSaving}
                                    />
                                    <span className="checkbox-text">
                                        {owSaving ? 'Aggiornamento…' : (owProject.is_active ? 'Disattiva Organic Web per questo progetto' : 'Attiva Organic Web per questo progetto')}
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div>
                                <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #888)', fontSize: 14 }}>
                                    Attiva la gestione SEO e contenuti organici per questo progetto.
                                </p>
                                <div className="form-row" style={{ marginBottom: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">URL sito <span className="required">*</span></label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://miosito.it"
                                            value={owForm.website_url}
                                            onChange={e => setOwForm(p => ({ ...p, website_url: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Piattaforma blog</label>
                                        <select
                                            className="form-input"
                                            value={owForm.blog_platform}
                                            onChange={e => setOwForm(p => ({ ...p, blog_platform: e.target.value as BlogPlatform }))}
                                        >
                                            <option value="wordpress">WordPress</option>
                                            <option value="webflow">Webflow</option>
                                            <option value="custom">Custom</option>
                                            <option value="other">Altro</option>
                                        </select>
                                    </div>
                                </div>
                                {owError && (
                                    <p style={{ color: '#FF3B30', fontSize: 13, margin: '0 0 12px' }}>{owError}</p>
                                )}
                                <button
                                    className="btn btn-primary"
                                    onClick={handleOwActivate}
                                    disabled={owSaving}
                                >
                                    <Globe size={16} />
                                    {owSaving ? 'Attivazione…' : 'Attiva Organic Web'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Branch Modal */}
            {showBranchModal && (
                <div className="modal-overlay">
                    <div className="modal workspace-branch-modal">
                        <div className="modal-header">
                            <h3>{editingBranch ? 'Modifica Branch' : 'Aggiungi Branch'}</h3>
                            <button className="modal-close" onClick={handleCloseBranchModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">
                                    Nome Branch
                                    <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="es. Frontend, Backend, Mobile"
                                    value={branchForm.name}
                                    onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descrizione</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Descrivi questo branch di lavoro..."
                                    value={branchForm.description}
                                    onChange={(e) => setBranchForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Git Branch</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="es. feature/frontend, main, develop"
                                    value={branchForm.git_branch}
                                    onChange={(e) => setBranchForm(prev => ({ ...prev, git_branch: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Colore</label>
                                <div className="color-picker">
                                    {AVAILABLE_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            className={`color-option ${branchForm.color === color.value ? 'selected' : ''}`}
                                            style={{ backgroundColor: color.value }}
                                            onClick={() => setBranchForm(prev => ({ ...prev, color: color.value }))}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Visibilità</label>
                                <div className="roles-checkboxes">
                                    {AVAILABLE_ROLES.map((role) => (
                                        <label key={role.value} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={branchForm.roles.includes(role.value)}
                                                onChange={() => handleRoleToggle(role.value)}
                                            />
                                            <span className="checkbox-text">{role.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="form-help">
                                    Se non selezioni nessun ruolo, il branch sarà visibile a tutti gli utenti del progetto.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCloseBranchModal}>
                                Annulla
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveBranch}
                                disabled={saving}
                            >
                                <Save size={16} />
                                {saving ? 'Salvando...' : (editingBranch ? 'Aggiorna' : 'Crea')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WorkspaceTab;