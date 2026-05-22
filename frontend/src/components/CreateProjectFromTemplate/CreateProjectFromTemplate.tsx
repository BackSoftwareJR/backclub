import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { createProjectFromTemplate, type ProjectTemplate, type RoleAssignment } from '../../api/projectTemplates';
import './CreateProjectFromTemplate.css';

interface CreateProjectFromTemplateProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    template: ProjectTemplate;
    preselectedCrmId?: number;
}

const CreateProjectFromTemplate: React.FC<CreateProjectFromTemplateProps> = ({
    isOpen,
    onClose,
    onSuccess,
    template,
    preselectedCrmId
}) => {
    const [step, setStep] = useState<'info' | 'roles' | 'preview'>(template.has_tasks ? 'info' : 'info');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        client_id: '',
        manager_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        budget: '',
    });

    // Role assignments
    const [roleAssignments, setRoleAssignments] = useState<Record<string, number>>({});

    // Options
    const [clients, setClients] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadOptions();
            resetForm();
        }
    }, [isOpen, template]);

    const loadOptions = async () => {
        try {
            const [clientsRes, usersRes] = await Promise.all([
                projectsApi.getAvailableClients(),
                projectsApi.getAvailableUsers(),
            ]);
            
            setClients(clientsRes.data);
            setUsers(usersRes.data);
        } catch (err: any) {
            console.error('Error loading options:', err);
            setError('Errore nel caricamento delle opzioni');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            client_id: '',
            manager_id: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            description: '',
            status: 'planning',
            priority: 'medium',
            budget: '',
        });
        setRoleAssignments({});
        setStep('info');
        setError(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleAssignment = (roleCode: string, userId: number) => {
        setRoleAssignments(prev => ({ ...prev, [roleCode]: userId }));
    };

    const validateStep = (currentStep: string): boolean => {
        if (currentStep === 'info') {
            if (!formData.name.trim()) {
                setError('Nome progetto obbligatorio');
                return false;
            }
            if (!formData.client_id) {
                setError('Cliente obbligatorio');
                return false;
            }
            if (!formData.manager_id) {
                setError('Project Manager obbligatorio');
                return false;
            }
            if (!formData.start_date) {
                setError('Data inizio obbligatoria');
                return false;
            }
        }

        if (currentStep === 'roles' && template.roles) {
            const requiredRoles = template.roles.filter(r => r.is_required);
            for (const role of requiredRoles) {
                if (!roleAssignments[role.role_code]) {
                    setError(`Ruolo obbligatorio non assegnato: ${role.role_name}`);
                    return false;
                }
            }
        }

        setError(null);
        return true;
    };

    const handleNext = () => {
        if (!validateStep(step)) return;

        if (step === 'info') {
            setStep(template.has_tasks ? 'roles' : 'preview');
        } else if (step === 'roles') {
            setStep('preview');
        }
    };

    const handleBack = () => {
        setError(null);
        if (step === 'preview') {
            setStep(template.has_tasks ? 'roles' : 'info');
        } else if (step === 'roles') {
            setStep('info');
        }
    };

    const handleSubmit = async () => {
        if (!validateStep('roles')) return;

        try {
            setLoading(true);
            setError(null);

            // Prepara role assignments
            const assignments: RoleAssignment[] = Object.entries(roleAssignments).map(([role_code, user_id]) => ({
                role_code,
                user_id,
            }));

            const dataToSend: any = {
                name: formData.name,
                client_id: parseInt(formData.client_id),
                manager_id: parseInt(formData.manager_id),
                start_date: formData.start_date,
                status: formData.status,
                priority: formData.priority,
                role_assignments: assignments,
            };

            if (preselectedCrmId) {
                dataToSend.crm_department_id = preselectedCrmId;
            }
            if (formData.description) dataToSend.description = formData.description;
            if (formData.end_date) dataToSend.end_date = formData.end_date;
            if (formData.budget) dataToSend.budget = parseFloat(formData.budget);

            console.log('Creating project from template:', dataToSend);

            const result = await createProjectFromTemplate(template.id, dataToSend);

            console.log('Project created:', result);

            alert(`Progetto creato con successo!\n\n✅ ${result.tasks?.length || 0} task create e assegnate automaticamente!`);

            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error creating project:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    // Calculate estimated end date based on template duration
    const estimatedEndDate = formData.start_date ? 
        new Date(new Date(formData.start_date).getTime() + template.default_duration_days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0] : '';

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-template-wizard" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2>Crea Progetto da Template</h2>
                        <p className="template-name">{template.name}</p>
                    </div>
                    <button className="btn-close-modal" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="wizard-steps">
                    <div className={`step ${step === 'info' ? 'active' : step === 'roles' || step === 'preview' ? 'completed' : ''}`}>
                        <div className="step-number">1</div>
                        <span>Info Progetto</span>
                    </div>
                    {template.has_tasks && (
                        <div className={`step ${step === 'roles' ? 'active' : step === 'preview' ? 'completed' : ''}`}>
                            <div className="step-number">2</div>
                            <span>Assegna Ruoli</span>
                        </div>
                    )}
                    <div className={`step ${step === 'preview' ? 'active' : ''}`}>
                        <div className="step-number">{template.has_tasks ? '3' : '2'}</div>
                        <span>Conferma</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="modal-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Content */}
                <div className="wizard-content">
                    {/* Step 1: Info */}
                    {step === 'info' && (
                        <div className="wizard-step">
                            <h3>Informazioni Progetto</h3>
                            
                            <div className="form-group">
                                <label>Nome Progetto *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Es: Campagna Spot Casa Famiglia"
                                    autoFocus
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cliente *</label>
                                    <select
                                        name="client_id"
                                        value={formData.client_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">Seleziona cliente</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.company_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Project Manager *</label>
                                    <select
                                        name="manager_id"
                                        value={formData.manager_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">Seleziona PM</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data Inizio *</label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                    />
                                    <p className="field-hint">
                                        Tutte le date delle task saranno calcolate da questa data
                                    </p>
                                </div>

                                <div className="form-group">
                                    <label>Data Fine Stimata</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date || estimatedEndDate}
                                        onChange={handleChange}
                                        min={formData.start_date}
                                    />
                                    <p className="field-hint">
                                        Suggerita: {template.default_duration_days} giorni
                                    </p>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="planning">Pianificazione</option>
                                        <option value="active">Attivo</option>
                                    </select>
                                </div>

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

                            <div className="form-group">
                                <label>Descrizione</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Descrizione del progetto..."
                                    rows={3}
                                />
                            </div>

                            {template.has_tasks && (
                                <div className="info-box">
                                    <Check size={16} />
                                    <span>
                                        Questo template include <strong>{template.tasks_count} task automatiche</strong> che saranno create e assegnate automaticamente.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Roles (solo se template ha task) */}
                    {step === 'roles' && template.roles && (
                        <div className="wizard-step">
                            <h3>Assegna Membri del Team ai Ruoli</h3>
                            <p className="step-description">
                                Assegna un membro del team per ogni ruolo. Le task saranno assegnate automaticamente in base a questi ruoli.
                            </p>

                            <div className="roles-assignment-list">
                                {template.roles.map(role => (
                                    <div key={role.id} className="role-assignment-item">
                                        <div className="role-info">
                                            <div className="role-name">
                                                {role.role_name}
                                                {role.is_required && <span className="required-star">*</span>}
                                            </div>
                                            <div className="role-code">{role.role_code}</div>
                                            <div className="role-tasks-count">
                                                {template.tasks?.filter(t => t.role_code === role.role_code).length || 0} task assegnate
                                            </div>
                                        </div>
                                        <div className="role-select">
                                            <select
                                                value={roleAssignments[role.role_code] || ''}
                                                onChange={(e) => handleRoleAssignment(role.role_code, parseInt(e.target.value))}
                                                required={role.is_required}
                                            >
                                                <option value="">Seleziona utente</option>
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && (
                        <div className="wizard-step">
                            <h3>Riepilogo e Conferma</h3>

                            <div className="preview-section">
                                <h4>Informazioni Progetto</h4>
                                <div className="preview-grid">
                                    <div className="preview-item">
                                        <label>Nome:</label>
                                        <span>{formData.name}</span>
                                    </div>
                                    <div className="preview-item">
                                        <label>Cliente:</label>
                                        <span>{clients.find(c => c.id === parseInt(formData.client_id))?.company_name}</span>
                                    </div>
                                    <div className="preview-item">
                                        <label>Project Manager:</label>
                                        <span>{users.find(u => u.id === parseInt(formData.manager_id))?.name}</span>
                                    </div>
                                    <div className="preview-item">
                                        <label>Data Inizio:</label>
                                        <span>{new Date(formData.start_date).toLocaleDateString('it-IT')}</span>
                                    </div>
                                    {formData.end_date && (
                                        <div className="preview-item">
                                            <label>Data Fine:</label>
                                            <span>{new Date(formData.end_date).toLocaleDateString('it-IT')}</span>
                                        </div>
                                    )}
                                    {formData.budget && (
                                        <div className="preview-item">
                                            <label>Budget:</label>
                                            <span>€{parseFloat(formData.budget).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {template.roles && template.roles.length > 0 && (
                                <div className="preview-section">
                                    <h4>Assegnazioni Ruoli</h4>
                                    <div className="preview-roles-list">
                                        {template.roles.map(role => (
                                            <div key={role.id} className="preview-role-item">
                                                <span className="role-label">{role.role_name}</span>
                                                <ArrowRight size={16} />
                                                <span className="user-label">
                                                    {roleAssignments[role.role_code] 
                                                        ? users.find(u => u.id === roleAssignments[role.role_code])?.name 
                                                        : 'Non assegnato'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {template.tasks && template.tasks.length > 0 && (
                                <div className="preview-section">
                                    <h4>Task che saranno create ({template.tasks.length})</h4>
                                    <div className="preview-tasks-summary">
                                        <p>
                                            Il sistema creerà automaticamente <strong>{template.tasks.length} task</strong> con:
                                        </p>
                                        <ul>
                                            <li>✅ Date calcolate automaticamente</li>
                                            <li>✅ Assegnazioni ai membri del team</li>
                                            <li>✅ Priorità pre-configurate</li>
                                            <li>✅ Ore stimate incluse</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="wizard-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={step === 'info' ? handleClose : handleBack}
                        disabled={loading}
                    >
                        {step === 'info' ? (
                            <>
                                <X size={16} />
                                Annulla
                            </>
                        ) : (
                            <>
                                <ArrowLeft size={16} />
                                Indietro
                            </>
                        )}
                    </button>

                    {step === 'preview' ? (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Creazione...' : (
                                <>
                                    <Check size={16} />
                                    Crea Progetto {template.has_tasks && `+ ${template.tasks_count} Task`}
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleNext}
                            disabled={loading}
                        >
                            Avanti
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateProjectFromTemplate;

