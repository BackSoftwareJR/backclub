import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Briefcase,
    Users,
    TrendingUp,
    DollarSign,
    FileText,
    Home,
    Globe,
    Database,
    BookOpen,
    UserCheck,
    Video,
    Wifi,
    BarChart3,
    Loader,
    User,
    Mail,
    Send,
    Plus,
    Minus,
    AlertCircle
} from 'lucide-react';
import budgetApi, { type CrmDepartment } from '../../api/budget';
import serbatoiApi, { type Serbatoio } from '../../api/serbatoi';
import './BudgetDashboard.css';

const BudgetDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'crm' | 'users'>('crm');
    const [crmList, setCrmList] = useState<CrmDepartment[]>([]);
    const [budgetSerbatoio, setBudgetSerbatoio] = useState<Serbatoio | null>(null);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Distribution modal state
    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [selectedCrmCode, setSelectedCrmCode] = useState('');
    const [distributeAmount, setDistributeAmount] = useState('');
    const [distributeReason, setDistributeReason] = useState('');
    const [distributeLoading, setDistributeLoading] = useState(false);

    // Budget adjustment modal
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustCrmCode, setAdjustCrmCode] = useState('');
    const [adjustAction, setAdjustAction] = useState<'increase' | 'decrease'>('increase');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [adjustLoading, setAdjustLoading] = useState(false);

    // Icon mapping
    const iconMap: { [key: string]: any } = {
        'FileText': FileText,
        'Briefcase': Briefcase,
        'Home': Home,
        'Users': Users,
        'Globe': Globe,
        'Database': Database,
        'BookOpen': BookOpen,
        'UserCheck': UserCheck,
        'Video': Video,
        'Wifi': Wifi,
        'BarChart3': BarChart3,
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load CRM departments
            const crmResponse = await budgetApi.getCrmList({ active_only: true });
            setCrmList(crmResponse.data);

            // Load Budget reservoir
            try {
                const serbatoiResponse = await serbatoiApi.getAll({ active_only: true });
                const budgetRes = serbatoiResponse.data.find(s => s.name.toLowerCase() === 'budget');
                setBudgetSerbatoio(budgetRes || null);
            } catch (serbErr) {
                console.warn('Budget serbatoio not found:', serbErr);
            }

            // Load Users list
            try {
                const usersResponse = await budgetApi.getUsersList();
                setUsersList(usersResponse.data || []);
            } catch (usersErr) {
                console.warn('Error loading users:', usersErr);
            }
        } catch (err: any) {
            console.error('Error loading budget data:', err);
            setError(err?.response?.data?.message || 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    };

    const handleDistributeBudget = async () => {
        if (!selectedCrmCode || !distributeAmount) {
            alert('Seleziona un CRM e inserisci un importo');
            return;
        }

        const amount = parseFloat(distributeAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Inserisci un importo valido');
            return;
        }

        const available = getTotalRemaining();
        if (amount > available) {
            alert(`Budget disponibile insufficiente. Disponibile: ¢ ${available.toLocaleString('it-IT')}`);
            return;
        }

        try {
            setDistributeLoading(true);
            await budgetApi.distributeToCrm({
                crm_code: selectedCrmCode,
                amount: amount,
                reason: distributeReason || undefined,
            });

            // Reset and reload
            setShowDistributeModal(false);
            setSelectedCrmCode('');
            setDistributeAmount('');
            setDistributeReason('');
            await loadData();

            alert('Budget distribuito con successo!');
        } catch (err: any) {
            console.error('Distribution error:', err);
            alert(err?.response?.data?.message || 'Errore durante la distribuzione');
        } finally {
            setDistributeLoading(false);
        }
    };

    const handleBudgetAdjust = async () => {
        if (!adjustCrmCode || !adjustAmount) {
            alert('Seleziona un CRM e inserisci un importo');
            return;
        }

        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Inserisci un importo valido');
            return;
        }

        try {
            setAdjustLoading(true);

            if (adjustAction === 'increase') {
                // Incrementa budget CRM (riduce serbatoio)
                await budgetApi.distributeToCrm({
                    crm_code: adjustCrmCode,
                    amount: amount,
                    reason: adjustReason || `Incremento budget di ¢ ${amount}`,
                });
            } else {
                // Decrementa budget CRM (NON aumenta serbatoio, solo riduzione)
                await budgetApi.reduceCrmBudget(adjustCrmCode, {
                    amount: amount,
                    reason: adjustReason || `Riduzione budget di ¢ ${amount}`,
                });
            }

            // Reset and reload
            setShowAdjustModal(false);
            setAdjustCrmCode('');
            setAdjustAmount('');
            setAdjustReason('');
            await loadData();

            alert(`Budget ${adjustAction === 'increase' ? 'incrementato' : 'decrementato'} con successo!`);
        } catch (err: any) {
            console.error('Adjustment error:', err);
            alert(err?.response?.data?.message || 'Errore durante la modifica del budget');
        } finally {
            setAdjustLoading(false);
        }
    };

    // Get budget from serbatoio Budget, or fallback to CRM sum
    const getTotalBudget = () => {
        return budgetSerbatoio ? Number(budgetSerbatoio.balance) || 0 : 0;
    };

    const getTotalAllocated = () => {
        return crmList.reduce((sum, crm) => {
            const allocated = Number(crm.budget_allocated) || 0;
            return sum + allocated;
        }, 0);
    };

    const getTotalSpent = () => {
        return crmList.reduce((sum, crm) => {
            const spent = Number(crm.budget_spent) || 0;
            return sum + spent;
        }, 0);
    };

    const getTotalRemaining = () => {
        // Budget rimanente nei CRM = allocato - speso
        return getTotalAllocated() - getTotalSpent();
    };

    if (loading) {
        return (
            <div className="budget-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Loader className="spinner" size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="budget-page">
                <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'red', marginBottom: '1rem' }}>⚠️ {error}</p>
                    <button onClick={loadData} className="btn-budget-action primary">
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="budget-page">

            {/* Header */}
            <div className="budget-header">
                <button className="btn-back-budget" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Torna a Serbatoi
                </button>
                <h1>Sistema Budget CRM</h1>
                <button
                    className="btn-distribute-budget"
                    onClick={() => setShowDistributeModal(true)}
                    disabled={!budgetSerbatoio || getTotalBudget() <= 0}
                >
                    <Send size={18} />
                    Distribuisci Budget
                </button>
            </div>

            {/* Stats Overview */}
            <div className="budget-stats-grid">
                <div className="budget-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Budget Totale (Serbatoio)</p>
                        <h3 className="stat-value">¢ {getTotalBudget().toLocaleString('it-IT', { maximumFractionDigits: 2 })}</h3>
                        {budgetSerbatoio && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>da {budgetSerbatoio.name}</p>}
                    </div>
                </div>

                <div className="budget-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)' }}>
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Allocato ai CRM</p>
                        <h3 className="stat-value">¢ {getTotalAllocated().toLocaleString('it-IT', { maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="budget-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Speso (Documenti)</p>
                        <h3 className="stat-value">¢ {getTotalSpent().toLocaleString('it-IT', { maximumFractionDigits: 2 })}</h3>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Spese con fattura/ricevuta</p>
                    </div>
                </div>

                <div className="budget-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Budget Rimanente CRM</p>
                        <h3 className="stat-value">¢ {(getTotalRemaining() || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 })}</h3>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Allocato ma non ancora speso</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="budget-tabs">
                <button
                    className={`budget-tab ${activeTab === 'crm' ? 'active' : ''}`}
                    onClick={() => setActiveTab('crm')}
                >
                    <Briefcase size={18} />
                    CRM Departments
                </button>
                <button
                    className={`budget-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} />
                    Utenti
                </button>
            </div>

            {/* Content */}
            {activeTab === 'crm' ? (
                <div className="crm-grid">
                    {crmList.map((crm) => {
                        const usagePercent = crm.budget_allocated > 0
                            ? (crm.budget_spent / crm.budget_allocated) * 100
                            : 0;
                        const IconComponent = iconMap[crm.icon || 'Briefcase'] || Briefcase;

                        return (
                            <div
                                key={crm.code}
                                className="crm-card"
                                onClick={() => navigate(`/serbatoi/budget/crm/${crm.code}`)}
                                style={{ borderColor: crm.color, cursor: 'pointer' }}
                            >
                                <div className="crm-card-header" style={{ background: `linear-gradient(135deg, ${crm.color}20 0%, ${crm.color}10 100%)` }}>
                                    <div className="crm-icon" style={{ background: crm.color }}>
                                        <IconComponent size={24} color="#fff" />
                                    </div>
                                    <h3 className="crm-name">{crm.name}</h3>
                                </div>

                                <div className="crm-card-body">
                                    <div className="crm-budget-info">
                                        <div className="budget-row">
                                            <span className="budget-label">Allocato:</span>
                                            <span className="budget-amount">€ {crm.budget_allocated.toLocaleString('it-IT')}</span>
                                        </div>
                                        <div className="budget-row">
                                            <span className="budget-label">Speso:</span>
                                            <span className="budget-amount spent">€ {crm.budget_spent.toLocaleString('it-IT')}</span>
                                        </div>
                                        <div className="budget-row">
                                            <span className="budget-label">Rimanente:</span>
                                            <span className="budget-amount remaining">€ {crm.budget_remaining.toLocaleString('it-IT')}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="crm-progress-bar">
                                        <div
                                            className="crm-progress-fill"
                                            style={{
                                                width: `${Math.min(usagePercent, 100)}%`,
                                                background: usagePercent > 90 ? '#FF453A' : usagePercent > 70 ? '#FF9F0A' : crm.color
                                            }}
                                        />
                                    </div>
                                    <p className="crm-usage-text">{usagePercent.toFixed(1)}% utilizzato</p>

                                    {/* Budget Adjustment Buttons */}
                                    <div className="crm-budget-actions" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className="btn-budget-adjust increase"
                                            onClick={() => {
                                                setAdjustCrmCode(crm.code);
                                                setAdjustAction('increase');
                                                setShowAdjustModal(true);
                                            }}
                                            title="Aumenta budget"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            className="btn-budget-adjust decrease"
                                            onClick={() => {
                                                setAdjustCrmCode(crm.code);
                                                setAdjustAction('decrease');
                                                setShowAdjustModal(true);
                                            }}
                                            title="Riduci budget"
                                            disabled={crm.budget_allocated <= 0}
                                        >
                                            <Minus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {crm.description && (
                                    <div className="crm-card-footer">
                                        <p className="crm-description">{crm.description}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="users-section">
                    {usersList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                            <Users size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <h3>Nessun utente trovato</h3>
                            <p>Carica i dati degli utenti per visualizzarli qui</p>
                        </div>
                    ) : (
                        <div className="users-grid">
                            {usersList.map((user) => (
                                <div key={user.id} className="user-card">
                                    <div className="user-avatar">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <h4 className="user-name">{user.name}</h4>
                                        <p className="user-email"><Mail size={12} /> {user.email}</p>
                                        <span className="user-role">{user.role}</span>
                                    </div>
                                    <div className="user-budget-stats">
                                        <div className="user-stat">
                                            <span className="stat-label">Allocato</span>
                                            <span className="stat-value">¢ {(user.total_allocated || 0).toLocaleString('it-IT')}</span>
                                        </div>
                                        <div className="user-stat">
                                            <span className="stat-label">Usato</span>
                                            <span className="stat-value">¢ {(user.total_used || 0).toLocaleString('it-IT')}</span>
                                        </div>
                                        <div className="user-stat">
                                            <span className="stat-label">Rimanente</span>
                                            <span className="stat-value success">¢ {(user.total_remaining || 0).toLocaleString('it-IT')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Distribution Modal */}
            {showDistributeModal && (
                <div className="modal-overlay" onClick={() => !distributeLoading && setShowDistributeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Send size={20} /> Distribuisci Budget ai CRM</h2>
                        </div>
                        <div className="modal-body">
                            {budgetSerbatoio && (
                                <div className="info-box">
                                    <AlertCircle size={18} />
                                    <div>
                                        <strong>Budget Disponibile:</strong> ¢ {getTotalRemaining().toLocaleString('it-IT')}
                                        <br />
                                        <small style={{ opacity: 0.7 }}>dal serbatoio {budgetSerbatoio.name}</small>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>CRM Destinazione *</label>
                                <select
                                    value={selectedCrmCode}
                                    onChange={(e) => setSelectedCrmCode(e.target.value)}
                                    disabled={distributeLoading}
                                    className="form-select"
                                >
                                    <option value="">Seleziona un CRM...</option>
                                    {crmList.map(crm => (
                                        <option key={crm.code} value={crm.code}>
                                            {crm.name} (Allocato: ¢ {crm.budget_allocated.toLocaleString('it-IT')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Importo (¢) *</label>
                                <input
                                    type="number"
                                    value={distributeAmount}
                                    onChange={(e) => setDistributeAmount(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    disabled={distributeLoading}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Motivo (opzionale)</label>
                                <textarea
                                    value={distributeReason}
                                    onChange={(e) => setDistributeReason(e.target.value)}
                                    placeholder="Descrivi il motivo della distribuzione..."
                                    rows={3}
                                    disabled={distributeLoading}
                                    className="form-textarea"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setShowDistributeModal(false)}
                                className="btn-cancel"
                                disabled={distributeLoading}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDistributeBudget}
                                className="btn-confirm"
                                disabled={distributeLoading || !selectedCrmCode || !distributeAmount}
                            >
                                {distributeLoading ? (
                                    <><Loader className="spinner" size={16} /> Distribuzione...</>
                                ) : (
                                    <>Conferma Distribuzione</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Adjustment Modal */}
            {showAdjustModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{adjustAction === 'increase' ? 'Aumenta Budget CRM' : 'Riduci Budget CRM'}</h2>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>CRM</label>
                                <input
                                    type="text"
                                    value={crmList.find(c => c.code === adjustCrmCode)?.name || ''}
                                    disabled
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Importo (¢)</label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="Inserisci importo..."
                                    min="0"
                                    step="0.01"
                                    disabled={adjustLoading}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Motivo (opzionale)</label>
                                <textarea
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Descrivi il motivo..."
                                    rows={3}
                                    disabled={adjustLoading}
                                    className="form-textarea"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => {
                                    setShowAdjustModal(false);
                                    setAdjustCrmCode('');
                                    setAdjustAmount('');
                                    setAdjustReason('');
                                }}
                                className="btn-cancel"
                                disabled={adjustLoading}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleBudgetAdjust}
                                className="btn-confirm"
                                disabled={!adjustAmount || adjustLoading}
                            >
                                {adjustLoading ? (
                                    <><Loader className="spinner" size={16} /> Elaborazione...</>
                                ) : (
                                    <>{adjustAction === 'increase' ? 'Aumenta' : 'Riduci'} Budget</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetDashboard;
