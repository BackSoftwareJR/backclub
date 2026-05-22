import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createCrmDepartment, updateCrmDepartment, type CrmDepartment } from '../../api/crmDepartments';
import './CrmDepartmentModal.css';

interface CrmDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    department?: CrmDepartment | null;
}

// Lista di icone disponibili da lucide-react
const AVAILABLE_ICONS = [
    { value: 'Briefcase', label: 'Briefcase' },
    { value: 'FileText', label: 'FileText' },
    { value: 'Users', label: 'Users' },
    { value: 'Home', label: 'Home' },
    { value: 'Globe', label: 'Globe' },
    { value: 'Database', label: 'Database' },
    { value: 'BookOpen', label: 'BookOpen' },
    { value: 'UserCheck', label: 'UserCheck' },
    { value: 'Video', label: 'Video' },
    { value: 'Wifi', label: 'Wifi' },
    { value: 'BarChart3', label: 'BarChart3' },
    { value: 'FolderKanban', label: 'FolderKanban' },
    { value: 'Settings', label: 'Settings' },
    { value: 'TrendingUp', label: 'TrendingUp' },
    { value: 'Mail', label: 'Mail' },
    { value: 'ShoppingCart', label: 'ShoppingCart' },
    { value: 'Calendar', label: 'Calendar' },
    { value: 'Clock', label: 'Clock' },
    { value: 'DollarSign', label: 'DollarSign' },
    { value: 'Target', label: 'Target' },
];

const CrmDepartmentModal: React.FC<CrmDepartmentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    department
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        color: '#0A84FF',
        icon: 'Briefcase',
        budget_allocated: '0',
        manager_id: '',
        is_active: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (department) {
                // Modifica
                setFormData({
                    code: department.code,
                    name: department.name,
                    description: department.description || '',
                    color: department.color || '#0A84FF',
                    icon: department.icon || 'Briefcase',
                    budget_allocated: department.budget_allocated?.toString() || '0',
                    manager_id: department.manager_id?.toString() || '',
                    is_active: department.is_active ?? true,
                });
            } else {
                // Creazione
                setFormData({
                    code: '',
                    name: '',
                    description: '',
                    color: '#0A84FF',
                    icon: 'Briefcase',
                    budget_allocated: '0',
                    manager_id: '',
                    is_active: true,
                });
            }
            setError(null);
        }
    }, [isOpen, department]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!formData.code.trim()) errors.push('Codice obbligatorio');
        if (!formData.name.trim()) errors.push('Nome obbligatorio');
        if (formData.code.length > 50) errors.push('Codice troppo lungo (max 50 caratteri)');
        if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) errors.push('Colore non valido (formato: #RRGGBB)');

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
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                color: formData.color,
                icon: formData.icon || null,
                budget_allocated: parseFloat(formData.budget_allocated) || 0,
                is_active: formData.is_active,
            };

            if (formData.manager_id) {
                dataToSend.manager_id = parseInt(formData.manager_id);
            } else {
                dataToSend.manager_id = null;
            }

            if (department) {
                // Modifica
                await updateCrmDepartment(department.code, dataToSend);
            } else {
                // Creazione
                await createCrmDepartment(dataToSend);
            }
            
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error saving CRM department:', err);
            setError(err || 'Errore nel salvataggio del CRM department');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            color: '#0A84FF',
            icon: 'Briefcase',
            budget_allocated: '0',
            manager_id: '',
            is_active: true,
        });
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-crm-department" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>{department ? 'Modifica CRM Department' : 'Nuovo CRM Department'}</h2>
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
                                <label>Codice *</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="Es: MARKETING"
                                    required
                                    maxLength={50}
                                    disabled={!!department}
                                    style={{ textTransform: 'uppercase' }}
                                />
                                <p className="field-hint">
                                    {department 
                                        ? 'Il codice non può essere modificato' 
                                        : 'Codice univoco per identificare il CRM (max 50 caratteri)'}
                                </p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Es: Marketing e Comunicazione"
                                    required
                                    maxLength={255}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Descrizione</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Descrizione del CRM department..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="form-section">
                        <h3>Aspetto</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Colore *</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        name="color"
                                        value={formData.color}
                                        onChange={handleChange}
                                        style={{ width: '60px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                                    />
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => {
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                                                setFormData(prev => ({ ...prev, color: e.target.value }));
                                            }
                                        }}
                                        placeholder="#0A84FF"
                                        style={{ flex: 1, maxWidth: '120px' }}
                                    />
                                </div>
                                <p className="field-hint">
                                    Colore utilizzato per identificare il CRM nell'interfaccia
                                </p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Icona</label>
                                <select
                                    name="icon"
                                    value={formData.icon}
                                    onChange={handleChange}
                                >
                                    {AVAILABLE_ICONS.map(icon => (
                                        <option key={icon.value} value={icon.value}>
                                            {icon.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="field-hint">
                                    Icona Lucide React da utilizzare per il CRM
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Budget & Settings */}
                    <div className="form-section">
                        <h3>Budget e Impostazioni</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Budget Allocato</label>
                                <input
                                    type="number"
                                    name="budget_allocated"
                                    value={formData.budget_allocated}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                                <p className="field-hint">
                                    Budget iniziale allocato al CRM (in euro)
                                </p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Manager</label>
                                <input
                                    type="number"
                                    name="manager_id"
                                    value={formData.manager_id}
                                    onChange={handleChange}
                                    placeholder="ID Utente (opzionale)"
                                    min="1"
                                />
                                <p className="field-hint">
                                    ID dell'utente che gestisce questo CRM (opzionale)
                                </p>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group checkbox-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                    />
                                    <span>CRM Attivo</span>
                                </label>
                                <p className="field-hint">
                                    I CRM non attivi non verranno mostrati nella lista principale
                                </p>
                            </div>
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
                            {loading ? 'Salvataggio...' : (department ? 'Aggiorna CRM' : 'Crea CRM')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CrmDepartmentModal;

