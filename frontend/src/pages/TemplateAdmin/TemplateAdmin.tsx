import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Download, Upload, FolderKanban, Users as UsersIcon, ListChecks, Search, ChevronRight } from 'lucide-react';
import { getTemplates, getTemplate, deleteTemplate, duplicateTemplate, exportTemplate, type ProjectTemplate } from '../../api/projectTemplates';
import './TemplateAdmin.css';


const TemplateAdmin: React.FC = () => {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
    const [activeTab, setActiveTab] = useState<'info' | 'roles' | 'tasks'>('info');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await getTemplates({ active_only: false });
            console.log('Templates loaded:', data);
            setTemplates(data);
        } catch (err: any) {
            console.error('Error loading templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTemplate = async (template: ProjectTemplate) => {
        try {
            const fullTemplate = await getTemplate(template.id);
            setSelectedTemplate(fullTemplate);
            setView('detail');
        } catch (err: any) {
            alert('Errore nel caricamento del template: ' + err.toString());
        }
    };

    const handleDeleteTemplate = async (templateId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm('Sei sicuro di voler eliminare questo template?')) {
            return;
        }

        try {
            await deleteTemplate(templateId);
            loadTemplates();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleDuplicateTemplate = async (templateId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            await duplicateTemplate(templateId);
            loadTemplates();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleExportTemplate = async (templateId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            const data = await exportTemplate(templateId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `template_${data.code}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="template-admin-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento template...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="template-admin-page">

            {view === 'list' && (
                <>
                    {/* Header */}
                    <div className="template-header">
                        <div>
                            <h1>Gestione Template Progetti</h1>
                            <p className="subtitle">Crea e gestisci template riutilizzabili per i progetti</p>
                        </div>
                        <div className="header-actions">
                            <button className="btn-import">
                                <Upload size={16} />
                                Importa JSON
                            </button>
                            <button className="btn-new-template" onClick={() => setView('create')}>
                                <Plus size={16} />
                                Nuovo Template
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="template-stats">
                        <div className="stat-card">
                            <FolderKanban size={24} />
                            <div>
                                <div className="stat-value">{templates.length}</div>
                                <div className="stat-label">Template Totali</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <ListChecks size={24} />
                            <div>
                                <div className="stat-value">{templates.filter(t => t.has_tasks).length}</div>
                                <div className="stat-label">Con Task Automatiche</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <UsersIcon size={24} />
                            <div>
                                <div className="stat-value">{templates.reduce((sum, t) => sum + (t.roles_count || 0), 0)}</div>
                                <div className="stat-label">Ruoli Definiti</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <ListChecks size={24} />
                            <div>
                                <div className="stat-value">{templates.reduce((sum, t) => sum + (t.tasks_count || 0), 0)}</div>
                                <div className="stat-label">Task Template</div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="search-section">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Cerca template..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="templates-grid">
                        {filteredTemplates.map(template => (
                            <div
                                key={template.id}
                                className="template-card"
                                style={{ borderLeftColor: template.color }}
                            >
                                <div className="template-card-header">
                                    <div className="template-icon" style={{ backgroundColor: template.color + '20' }}>
                                        <span style={{ color: template.color }}>
                                            <FolderKanban size={24} />
                                        </span>
                                    </div>
                                    <div className="template-info">
                                        <h3>{template.name}</h3>
                                        <p className="template-code">{template.code}</p>
                                    </div>
                                    <div className="template-actions">
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleViewTemplate(template)}
                                        title="Visualizza"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    </div>
                                </div>

                                <p className="template-description">{template.description}</p>

                                <div className="template-meta">
                                    <span className="meta-badge">
                                        <UsersIcon size={14} />
                                        {template.roles_count} ruoli
                                    </span>
                                    <span className="meta-badge">
                                        <ListChecks size={14} />
                                        {template.tasks_count} task
                                    </span>
                                    <span className="meta-badge">
                                        {template.default_duration_days} giorni
                                    </span>
                                </div>

                                <div className="template-card-actions">
                                    <button 
                                        className="btn-action" 
                                        title="Modifica"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewTemplate(template);
                                        }}
                                    >
                                        <Edit size={14} />
                                        Modifica
                                    </button>
                                    <button 
                                        className="btn-action" 
                                        title="Duplica"
                                        onClick={(e) => handleDuplicateTemplate(template.id, e)}
                                    >
                                        <Copy size={14} />
                                        Duplica
                                    </button>
                                    <button 
                                        className="btn-action" 
                                        title="Esporta"
                                        onClick={(e) => handleExportTemplate(template.id, e)}
                                    >
                                        <Download size={14} />
                                        Esporta
                                    </button>
                                    <button 
                                        className="btn-action danger" 
                                        title="Elimina"
                                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredTemplates.length === 0 && (
                        <div className="empty-state">
                            <FolderKanban size={48} />
                            <p>Nessun template trovato</p>
                            <button className="btn-create-first" onClick={() => setView('create')}>
                                <Plus size={16} />
                                Crea il tuo primo template
                            </button>
                        </div>
                    )}
                </>
            )}

            {view === 'detail' && selectedTemplate && (
                <>
                    {/* Detail Header */}
                    <div className="detail-header">
                        <button className="btn-back" onClick={() => setView('list')}>
                            ← Torna ai Template
                        </button>
                        <h1>{selectedTemplate.name}</h1>
                    </div>

                    {/* Tabs */}
                    <div className="detail-tabs">
                        <button
                            className={activeTab === 'info' ? 'active' : ''}
                            onClick={() => setActiveTab('info')}
                        >
                            <FolderKanban size={16} />
                            Info Template
                        </button>
                        <button
                            className={activeTab === 'roles' ? 'active' : ''}
                            onClick={() => setActiveTab('roles')}
                        >
                            <UsersIcon size={16} />
                            Ruoli ({selectedTemplate.roles_count})
                        </button>
                        <button
                            className={activeTab === 'tasks' ? 'active' : ''}
                            onClick={() => setActiveTab('tasks')}
                        >
                            <ListChecks size={16} />
                            Task ({selectedTemplate.tasks_count})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="detail-content">
                        {activeTab === 'info' && (
                            <div className="info-tab">
                                <div className="info-grid">
                                    <div className="info-card">
                                        <label>Codice</label>
                                        <p>{selectedTemplate.code}</p>
                                    </div>
                                    <div className="info-card">
                                        <label>Nome</label>
                                        <p>{selectedTemplate.name}</p>
                                    </div>
                                    <div className="info-card">
                                        <label>Durata Default</label>
                                        <p>{selectedTemplate.default_duration_days} giorni</p>
                                    </div>
                                    <div className="info-card">
                                        <label>Colore</label>
                                        <div className="color-preview" style={{ backgroundColor: selectedTemplate.color }}>
                                            {selectedTemplate.color}
                                        </div>
                                    </div>
                                </div>
                                <div className="info-card full-width">
                                    <label>Descrizione</label>
                                    <p>{selectedTemplate.description}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="roles-tab">
                                <div className="tab-header">
                                    <h3>Ruoli Richiesti</h3>
                                    <button className="btn-add-small">
                                        <Plus size={14} />
                                        Aggiungi Ruolo
                                    </button>
                                </div>
                                
                                {selectedTemplate.roles && selectedTemplate.roles.length > 0 ? (
                                    <div className="roles-list">
                                        {selectedTemplate.roles.map(role => (
                                            <div key={role.id} className="role-item">
                                                <div className="role-info">
                                                    <div className="role-name">{role.role_name}</div>
                                                    <div className="role-code">{role.role_code}</div>
                                                </div>
                                                <div className="role-meta">
                                                    {role.is_required && (
                                                        <span className="required-badge">Obbligatorio</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="placeholder-text">Nessun ruolo definito</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="tasks-tab">
                                <div className="tab-header">
                                    <h3>Task Template</h3>
                                    <button className="btn-add-small">
                                        <Plus size={14} />
                                        Aggiungi Task
                                    </button>
                                </div>
                                
                                {selectedTemplate.tasks && selectedTemplate.tasks.length > 0 ? (
                                    <div className="tasks-list">
                                        {selectedTemplate.tasks.map((task, index) => (
                                            <div key={task.id} className="task-item">
                                                <div className="task-number">{index + 1}</div>
                                                <div className="task-content">
                                                    <div className="task-header">
                                                        <h4>{task.title}</h4>
                                                        <span className={`priority-badge ${task.priority}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                    {task.description && (
                                                        <p className="task-description">{task.description}</p>
                                                    )}
                                                    <div className="task-meta">
                                                        {task.role_code && (
                                                            <span className="meta-item">
                                                                <UsersIcon size={12} />
                                                                {task.role_code}
                                                            </span>
                                                        )}
                                                        <span className="meta-item">
                                                            Inizio: +{task.start_offset_days}g
                                                        </span>
                                                        <span className="meta-item">
                                                            Scadenza: +{task.due_offset_days}g
                                                        </span>
                                                        {task.estimated_hours && (
                                                            <span className="meta-item">
                                                                {task.estimated_hours}h stimate
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="placeholder-text">Nessuna task definita</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'create' && (
                <>
                    <div className="detail-header">
                        <button className="btn-back" onClick={() => setView('list')}>
                            ← Torna ai Template
                        </button>
                        <h1>Crea Nuovo Template</h1>
                    </div>

                    <div className="create-form">
                        <p className="placeholder-text">Form creazione template in arrivo...</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default TemplateAdmin;

