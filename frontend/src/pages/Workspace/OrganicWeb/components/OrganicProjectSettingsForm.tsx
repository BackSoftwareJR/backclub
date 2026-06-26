import React, { useState, useEffect } from 'react';
import { Save, Loader, AlertCircle } from 'lucide-react';
import type { OrganicWebProject, CreateProjectData, SkillDefinition } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';

interface OrganicProjectSettingsFormProps {
    project: OrganicWebProject;
    onSaved?: (updated: OrganicWebProject) => void;
}

const BLOG_PLATFORMS = [
    { value: 'wordpress', label: 'WordPress' },
    { value: 'webflow', label: 'Webflow' },
    { value: 'custom', label: 'Custom' },
    { value: 'other', label: 'Altro' },
];

const OrganicProjectSettingsForm: React.FC<OrganicProjectSettingsFormProps> = ({ project, onSaved }) => {
    const [skillDefs, setSkillDefs] = useState<SkillDefinition[]>([]);
    const [form, setForm] = useState<Partial<CreateProjectData>>({
        website_url: project.website_url,
        blog_platform: project.blog_platform,
        blog_api_url: project.blog_api_url ?? '',
        gsc_property_id: project.gsc_property_id ?? '',
        tone_of_voice: project.tone_of_voice ?? '',
        target_audience: project.target_audience ?? '',
        posting_frequency: project.posting_frequency ?? 4,
        active_skills: project.active_skills ?? [],
        language: project.language ?? 'it',
        is_active: project.is_active,
    });
    const [keywordsText, setKeywordsText] = useState((project.target_keywords ?? []).join(', '));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        organicWebApi.getSkillDefinitions()
            .then(res => setSkillDefs(res.skills))
            .catch(() => {});
    }, []);

    const toggleSkill = (skillId: string) => {
        setForm(prev => {
            const current = prev.active_skills ?? [];
            const updated = current.includes(skillId)
                ? current.filter(s => s !== skillId)
                : [...current, skillId];
            return { ...prev, active_skills: updated };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const keywords = keywordsText
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
            const result = await organicWebApi.updateProject(project.id, {
                ...form,
                target_keywords: keywords,
            });
            setSuccess(true);
            onSaved?.(result.project);
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            setError('Errore durante il salvataggio delle impostazioni.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ow-settings-form" onSubmit={handleSubmit}>
            <div className="ow-settings-section">
                <h4 className="ow-settings-section-title">Configurazione sito</h4>

                <div className="ow-form-group">
                    <label className="ow-label">URL sito</label>
                    <input
                        type="url"
                        className="ow-input"
                        value={form.website_url ?? ''}
                        onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
                        required
                    />
                </div>

                <div className="ow-form-row">
                    <div className="ow-form-group">
                        <label className="ow-label">Piattaforma blog</label>
                        <select
                            className="ow-select"
                            value={form.blog_platform}
                            onChange={e => setForm(p => ({ ...p, blog_platform: e.target.value as CreateProjectData['blog_platform'] }))}
                        >
                            {BLOG_PLATFORMS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
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

                <div className="ow-form-group">
                    <label className="ow-label">URL API blog</label>
                    <input
                        type="url"
                        className="ow-input"
                        placeholder="https://miosito.it/wp-json/wp/v2"
                        value={form.blog_api_url ?? ''}
                        onChange={e => setForm(p => ({ ...p, blog_api_url: e.target.value }))}
                    />
                </div>

                <div className="ow-form-group">
                    <label className="ow-label">Google Search Console property ID</label>
                    <input
                        type="text"
                        className="ow-input"
                        placeholder="sc-domain:miosito.it"
                        value={form.gsc_property_id ?? ''}
                        onChange={e => setForm(p => ({ ...p, gsc_property_id: e.target.value }))}
                    />
                </div>
            </div>

            <div className="ow-settings-section">
                <h4 className="ow-settings-section-title">Contenuti e SEO</h4>

                <div className="ow-form-group">
                    <label className="ow-label">Keyword target (separate da virgola)</label>
                    <input
                        type="text"
                        className="ow-input"
                        placeholder="seo, marketing digitale, ottimizzazione"
                        value={keywordsText}
                        onChange={e => setKeywordsText(e.target.value)}
                    />
                </div>

                <div className="ow-form-group">
                    <label className="ow-label">Tono di voce</label>
                    <textarea
                        className="ow-textarea"
                        rows={3}
                        placeholder="Professionale, diretto, con esempi pratici…"
                        value={form.tone_of_voice ?? ''}
                        onChange={e => setForm(p => ({ ...p, tone_of_voice: e.target.value }))}
                    />
                </div>

                <div className="ow-form-group">
                    <label className="ow-label">Target audience</label>
                    <textarea
                        className="ow-textarea"
                        rows={3}
                        placeholder="PMI italiane nel settore manifatturiero…"
                        value={form.target_audience ?? ''}
                        onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                    />
                </div>

                <div className="ow-form-group">
                    <label className="ow-label">Frequenza pubblicazione (post/mese)</label>
                    <input
                        type="number"
                        className="ow-input ow-input--narrow"
                        min={1}
                        max={30}
                        value={form.posting_frequency ?? 4}
                        onChange={e => setForm(p => ({ ...p, posting_frequency: parseInt(e.target.value) || 4 }))}
                    />
                </div>
            </div>

            {skillDefs.length > 0 && (
                <div className="ow-settings-section">
                    <h4 className="ow-settings-section-title">Skill attive</h4>
                    <div className="ow-skill-toggles">
                        {skillDefs.map(skill => {
                            const active = (form.active_skills ?? []).includes(skill.id);
                            return (
                                <div key={skill.id} className="ow-skill-toggle">
                                    <label className="ow-toggle-label">
                                        <span className="ow-toggle-info">
                                            <span className="ow-toggle-name">{skill.name}</span>
                                            {skill.description && (
                                                <span className="ow-toggle-desc">{skill.description}</span>
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            className={`ow-toggle-switch ${active ? 'ow-toggle-switch--on' : ''}`}
                                            onClick={() => toggleSkill(skill.id)}
                                            aria-label={`${active ? 'Disabilita' : 'Abilita'} ${skill.name}`}
                                        >
                                            <span className="ow-toggle-thumb" />
                                        </button>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="ow-settings-section">
                <div className="ow-form-group">
                    <label className="ow-toggle-label">
                        <span className="ow-toggle-info">
                            <span className="ow-toggle-name">Progetto attivo</span>
                            <span className="ow-toggle-desc">Abilita/disabilita l'automazione Organic Web per questo progetto</span>
                        </span>
                        <button
                            type="button"
                            className={`ow-toggle-switch ${form.is_active ? 'ow-toggle-switch--on' : ''}`}
                            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                        >
                            <span className="ow-toggle-thumb" />
                        </button>
                    </label>
                </div>
            </div>

            {error && (
                <div className="ow-error-row">
                    <AlertCircle size={13} />
                    {error}
                </div>
            )}

            {success && (
                <div className="ow-success-row">
                    Impostazioni salvate con successo.
                </div>
            )}

            <div className="ow-settings-actions">
                <button type="submit" className="ow-btn ow-btn--primary" disabled={saving}>
                    {saving ? <><Loader size={14} className="ws-spin" /> Salvataggio…</> : <><Save size={14} /> Salva impostazioni</>}
                </button>
            </div>
        </form>
    );
};

export default OrganicProjectSettingsForm;
