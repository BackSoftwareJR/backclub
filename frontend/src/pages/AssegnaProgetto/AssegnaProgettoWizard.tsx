import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    AlertCircle,
    Loader2,
    Plus
} from 'lucide-react';
import { crmProjectsApi, type CrmProject } from '../../api/crmProjects';
import { getCrmDepartments, type CrmDepartment } from '../../api/crmDepartments';
import { updateClient, type CreateClientData } from '../../api/clients';
import apiClient from '../../api/client';
import ClientInfoStep from './ClientInfoStep';
import AddExtraBudgetModal from './AddExtraBudgetModal';
import './AssegnaProgettoWizard.css';

type Step = 0 | 1 | 2 | 3;

interface AssignmentData {
    invoiceTotal: number;
    sellerCommission: number;
    sellerCommissionRate: number;
    seller?: {
        id: number;
        user_id: number;
        commission_rate: number;
        is_active: boolean;
        user?: {
            id: number;
            name: string;
            email: string;
        };
    } | null;
    reserves: Array<{
        id: number;
        name: string;
        percentage: number;
        amount: number;
        enabled: boolean;
    }>;
    availableBudget: number;
    client: CreateClientData | null;
}

interface SelectedCrm {
    crm_id: number;
    description: string;
    manager_id: number | null;
}

