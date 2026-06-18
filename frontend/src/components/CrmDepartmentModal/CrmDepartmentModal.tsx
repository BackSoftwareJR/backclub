import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createCrmDepartment, updateCrmDepartment, type CrmDepartment } from '../../api/crmDepartments';
import './CrmDepartmentModal.css';

interface CrmDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    department?: CrmDepartment | null;
}

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

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const containerVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 8 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
};

const transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

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
        color: '#3b82f6',
        icon: 'Briefcase',
        budget_allocated: '0',
        manager_id: '',
        is_active: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (department) {
                setFormData({
                    code: department.code,
                    name: department.name,
                    description: department.description || '',
                    color: department.color || '#3b82f6',
                    icon: department.icon || 'Briefcase',
                    budget_allocated: department.budget_allocated?.toString() || '0',
                    manager_id: department.manager_id?.toString() || '',
                    is_active: department.is_active ?? true,
                });
            } else {
                setFormData({
                    code: '',
                    name: '',
                    description: '',
                    color: '#3b82f6',
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

            const dataToSend = {
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                color: formData.color,
                icon: formData.icon || undefined,
                budget_allocated: parseFloat(formData.budget_allocated) || 0,
                is_active: formData.is_active,
                manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
            };

            if (department) {
                await updateCrmDepartment(department.code, dataToSend);
            } else {
                await createCrmDepartment(dataToSend);
            }

            onSuccess();
            handleClose();
        } catch (err: unknown) {
            console.error('Error saving CRM department:', err);
            setError(String(err) || 'Errore nel salvataggio del CRM department');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            color: '#3b82f6',
            icon: 'Briefcase',
            budget_allocated: '0',
            manager_id: '',
            is_active: true,
        });
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="cdm-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={transition}
                    onClick={handleClose}
                >
                    <motion.div
                        className="modal-crm-department"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={transition}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="cdm-header">
                            <h2>{department ? 'Modifica CRM Department' : 'Nuovo CRM Department'}</h2>
                            <button className="cdm-close" onClick={handleClose} aria-label="Chiudi">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="cdm-error">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="cdm-form">
                            {/* Informazioni Base */}
                            <div className="cdm-section">
                                <h3 className="cdm-section-title">Informazioni Base</h3>

                                <div className="cdm-row">
                                    <div className="cdm-group">
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
                                        <p className="cdm-hint">
                                            {department
                                                ? 'Il codice non può essere modificato'
                                                : 'Codice univoco per identificare il CRM (max 50 caratteri)'}
                                        </p>
                                    </div>
                                </div>

                                <div className="cdm-row">
                                    <div className="cdm-group">
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

                                <div className="cdm-row">
                                    <div className="cdm-group">
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

                            {/* Aspetto */}
                            <div className="cdm-section">
                                <h3 className="cdm-section-title">Aspetto</h3>

                                <div className="cdm-row">
                                    <div className="cdm-group">
                                        <label>Colore *</label>
                                        <div className="cdm-color-row">
                                            <input
                                                type="color"
                                                name="color"
                                                value={formData.color}
                                                onChange={handleChange}
                                                className="cdm-color-swatch"
                                            />
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={(e) => {
                                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                                                        setFormData(prev => ({ ...prev, color: e.target.value }));
                                                    }
                                                }}
                                                placeholder="#3b82f6"
                                                className="cdm-group cdm-color-input"
                                                style={{ padding: '10px 12px', background: 'var(--seller-bg-overlay)', border: '1px solid var(--seller-border)', borderRadius: 'var(--seller-radius-sm)', color: 'var(--seller-text-primary)', fontSize: 'var(--seller-font-sm)', outline: 'none' }}
                                            />
                                        </div>
                                        <p className="cdm-hint">
                                            Colore utilizzato per identificare il CRM nell'interfaccia
                                        </p>
                                    </div>
                                </div>

                                <div className="cdm-row">
                                    <div className="cdm-group">
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
                                        <p className="cdm-hint">
                                            Icona Lucide React da utilizzare per il CRM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Budget e Impostazioni */}
                            <div className="cdm-section">
                                <h3 className="cdm-section-title">Budget e Impostazioni</h3>

                                <div className="cdm-row">
                                    <div className="cdm-group">
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
                                        <p className="cdm-hint">
                                            Budget iniziale allocato al CRM (in euro)
                                        </p>
                                    </div>
                                </div>

                                <div className="cdm-row">
                                    <div className="cdm-group">
                                        <label>Manager</label>
                                        <input
                                            type="number"
                                            name="manager_id"
                                            value={formData.manager_id}
                                            onChange={handleChange}
                                            placeholder="ID Utente (opzionale)"
                                            min="1"
                                        />
                                        <p className="cdm-hint">
                                            ID dell'utente che gestisce questo CRM (opzionale)
                                        </p>
                                    </div>
                                </div>

                                <div className="cdm-row">
                                    <div className="cdm-group">
                                        <label className="cdm-checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleChange}
                                            />
                                            <span>CRM Attivo</span>
                                        </label>
                                        <p className="cdm-hint">
                                            I CRM non attivi non verranno mostrati nella lista principale
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="cdm-actions">
                                <button
                                    type="button"
                                    className="cdm-btn-secondary"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="cdm-btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Salvataggio...' : (department ? 'Aggiorna CRM' : 'Crea CRM')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CrmDepartmentModal;
