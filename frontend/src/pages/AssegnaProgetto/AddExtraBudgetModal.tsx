import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { getCrmDepartments, type CrmDepartment } from '../../api/crmDepartments';
import apiClient from '../../api/client';
import './AddExtraBudgetModal.css';

interface ExtraBudgetItem {
    crm_id: number;
    crm_name: string;
    amount: number;
}

interface AddExtraBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: number;
}

const AddExtraBudgetModal: React.FC<AddExtraBudgetModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    projectId,
}) => {
    const [loading, setLoading] = useState(false);
    const [crmList, setCrmList] = useState<CrmDepartment[]>([]);
    const [selectedCrms, setSelectedCrms] = useState<Record<number, boolean>>({});
    const [budgetAmounts, setBudgetAmounts] = useState<Record<number, number>>({});
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadCrmList();
        }
    }, [isOpen]);

    const loadCrmList = async () => {
        try {
            setLoading(true);
            const crms = await getCrmDepartments(true);
            // Escludi "CRM Project" (id 2)
            setCrmList(crms.filter(crm => crm.id !== 2));
        } catch (err: any) {
            console.error('Error loading CRM list:', err);
            setError('Errore nel caricamento dei CRM');
        } finally {
            setLoading(false);
        }
    };

    const handleCrmToggle = (crmId: number) => {
        setSelectedCrms(prev => ({
            ...prev,
            [crmId]: !prev[crmId],
        }));
        // Se deselezionato, rimuovi anche l'importo
        if (selectedCrms[crmId]) {
            setBudgetAmounts(prev => {
                const newAmounts = { ...prev };
                delete newAmounts[crmId];
                return newAmounts;
            });
        }
    };

    const handleAmountChange = (crmId: number, amount: number) => {
        setBudgetAmounts(prev => ({
            ...prev,
            [crmId]: Math.max(0, amount),
        }));
    };

    const handleSubmit = async () => {
        // Validazione
        const selectedCrmIds = Object.keys(selectedCrms).filter(id => selectedCrms[Number(id)]);
        if (selectedCrmIds.length === 0) {
            setError('Seleziona almeno un CRM');
            return;
        }

        for (const crmId of selectedCrmIds) {
            const amount = budgetAmounts[Number(crmId)] || 0;
            if (amount <= 0) {
                setError(`Inserisci un importo valido per ${crmList.find(c => c.id === Number(crmId))?.name}`);
                return;
            }
            
            const crm = crmList.find(c => c.id === Number(crmId));
            if (crm && amount > crm.budget_remaining) {
                setError(`L'importo per ${crm.name} (€ ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}) supera il budget disponibile (€ ${crm.budget_remaining.toLocaleString('it-IT', { minimumFractionDigits: 2 })})`);
                return;
            }
        }

        if (!reason.trim()) {
            setError('Inserisci una motivazione');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const budgetItems: ExtraBudgetItem[] = selectedCrmIds.map(crmId => {
                const crm = crmList.find(c => c.id === Number(crmId))!;
                return {
                    crm_id: Number(crmId),
                    crm_name: crm.name,
                    amount: budgetAmounts[Number(crmId)] || 0,
                };
            });

            await apiClient.post(`/crm-projects/${projectId}/add-extra-budget`, {
                budget_items: budgetItems,
                reason: reason.trim(),
            });

            onSuccess();
            onClose();
            // Reset form
            setSelectedCrms({});
            setBudgetAmounts({});
            setReason('');
        } catch (err: any) {
            console.error('Error adding extra budget:', err);
            setError(err.response?.data?.message || 'Errore nell\'aggiunta del budget extra');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectedCount = Object.keys(selectedCrms).filter(id => selectedCrms[Number(id)]).length;
    const totalExtraBudget = Object.keys(budgetAmounts).reduce((sum, crmId) => {
        return sum + (budgetAmounts[Number(crmId)] || 0);
    }, 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-extra-budget-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Aggiungi Budget Extra</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content">
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 className="spinner" size={32} />
                            <p>Caricamento CRM...</p>
                        </div>
                    ) : error && !submitting ? (
                        <div className="error-message">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    ) : (
                        <>
                            <div className="info-section">
                                <p className="info-text">
                                    Seleziona uno o più CRM da cui prelevare budget extra per questo progetto.
                                    Verifica che ogni CRM abbia budget disponibile sufficiente.
                                </p>
                            </div>

                            <div className="crm-selection-list">
                                {crmList.map(crm => {
                                    const isSelected = selectedCrms[crm.id] || false;
                                    const budgetRemaining = crm.budget_remaining || 0;
                                    const amount = budgetAmounts[crm.id] || 0;

                                    return (
                                        <div key={crm.id} className={`crm-budget-item ${isSelected ? 'selected' : ''}`}>
                                            <div className="crm-item-header">
                                                <label className="crm-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCrmToggle(crm.id)}
                                                    />
                                                    <span className="crm-name">{crm.name}</span>
                                                </label>
                                                <div className="crm-budget-info">
                                                    <span className="budget-label">Budget Disponibile:</span>
                                                    <span className={`budget-remaining ${budgetRemaining <= 0 ? 'insufficient' : ''}`}>
                                                        € {budgetRemaining.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="crm-amount-input">
                                                    <label>
                                                        Importo da prelevare:
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={budgetRemaining}
                                                            step="0.01"
                                                            value={amount || ''}
                                                            onChange={(e) => handleAmountChange(crm.id, parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                        />
                                                        <span className="currency">€</span>
                                                    </label>
                                                    {amount > budgetRemaining && (
                                                        <span className="error-text">
                                                            Importo superiore al budget disponibile
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedCount > 0 && (
                                <div className="budget-summary">
                                    <div className="summary-row">
                                        <span>Totale Budget Extra:</span>
                                        <span className="total-amount">
                                            € {totalExtraBudget.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="reason-section">
                                <label>
                                    Motivazione *
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Spiega perché stai aggiungendo budget extra a questo progetto..."
                                        rows={4}
                                    />
                                </label>
                            </div>

                            {error && submitting && (
                                <div className="error-message">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={submitting}>
                        Annulla
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || selectedCount === 0 || !reason.trim()}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="spinner" size={16} />
                                Aggiunta in corso...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                Aggiungi Budget
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddExtraBudgetModal;