const AssegnaProgettoWizard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<Step>(0);
    const [project, setProject] = useState<CrmProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Step 0: Client Info
    const [clientData, setClientData] = useState<CreateClientData | null>(null);
    
    // Step 1: Financial Plan
    const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
    const [selectedReserves, setSelectedReserves] = useState<Record<number, boolean>>({});
    const [reservePercentages, setReservePercentages] = useState<Record<number, number>>({});
    const [showExtraBudgetModal, setShowExtraBudgetModal] = useState(false);
    const [extraBudgetTotal, setExtraBudgetTotal] = useState(0);
    
    // Step 2: CRM Selection
    const [availableCrms, setAvailableCrms] = useState<CrmDepartment[]>([]);
    const [selectedCrms, setSelectedCrms] = useState<SelectedCrm[]>([]);
    
    // Step 3: Project Managers
    const [availableManagers, setAvailableManagers] = useState<any[]>([]);
    
    // Submission
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            loadProjectData();
        }
    }, [id]);

    const loadProjectData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Carica progetto
            const projectResponse = await crmProjectsApi.getById(Number(id));
            setProject(projectResponse.data);
            
            // Calcola il totale del budget extra dai settings
            if (projectResponse.data.settings?.extra_budget) {
                const total = projectResponse.data.settings.extra_budget.reduce(
                    (sum: number, item: any) => sum + (item.amount || 0),
                    0
                );
                setExtraBudgetTotal(total);
            } else {
                setExtraBudgetTotal(0);
            }
            
            // Carica dati per assegnazione
            const assignmentResponse = await apiClient.get(`/crm-projects/${id}/assignment-data`);
            const assignmentDataResponse = assignmentResponse.data.data;
            
            // Debug: log dei dati ricevuti
            console.log('=== Assignment Data Response ===');
            console.log('Full response:', assignmentDataResponse);
            console.log('invoice_total:', assignmentDataResponse.invoice_total);
            console.log('invoiceTotal:', assignmentDataResponse.invoiceTotal);
            console.log('seller_commission:', assignmentDataResponse.seller_commission);
            console.log('sellerCommission:', assignmentDataResponse.sellerCommission);
            
            // Converti snake_case a camelCase se necessario
            const convertedData = {
                ...assignmentDataResponse,
                invoiceTotal: assignmentDataResponse.invoice_total ?? assignmentDataResponse.invoiceTotal ?? 0,
                sellerCommission: assignmentDataResponse.seller_commission ?? assignmentDataResponse.sellerCommission ?? 0,
                sellerCommissionRate: assignmentDataResponse.seller_commission_rate ?? assignmentDataResponse.sellerCommissionRate ?? 0,
            };
            
            console.log('Converted data:', convertedData);
            setAssignmentData(convertedData);
            
            // Carica dati cliente se disponibili
            if (assignmentDataResponse.client) {
                setClientData(assignmentDataResponse.client);
            }
            
            // Inizializza riserve selezionate (solo quelle abilitate)
            if (assignmentDataResponse.reserves) {
                const initialReserves: Record<number, boolean> = {};
                const initialPercentages: Record<number, number> = {};
                assignmentDataResponse.reserves.forEach((reserve: any) => {
                    if (reserve.enabled) {
                        initialReserves[reserve.id] = true;
                        initialPercentages[reserve.id] = reserve.percentage;
                    }
                });
                setSelectedReserves(initialReserves);
                setReservePercentages(initialPercentages);
            }
            
            // Carica CRM disponibili
            const crms = await getCrmDepartments(true);
            setAvailableCrms(crms.filter(crm => crm.id !== 2)); // Escludi "CRM Project"
            
            // Carica project managers disponibili
            const managersResponse = await apiClient.get('/crm-projects/available-users');
            setAvailableManagers(managersResponse.data.data);
            
        } catch (err: any) {
            console.error('Error loading project data:', err);
            setError(err.response?.data?.message || 'Errore nel caricamento dei dati del progetto');
        } finally {
            setLoading(false);
        }
    };

    const calculateAvailableBudget = () => {
        if (!assignmentData) return 0;
        
        // invoiceTotal può essere 0 per progetti gratuiti, va bene
        let total = assignmentData.invoiceTotal ?? 0;
        
        // Sottrai commissione venditore
        total -= (assignmentData.sellerCommission || 0);
        
        // Sottrai riserve selezionate
        Object.keys(selectedReserves).forEach(reserveId => {
            if (selectedReserves[Number(reserveId)]) {
                const percentage = reservePercentages[Number(reserveId)] || 0;
                total -= ((assignmentData.invoiceTotal || 0) * percentage / 100);
            }
        });
        
        // Aggiungi budget extra
        total += extraBudgetTotal;
        
        return Math.max(0, total);
    };

    const handleExtraBudgetSuccess = async () => {
        // Ricarica i dati del progetto per ottenere il budget aggiornato
        if (id) {
            try {
                const projectResponse = await crmProjectsApi.getById(Number(id));
                setProject(projectResponse.data);
                
                // Calcola il totale del budget extra dai settings
                if (projectResponse.data.settings?.extra_budget) {
                    const total = projectResponse.data.settings.extra_budget.reduce(
                        (sum: number, item: any) => sum + (item.amount || 0),
                        0
                    );
                    setExtraBudgetTotal(total);
                } else {
                    setExtraBudgetTotal(0);
                }
            } catch (err: any) {
                console.error('Error reloading project data:', err);
            }
        }
    };

    const handleReserveToggle = (reserveId: number) => {
        setSelectedReserves(prev => ({
            ...prev,
            [reserveId]: !prev[reserveId]
        }));
    };

    const handleReservePercentageChange = (reserveId: number, percentage: number) => {
        setReservePercentages(prev => ({
            ...prev,
            [reserveId]: Math.max(0, Math.min(100, percentage))
        }));
    };

    const handleCrmToggle = (crmId: number) => {
        setSelectedCrms(prev => {
            const exists = prev.find(c => c.crm_id === crmId);
            if (exists) {
                return prev.filter(c => c.crm_id !== crmId);
            } else {
                return [...prev, { crm_id: crmId, description: '', manager_id: null }];
            }
        });
    };

    const handleCrmDescriptionChange = (crmId: number, description: string) => {
        setSelectedCrms(prev => prev.map(c => 
            c.crm_id === crmId ? { ...c, description } : c
        ));
    };

    const handleManagerSelect = (crmId: number, managerId: number | null) => {
        setSelectedCrms(prev => prev.map(c => 
            c.crm_id === crmId ? { ...c, manager_id: managerId } : c
        ));
    };

    const validateStep1 = (): boolean => {
        if (!assignmentData) return false;
        
        // Verifica che la somma delle percentuali riserve non superi 100%
        const totalReservePercentage = Object.keys(selectedReserves)
            .filter(id => selectedReserves[Number(id)])
            .reduce((sum, id) => sum + (reservePercentages[Number(id)] || 0), 0);
        
        if (totalReservePercentage > 100) {
            alert('La somma delle percentuali delle riserve non può superare il 100%');
            return false;
        }
        
        // Permetti budget 0€ (progetti gratuiti)
        // const availableBudget = calculateAvailableBudget();
        // if (availableBudget <= 0) {
        //     alert('Il budget disponibile deve essere maggiore di zero');
        //     return false;
        // }
        
        return true;
    };

    const validateStep2 = (): boolean => {
        if (selectedCrms.length === 0) {
            alert('Seleziona almeno un CRM');
            return false;
        }
        
        // Verifica che tutte le descrizioni siano compilate
        for (const crm of selectedCrms) {
            if (!crm.description.trim()) {
                alert(`Inserisci una descrizione per il CRM "${availableCrms.find(c => c.id === crm.crm_id)?.name}"`);
                return false;
            }
        }
        
        return true;
    };

    const validateStep3 = (): boolean => {
        // Verifica che tutti i CRM abbiano un responsabile
        for (const crm of selectedCrms) {
            if (!crm.manager_id) {
                alert(`Seleziona un responsabile CRM per il reparto "${availableCrms.find(c => c.id === crm.crm_id)?.name}"`);
                return false;
            }
        }

        return true;
    };

    const handleClientUpdate = async (data: CreateClientData) => {
        if (!project?.client_id) {
            alert('Cliente non trovato');
            return;
        }

        try {
            await updateClient(project.client_id, data);
            setClientData(data);
            setCurrentStep(1);
        } catch (err: any) {
            console.error('Error updating client:', err);
            alert(err.response?.data?.message || 'Errore nell\'aggiornamento del cliente');
        }
    };

    const handleSkipClient = () => {
        setCurrentStep(1);
    };

    const handleNext = () => {
        if (currentStep === 0) {
            // Step 0 gestito da handleClientUpdate o handleSkipClient
            return;
        } else if (currentStep === 1) {
            if (!validateStep1()) return;
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!validateStep2()) return;
            setCurrentStep(3);
        }
    };

    const handleBack = () => {
        if (currentStep === 1) {
            setCurrentStep(0);
        } else if (currentStep === 2) {
            setCurrentStep(1);
        } else if (currentStep === 3) {
            setCurrentStep(2);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep3()) return;
        
        try {
            setSubmitting(true);
            
            const reserveAllocations = Object.keys(selectedReserves)
                .filter(id => selectedReserves[Number(id)])
                .map(id => ({
                    serbatoio_id: Number(id),
                    percentage: reservePercentages[Number(id)] || 0,
                    amount: (assignmentData!.invoiceTotal || 0) * (reservePercentages[Number(id)] || 0) / 100
                }));
            
            const payload = {
                budget: calculateAvailableBudget(),
                seller_commission: assignmentData!.sellerCommission || 0,
                reserves: reserveAllocations,
                crm_assignments: selectedCrms.map(crm => ({
                    crm_department_id: crm.crm_id,
                    description: crm.description,
                    manager_id: crm.manager_id
                }))
            };
            
            await apiClient.post(`/crm-projects/${id}/assign`, payload);
            
            alert('Progetto assegnato con successo!');
            navigate('/pm');
            
        } catch (err: any) {
            console.error('Error assigning project:', err);
            alert(err.response?.data?.message || 'Errore nell\'assegnazione del progetto');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="assegna-progetto-wizard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento dati progetto...</p>
                </div>
            </div>
        );
    }

    if (error || !project || !assignmentData) {
        return (
            <div className="assegna-progetto-wizard">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Errore</h3>
                    <p>{error || 'Dati progetto non disponibili'}</p>
                    <button onClick={() => navigate('/progetti-in-attesa')} className="btn-back">
                        <ArrowLeft size={16} />
                        Torna ai Progetti
                    </button>
                </div>
            </div>
        );
    }

    // Verifica se ci sono dati cliente disponibili per lo step 0
    if (currentStep === 0 && !clientData) {
        return (
            <div className="assegna-progetto-wizard">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Dati Cliente Non Disponibili</h3>
                    <p>
                        Non è stato possibile recuperare i dati del cliente per questo progetto.
                    </p>
                    <button onClick={() => navigate(`/gestione-progetti/${id}`)} className="btn-back">
                        <ArrowLeft size={16} />
                        Vai al Dettaglio Progetto
                    </button>
                </div>
            </div>
        );
    }

    // Verifica se ci sono dati finanziari disponibili (solo per step > 0)
    // Nota: invoiceTotal può essere 0 per progetti gratuiti, quindi controlliamo solo se assignmentData è null
    if (currentStep > 0 && !assignmentData) {
        return (
            <div className="assegna-progetto-wizard">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Dati Finanziari Non Disponibili</h3>
                    <p>
                        Non è stato possibile recuperare i dati finanziari per questo progetto.
                        Assicurati che il progetto abbia un contratto o un preventivo associato.
                    </p>
                    <button onClick={() => navigate(`/gestione-progetti/${id}`)} className="btn-back">
                        <ArrowLeft size={16} />
                        Vai al Dettaglio Progetto
                    </button>
                </div>
            </div>
        );
    }

    const availableBudget = calculateAvailableBudget();
    const totalReservePercentage = Object.keys(selectedReserves)
        .filter(id => selectedReserves[Number(id)])
        .reduce((sum, id) => sum + (reservePercentages[Number(id)] || 0), 0);

    return (
        <div className="assegna-progetto-wizard">
            {/* Header */}
            <div className="wizard-header">
                <button className="btn-back" onClick={() => navigate('/progetti-in-attesa')}>
                    <ArrowLeft size={20} />
                    Torna ai Progetti
                </button>
                <div className="wizard-title">
                    <h1>Assegna Progetto</h1>
                    <p className="project-name">{project.name}</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="wizard-steps">
                <div className={`step-indicator ${currentStep >= 0 ? 'active' : ''} ${currentStep > 0 ? 'completed' : ''}`}>
                    <div className="step-number">{currentStep > 0 ? <Check size={16} /> : '0'}</div>
                    <div className="step-label">Anagrafica Cliente</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step-indicator ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                    <div className="step-number">{currentStep > 1 ? <Check size={16} /> : '1'}</div>
                    <div className="step-label">Piano Finanziario</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step-indicator ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                    <div className="step-number">{currentStep > 2 ? <Check size={16} /> : '2'}</div>
                    <div className="step-label">Selezione CRM</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step-indicator ${currentStep >= 3 ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <div className="step-label">Project Manager</div>
                </div>
            </div>

            {/* Step Content */}
            <div className="wizard-content">
                {currentStep === 0 && clientData && (
                    <ClientInfoStep
                        clientData={clientData}
                        onUpdate={handleClientUpdate}
                        onSkip={handleSkipClient}
                    />
                )}
                {currentStep === 1 && (
                    <div className="step-content">
                        <h2>Piano Finanziario</h2>
                        <p className="step-description">
                            Definisci il budget del progetto calcolando il totale della fattura, 
                            sottraendo la commissione del venditore e le riserve.
                        </p>

                        {/* Invoice Total */}
                        <div className="financial-card">
                            <div className="financial-row">
                                <span className="financial-label">Totale Fattura</span>
                                <span className="financial-value">
                                    € {(assignmentData.invoiceTotal || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Seller Info */}
                        {assignmentData.seller && (
                            <div className="financial-card">
                                <div className="financial-row">
                                    <span className="financial-label">Venditore</span>
                                    <span className="financial-value">
                                        {assignmentData.seller.user?.name || 'N/A'}
                                        {assignmentData.seller.user?.email && (
                                            <span className="seller-email"> ({assignmentData.seller.user.email})</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Seller Commission */}
                        <div className="financial-card">
                            <div className="financial-row">
                                <span className="financial-label">
                                    Commissione Venditore ({assignmentData.sellerCommissionRate || 0}%)
                                </span>
                                <span className="financial-value negative">
                                    - € {(assignmentData.sellerCommission || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Reserves */}
                        <div className="reserves-section">
                            <h3>Riserve</h3>
                            <p className="section-description">
                                Seleziona le riserve da applicare e definisci la percentuale per ciascuna.
                                La somma delle percentuali non può superare il 100%.
                            </p>
                            
                            <div className="reserves-list">
                                {assignmentData.reserves && assignmentData.reserves.length > 0 ? (
                                    assignmentData.reserves.map((reserve) => (
                                    <div key={reserve.id} className="reserve-item">
                                        <div className="reserve-header">
                                            <label className="reserve-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedReserves[reserve.id] || false}
                                                    onChange={() => handleReserveToggle(reserve.id)}
                                                    disabled={!reserve.enabled}
                                                />
                                                <span className="reserve-name">{reserve.name}</span>
                                            </label>
                                            {reserve.enabled && (
                                                <span className="reserve-default-percentage">
                                                    Default: {reserve.percentage}%
                                                </span>
                                            )}
                                        </div>
                                        {selectedReserves[reserve.id] && (
                                            <div className="reserve-controls">
                                                <label>
                                                    Percentuale:
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={reservePercentages[reserve.id] || reserve.percentage}
                                                        onChange={(e) => handleReservePercentageChange(
                                                            reserve.id,
                                                            parseFloat(e.target.value) || 0
                                                        )}
                                                    />
                                                    %
                                                </label>
                                                <span className="reserve-amount">
                                                    = € {(
                                                        (assignmentData.invoiceTotal || 0) * 
                                                        (reservePercentages[reserve.id] || reserve.percentage) / 100
                                                    ).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    ))
                                ) : (
                                    <div className="no-reserves">
                                        <p>Nessuna riserva configurata nel sistema.</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="reserves-summary">
                                <div className="summary-row">
                                    <span>Totale Riserve:</span>
                                    <span className={totalReservePercentage > 100 ? 'error' : ''}>
                                        {totalReservePercentage.toFixed(2)}%
                                    </span>
                                </div>
                                {totalReservePercentage > 100 && (
                                    <p className="error-message">
                                        La somma delle percentuali non può superare il 100%
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Extra Budget Section */}
                        <div className="extra-budget-section">
                            <div className="extra-budget-header">
                                <h3>Budget Extra</h3>
                                <button
                                    type="button"
                                    className="btn-add-extra-budget"
                                    onClick={() => setShowExtraBudgetModal(true)}
                                >
                                    <Plus size={16} />
                                    {extraBudgetTotal > 0 ? 'Modifica Budget Extra' : 'Aggiungi Budget Extra'}
                                </button>
                            </div>
                            {extraBudgetTotal > 0 && (
                                <div className="extra-budget-info">
                                    <span>Budget extra aggiunto:</span>
                                    <span className="extra-budget-amount">
                                        + € {extraBudgetTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Available Budget */}
                        <div className="budget-summary">
                            <div className="budget-card">
                                <div className="budget-label">Budget Disponibile per il Progetto</div>
                                <div className="budget-amount">
                                    € {(availableBudget || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="step-content">
                        <h2>Selezione CRM Coinvolti</h2>
                        <p className="step-description">
                            Seleziona i CRM che verranno coinvolti nel progetto e fornisci 
                            una descrizione dettagliata per ciascuno.
                        </p>

                        <div className="crms-list">
                            {availableCrms.map((crm) => {
                                const isSelected = selectedCrms.some(c => c.crm_id === crm.id);
                                return (
                                    <div key={crm.id} className={`crm-card ${isSelected ? 'selected' : ''}`}>
                                        <div className="crm-card-header">
                                            <label className="crm-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCrmToggle(crm.id)}
                                                />
                                                <div className="crm-info">
                                                    <h3>{crm.name}</h3>
                                                    <p className="crm-code">{crm.code}</p>
                                                </div>
                                            </label>
                                        </div>
                                        {isSelected && (
                                            <div className="crm-description-input">
                                                <label>
                                                    Descrizione per il Project Manager:
                                                    <textarea
                                                        value={selectedCrms.find(c => c.crm_id === crm.id)?.description || ''}
                                                        onChange={(e) => handleCrmDescriptionChange(crm.id, e.target.value)}
                                                        placeholder="Descrivi il ruolo e le responsabilità di questo CRM nel progetto..."
                                                        rows={4}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="step-content">
                        <h2>Responsabili di reparto CRM</h2>
                        <p className="step-description">
                            Seleziona un responsabile CRM per ciascun reparto coinvolto nel progetto. Il Project Manager unico (uno solo per progetto) si imposta dalla scheda del progetto, tab &quot;Project Manager&quot;.
                        </p>

                        <div className="managers-list">
                            {selectedCrms.map((selectedCrm) => {
                                const crm = availableCrms.find(c => c.id === selectedCrm.crm_id);
                                return (
                                    <div key={selectedCrm.crm_id} className="manager-card">
                                        <div className="manager-card-header">
                                            <h3>{crm?.name}</h3>
                                            <p className="manager-description">{selectedCrm.description}</p>
                                        </div>
                                        <div className="manager-select">
                                            <label>
                                                Responsabile CRM:
                                                <select
                                                    value={selectedCrm.manager_id || ''}
                                                    onChange={(e) => handleManagerSelect(
                                                        selectedCrm.crm_id,
                                                        e.target.value ? Number(e.target.value) : null
                                                    )}
                                                >
                                                    <option value="">Seleziona un responsabile CRM...</option>
                                                    {availableManagers.map((manager) => (
                                                        <option key={manager.id} value={manager.id}>
                                                            {manager.name} ({manager.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            {currentStep !== 0 && (
                <div className="wizard-navigation">
                    <button
                        className="btn-secondary"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeft size={16} />
                        Indietro
                    </button>
                    {currentStep < 3 ? (
                        <button className="btn-primary" onClick={handleNext}>
                            Avanti
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="spinner" size={16} />
                                    Assegnazione in corso...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Completa Assegnazione
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Extra Budget Modal */}
            {id && (
                <AddExtraBudgetModal
                    isOpen={showExtraBudgetModal}
                    onClose={() => setShowExtraBudgetModal(false)}
                    onSuccess={handleExtraBudgetSuccess}
                    projectId={Number(id)}
                />
            )}
        </div>
    );
};

export default AssegnaProgettoWizard;

