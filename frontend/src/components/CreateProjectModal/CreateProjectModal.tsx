import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, AlertCircle } from 'lucide-react';
import { projectsApi, type ProjectType } from '../../api/projects';
import { getTemplates, type ProjectTemplate } from '../../api/projectTemplates';
import CreateProjectFromTemplate from '../CreateProjectFromTemplate/CreateProjectFromTemplate';
import type { Client } from '../../api/projects';
import './CreateProjectModal.css';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    preselectedCrmId?: number;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    preselectedCrmId 
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        project_type_id: '',
        client_id: '',
        crm_department_id: preselectedCrmId?.toString() || '',
        manager_id: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: '',
        contratto_url: '',
        link_foto_video: '',
        link_cartella_documenti: '',
        link_cartella_social: '',
        link_cartella_credenziali: '',
    });

    // Options
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
    const [showTemplateWizard, setShowTemplateWizard] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadOptions();
            if (preselectedCrmId) {
                setFormData(prev => ({ ...prev, crm_department_id: preselectedCrmId.toString() }));
            }
        }
    }, [isOpen, preselectedCrmId]);

    const loadOptions = async () => {
        try {
            const [typesRes, templatesRes, clientsRes, usersRes] = await Promise.all([
                projectsApi.getProjectTypes(),
                getTemplates({ active_only: true }),
                projectsApi.getAvailableClients(),
                projectsApi.getAvailableUsers(),
            ]);
            
            setProjectTypes(typesRes.data);
            setTemplates(templatesRes);
            setClients(clientsRes.data);
            setUsers(usersRes.data);
        } catch (err: any) {
            console.error('Error loading options:', err);
            setError('Errore nel caricamento delle opzioni');
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = parseInt(e.target.value);
        const template = templates.find(t => t.id === templateId);
        
        if (template && template.has_tasks) {
            // Se il template ha task, apri il wizard
            setSelectedTemplate(template);
            setShowTemplateWizard(true);
        } else {
            // Altrimenti continua con il form normale
            setSelectedTemplate(template || null);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!formData.name.trim()) errors.push('Nome progetto obbligatorio');
        if (!formData.project_type_id) errors.push('Tipo progetto obbligatorio');
        if (!formData.client_id) errors.push('Cliente obbligatorio');
        if (!formData.manager_id) errors.push('Project Manager obbligatorio');
        if (!formData.start_date) errors.push('Data inizio obbligatoria');

        if (errors.length > 0) {
            setError(errors.join(', '));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError(null);

            const dataToSend: any = {
                name: formData.name,
                project_type_id: parseInt(formData.project_type_id),
                client_id: parseInt(formData.client_id),
                manager_id: parseInt(formData.manager_id),
                status: formData.status,
                priority: formData.priority,
                start_date: formData.start_date,
            };

            if (formData.crm_department_id) {
                dataToSend.crm_department_id = parseInt(formData.crm_department_id);
            }
            if (formData.description) dataToSend.description = formData.description;
            if (formData.end_date) dataToSend.end_date = formData.end_date;
            if (formData.budget) dataToSend.budget = parseFloat(formData.budget);
            if (formData.contratto_url) dataToSend.contratto_url = formData.contratto_url;
            if (formData.link_foto_video) dataToSend.link_foto_video = formData.link_foto_video;
            if (formData.link_cartella_documenti) dataToSend.link_cartella_documenti = formData.link_cartella_documenti;
            if (formData.link_cartella_social) dataToSend.link_cartella_social = formData.link_cartella_social;
            if (formData.link_cartella_credenziali) dataToSend.link_cartella_credenziali = formData.link_cartella_credenziali;

            await projectsApi.create(dataToSend);
            
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error creating project:', err);
            setError(err.response?.data?.message || 'Errore nella creazione del progetto');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            project_type_id: '',
            client_id: '',
            crm_department_id: preselectedCrmId?.toString() || '',
            manager_id: '',
            description: '',
            status: 'planning',
            priority: 'medium',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            budget: '',
            contratto_url: '',
            link_foto_video: '',
            link_cartella_documenti: '',
            link_cartella_social: '',
            link_cartella_credenziali: '',
        });
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-create-project" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Crea Nuovo Progetto</h2>
                    <button className="btn-close-modal" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="modal-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>Informazioni Base</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Template Progetto</label>
                                <select
                                    onChange={handleTemplateChange}
                                    value={selectedTemplate?.id || ''}
                                >
                                    <option value="">Nessun template (progetto custom)</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.name} {template.has_tasks && `(${template.tasks_count} task)`}
                                        </option>
                                    ))}
                                </select>
                                <p className="field-hint">
                                    {selectedTemplate?.has_tasks 
                                        ? '⚡ Questo template creerà automaticamente le task' 
                                        : 'Seleziona un template per velocizzare la creazione'}
                                </p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Nome Progetto *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Es: Sito Web Aziendale"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Tipo Progetto *</label>
                                <select
                                    name="project_type_id"
                                    value={formData.project_type_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Seleziona tipo</option>
                                    {projectTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Cliente *</label>
                                <select
                                    name="client_id"
                                    value={formData.client_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Seleziona cliente</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Project Manager *</label>
                                <select
                                    name="manager_id"
                                    value={formData.manager_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Seleziona PM</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Stato</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="planning">Pianificazione</option>
                                    <option value="active">Attivo</option>
                                    <option value="on_hold">In Pausa</option>
                                    <option value="completed">Completato</option>
                                    <option value="cancelled">Annullato</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Priorità</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <option value="low">Bassa</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Budget (€)</label>
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    placeholder="10000"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descrizione</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Descrizione dettagliata del progetto..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="form-section">
                        <h3><Calendar size={18} /> Timeline</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Inizio *</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Data Fine</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    min={formData.start_date}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="form-section">
                        <h3><FileText size={18} /> Link e Risorse</h3>
                        
                        <div className="form-group">
                            <label>Link Contratto</label>
                            <input
                                type="url"
                                name="contratto_url"
                                value={formData.contratto_url}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Cartella Documenti</label>
                            <input
                                type="url"
                                name="link_cartella_documenti"
                                value={formData.link_cartella_documenti}
                                onChange={handleChange}
                                placeholder="https://drive.google.com/..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Cartella Foto/Video</label>
                            <input
                                type="url"
                                name="link_foto_video"
                                value={formData.link_foto_video}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Cartella Social</label>
                            <input
                                type="url"
                                name="link_cartella_social"
                                value={formData.link_cartella_social}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Cartella Credenziali</label>
                            <input
                                type="url"
                                name="link_cartella_credenziali"
                                value={formData.link_cartella_credenziali}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Annulla
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creazione...' : 'Crea Progetto'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Template Wizard */}
            {showTemplateWizard && selectedTemplate && (
                <CreateProjectFromTemplate
                    isOpen={showTemplateWizard}
                    onClose={() => {
                        setShowTemplateWizard(false);
                        setSelectedTemplate(null);
                    }}
                    onSuccess={() => {
                        onSuccess();
                        handleClose();
                    }}
                    template={selectedTemplate}
                    preselectedCrmId={preselectedCrmId}
                />
            )}
        </div>
    );
};

export default CreateProjectModal;

