import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    DollarSign, 
    TrendingUp, 
    Clock, 
    AlertCircle,
    CheckCircle,
    XCircle,
    Briefcase,
    Calendar,
    Plus,
    Send,
    Receipt,
    X,
    Upload
} from 'lucide-react';
import { userDetailApi, type UserDetailResponse } from '../../api/userDetail';
import { useAuth } from '../../context/AuthContext';
import './UserDetail.css';

const UserDetail: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [data, setData] = useState<UserDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | 'month' | 'year'>('all');
    const [activeTab, setActiveTab] = useState<'expenses' | 'reimbursements' | 'allocations' | 'timeline'>('expenses');
    
    // Modal states
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showCocchiModal, setShowCocchiModal] = useState(false);
    const [showReimbursementModal, setShowReimbursementModal] = useState(false);
    
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (userId) {
            loadUserDetail();
        }
    }, [userId, period]);

    const loadUserDetail = async () => {
        try {
            setLoading(true);
            const response = await userDetailApi.getDetail(Number(userId), { period });
            if (response && response.data) {
                setData(response.data);
            }
        } catch (error: any) {
            console.error('Error loading user detail:', error);
            
            // Check if it's an auth error
            if (error?.response?.status === 401) {
                console.warn('Authentication required - redirecting to login');
                // The auth interceptor should handle this
            } else if (error?.response?.status === 404) {
                console.error('User not found');
            }
            
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="user-detail-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="user-detail-error">
                <AlertCircle size={48} />
                <h3>Utente non trovato</h3>
                <button onClick={() => navigate(-1)}>Torna alla lista</button>
            </div>
        );
    }

    const { user, stats } = data;

    return (
        <div className="user-detail-page">
            {/* Header */}
            <div className="user-detail-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                </button>
                
                <div className="user-header-info">
                    <div className="user-avatar-large">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                        ) : (
                            <span>{user.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="user-info">
                        <h1>{user.name}</h1>
                        <p className="email">{user.email}</p>
                        <div className="user-meta">
                            <span className="badge">{user.role}</span>
                            {user.department && <span className="text-muted">• {user.department}</span>}
                        </div>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="period-selector">
                        <button 
                            className={period === 'month' ? 'active' : ''}
                            onClick={() => setPeriod('month')}
                        >
                            Mese
                        </button>
                        <button 
                            className={period === 'year' ? 'active' : ''}
                            onClick={() => setPeriod('year')}
                        >
                            Anno
                        </button>
                        <button 
                            className={period === 'all' ? 'active' : ''}
                            onClick={() => setPeriod('all')}
                        >
                            Tutto
                        </button>
                    </div>
                    
                    {isAdmin && (
                        <div className="admin-actions">
                            <button className="action-btn primary" onClick={() => setShowExpenseModal(true)}>
                                <Plus size={14} />
                                <span>Spesa</span>
                            </button>
                            <button className="action-btn" onClick={() => setShowCocchiModal(true)}>
                                <Send size={14} />
                                <span>Invia Cocchi</span>
                            </button>
                            <button className="action-btn" onClick={() => setShowReimbursementModal(true)}>
                                <Receipt size={14} />
                                <span>Rimborso</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {/* Spese */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)' }}>
                        <DollarSign size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Spese Totali</p>
                        <h3 className="stat-value">{stats.expenses.formatted_paid}</h3>
                        <p className="stat-detail">{stats.expenses.total_count} transazioni</p>
                    </div>
                    {stats.expenses.total_pending > 0 && (
                        <div className="stat-badge pending">
                            {stats.expenses.formatted_pending} pending
                        </div>
                    )}
                </div>

                {/* Rimborsi */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Rimborsi</p>
                        <h3 className="stat-value">{stats.reimbursements.formatted_paid}</h3>
                        <p className="stat-detail">{stats.reimbursements.total_count} richieste</p>
                    </div>
                    {stats.reimbursements.pending_amount > 0 && (
                        <div className="stat-badge warning">
                            {stats.reimbursements.formatted_pending} da approvare
                        </div>
                    )}
                </div>

                {/* Allocazioni CRM */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                        <Briefcase size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Budget Allocato</p>
                        <h3 className="stat-value">{stats.allocations.formatted_allocated}</h3>
                        <p className="stat-detail">
                            Usato: {stats.allocations.formatted_used} ({stats.allocations.usage_percentage}%)
                        </p>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${Math.min(stats.allocations.usage_percentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Progetti */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #BF5AF2 100%)' }}>
                        <Calendar size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Progetti Attivi</p>
                        <h3 className="stat-value">{stats.projects.active_count}</h3>
                        {stats.last_activity && (
                            <p className="stat-detail">
                                Ultima attività: {new Date(stats.last_activity).toLocaleDateString('it-IT')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <div className="tabs">
                    <button 
                        className={activeTab === 'expenses' ? 'active' : ''}
                        onClick={() => setActiveTab('expenses')}
                    >
                        <DollarSign size={16} />
                        Spese ({data.expenses.total})
                    </button>
                    <button 
                        className={activeTab === 'reimbursements' ? 'active' : ''}
                        onClick={() => setActiveTab('reimbursements')}
                    >
                        <TrendingUp size={16} />
                        Rimborsi ({data.reimbursements.total})
                    </button>
                    <button 
                        className={activeTab === 'allocations' ? 'active' : ''}
                        onClick={() => setActiveTab('allocations')}
                    >
                        <Briefcase size={16} />
                        Allocazioni CRM ({data.crm_allocations.length})
                    </button>
                    <button 
                        className={activeTab === 'timeline' ? 'active' : ''}
                        onClick={() => setActiveTab('timeline')}
                    >
                        <Clock size={16} />
                        Timeline
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'expenses' && (
                    <ExpensesTab expenses={data.expenses.data} />
                )}
                {activeTab === 'reimbursements' && (
                    <ReimbursementsTab reimbursements={data.reimbursements.data} />
                )}
                {activeTab === 'allocations' && (
                    <AllocationsTab allocations={data.crm_allocations} />
                )}
                {activeTab === 'timeline' && (
                    <TimelineTab userId={Number(userId)} />
                )}
            </div>

            {/* Modals */}
            {showExpenseModal && (
                <ExpenseModal 
                    userId={Number(userId)}
                    userName={user.name}
                    onClose={() => setShowExpenseModal(false)}
                    onSuccess={loadUserDetail}
                />
            )}
            
            {showCocchiModal && (
                <CocchiModal 
                    userId={Number(userId)}
                    userName={user.name}
                    crmAllocations={data.crm_allocations}
                    onClose={() => setShowCocchiModal(false)}
                    onSuccess={loadUserDetail}
                />
            )}
            
            {showReimbursementModal && (
                <ReimbursementModal 
                    userId={Number(userId)}
                    userName={user.name}
                    onClose={() => setShowReimbursementModal(false)}
                    onSuccess={loadUserDetail}
                />
            )}
        </div>
    );
};

// ==================== Modals ====================

interface ModalProps {
    userId: number;
    userName: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface CocchiModalProps extends ModalProps {
    crmAllocations: any[];
}

const ExpenseModal: React.FC<ModalProps> = ({ userId, userName, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: '',
        payment_date: new Date().toISOString().split('T')[0],
        type: 'entrata'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // TODO: Implement API call
            console.log('Creating expense for user:', userId, formData);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating expense:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Nuova Spesa</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="modal-user-info">
                        <div className="user-avatar-sm">{userName.charAt(0)}</div>
                        <span>{userName}</span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Titolo *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="Es: Pranzo con cliente"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Categoria</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="">Seleziona categoria</option>
                                <option value="pranzo">Pranzo</option>
                                <option value="cena">Cena</option>
                                <option value="carburante">Carburante</option>
                                <option value="materiali">Materiali</option>
                                <option value="altro">Altro</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Importo (€) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Data Pagamento *</label>
                                <input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={e => setFormData({...formData, payment_date: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descrizione</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Note aggiuntive..."
                                rows={3}
                            />
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Annulla
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Creazione...' : 'Crea Spesa'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const CocchiModal: React.FC<CocchiModalProps> = ({ userId, userName, crmAllocations, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        crm_allocation_id: '',
        amount: '',
        reason: '',
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    // Filter allocations with remaining budget
    const availableAllocations = crmAllocations.filter(alloc => alloc.cocchi_remaining > 0);

    // Get selected allocation details
    const selectedAllocation = availableAllocations.find(
        alloc => alloc.id.toString() === formData.crm_allocation_id
    );

    // Check if amount exceeds available budget
    const amountValue = parseFloat(formData.amount) || 0;
    const isAmountExceeded = selectedAllocation && amountValue > selectedAllocation.cocchi_remaining;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isAmountExceeded) {
            alert('Importo supera il budget disponibile!');
            return;
        }

        setLoading(true);
        
        try {
            // TODO: Implement API call
            console.log('Sending cocchi to user:', userId, formData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error sending cocchi:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Invia Cocchi</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="modal-user-info">
                        <div className="user-avatar-sm">{userName.charAt(0)}</div>
                        <span>{userName}</span>
                    </div>

                    {availableAllocations.length === 0 ? (
                        <div className="no-budget-warning">
                            <AlertCircle size={24} />
                            <p>Nessun budget CRM disponibile per questo utente.</p>
                            <p className="text-muted">Contatta l'amministratore per allocare budget.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>CRM / Budget *</label>
                                <select
                                    value={formData.crm_allocation_id}
                                    onChange={e => setFormData({...formData, crm_allocation_id: e.target.value})}
                                    required
                                >
                                    <option value="">Seleziona CRM da cui prelevare</option>
                                    {availableAllocations.map(alloc => (
                                        <option key={alloc.id} value={alloc.id}>
                                            {alloc.crm_department?.name || 'N/A'} - Disponibile: € {alloc.cocchi_remaining.toLocaleString('it-IT')}
                                        </option>
                                    ))}
                                </select>
                            {selectedAllocation && (
                                <div className="budget-info">
                                    <div className="budget-row">
                                        <span>Budget Allocato:</span>
                                        <strong>€ {selectedAllocation.cocchi_allocated.toLocaleString('it-IT')}</strong>
                                    </div>
                                    <div className="budget-row">
                                        <span>Già Usato:</span>
                                        <strong>€ {selectedAllocation.cocchi_used.toLocaleString('it-IT')}</strong>
                                    </div>
                                    <div className="budget-row available">
                                        <span>Disponibile:</span>
                                        <strong>€ {selectedAllocation.cocchi_remaining.toLocaleString('it-IT')}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Importo (€) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    required
                                    className={isAmountExceeded ? 'error' : ''}
                                />
                                {isAmountExceeded && (
                                    <span className="error-message">
                                        Importo supera il budget disponibile (€ {selectedAllocation?.cocchi_remaining.toLocaleString('it-IT')})
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Mese *</label>
                                <input
                                    type="month"
                                    value={formData.month}
                                    onChange={e => setFormData({...formData, month: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Motivo *</label>
                            <select
                                value={formData.reason}
                                onChange={e => setFormData({...formData, reason: e.target.value})}
                                required
                            >
                                <option value="">Seleziona motivo</option>
                                <option value="stipendio">Stipendio Mensile</option>
                                <option value="bonus">Bonus</option>
                                <option value="rimborso">Rimborso Spese</option>
                                <option value="extra">Extra</option>
                                <option value="altro">Altro</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Note</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                placeholder="Note aggiuntive..."
                                rows={3}
                            />
                        </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={onClose}>
                                    Annulla
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading || isAmountExceeded}>
                                    {loading ? 'Invio...' : 'Invia Cocchi'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReimbursementModal: React.FC<ModalProps> = ({ userId, userName, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        receipt: null as File | null
    });
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({...formData, receipt: e.target.files[0]});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // TODO: Implement API call with file upload
            console.log('Creating reimbursement for user:', userId, formData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating reimbursement:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Richiedi Rimborso</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="modal-user-info">
                        <div className="user-avatar-sm">{userName.charAt(0)}</div>
                        <span>{userName}</span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Titolo *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="Es: Viaggio Milano"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Categoria</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="">Seleziona categoria</option>
                                <option value="trasporto">Trasporto</option>
                                <option value="alloggio">Alloggio</option>
                                <option value="vitto">Vitto</option>
                                <option value="materiali">Materiali</option>
                                <option value="altro">Altro</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Importo (€) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Data Spesa *</label>
                                <input
                                    type="date"
                                    value={formData.expense_date}
                                    onChange={e => setFormData({...formData, expense_date: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descrizione</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Descrizione dettagliata della spesa..."
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Scontrino/Ricevuta</label>
                            <div className="file-upload">
                                <input
                                    type="file"
                                    id="receipt-upload"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                />
                                <label htmlFor="receipt-upload" className="file-upload-label">
                                    <Upload size={16} />
                                    <span>{formData.receipt ? formData.receipt.name : 'Carica file'}</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Annulla
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Creazione...' : 'Richiedi Rimborso'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ==================== Sub Components ====================

interface ExpensesTabProps {
    expenses: any[];
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ expenses }) => {
    if (expenses.length === 0) {
        return (
            <div className="empty-state">
                <DollarSign size={48} />
                <p>Nessuna spesa trovata</p>
            </div>
        );
    }

    return (
        <div className="expenses-list">
            {expenses.map((expense) => (
                <div key={expense.id} className="expense-item">
                    <div className="expense-main">
                        <div className="expense-info">
                            <h4>{expense.title}</h4>
                            {expense.description && <p className="text-muted">{expense.description}</p>}
                            <div className="expense-meta">
                                {expense.category && <span className="badge-sm">{expense.category}</span>}
                                {expense.payment_date && (
                                    <span className="text-muted">
                                        {new Date(expense.payment_date).toLocaleDateString('it-IT')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="expense-amount">
                            <span className="amount">{expense.formatted_amount}</span>
                            <StatusBadge status={expense.status} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

interface ReimbursementsTabProps {
    reimbursements: any[];
}

const ReimbursementsTab: React.FC<ReimbursementsTabProps> = ({ reimbursements }) => {
    if (reimbursements.length === 0) {
        return (
            <div className="empty-state">
                <TrendingUp size={48} />
                <p>Nessun rimborso richiesto</p>
            </div>
        );
    }

    return (
        <div className="reimbursements-list">
            {reimbursements.map((reimb) => (
                <div key={reimb.id} className="reimb-item">
                    <div className="reimb-main">
                        <div className="reimb-info">
                            <h4>{reimb.title}</h4>
                            {reimb.description && <p className="text-muted">{reimb.description}</p>}
                            <div className="reimb-meta">
                                {reimb.category && <span className="badge-sm">{reimb.category}</span>}
                                <span className="text-muted">
                                    {new Date(reimb.expense_date).toLocaleDateString('it-IT')}
                                </span>
                                {reimb.days_pending !== null && (
                                    <span className="text-warning">• {reimb.days_pending} giorni in attesa</span>
                                )}
                            </div>
                        </div>
                        <div className="reimb-amount">
                            <span className="amount">{reimb.formatted_amount}</span>
                            <span 
                                className="status-badge" 
                                style={{ backgroundColor: reimb.status_color }}
                            >
                                {reimb.status_label}
                            </span>
                        </div>
                    </div>
                    {reimb.rejection_reason && (
                        <div className="rejection-reason">
                            <XCircle size={14} />
                            <span>{reimb.rejection_reason}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

interface AllocationsTabProps {
    allocations: any[];
}

const AllocationsTab: React.FC<AllocationsTabProps> = ({ allocations }) => {
    if (allocations.length === 0) {
        return (
            <div className="empty-state">
                <Briefcase size={48} />
                <p>Nessuna allocazione CRM</p>
            </div>
        );
    }

    return (
        <div className="allocations-grid">
            {allocations.map((alloc) => (
                <div key={alloc.id} className="allocation-card">
                    <div className="allocation-header">
                        <h4>{alloc.crm_department?.name || 'N/A'}</h4>
                        <span className="badge-sm">{alloc.crm_department?.code}</span>
                    </div>
                    <div className="allocation-amounts">
                        <div className="amount-row">
                            <span className="label">Allocato:</span>
                            <span className="value">€ {alloc.cocchi_allocated.toLocaleString('it-IT')}</span>
                        </div>
                        <div className="amount-row">
                            <span className="label">Usato:</span>
                            <span className="value">€ {alloc.cocchi_used.toLocaleString('it-IT')}</span>
                        </div>
                        <div className="amount-row remaining">
                            <span className="label">Rimanente:</span>
                            <span className="value">€ {alloc.cocchi_remaining.toLocaleString('it-IT')}</span>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ 
                                width: `${Math.min(alloc.usage_percentage, 100)}%`,
                                backgroundColor: alloc.usage_percentage > 90 ? '#FF3B30' : '#34C759'
                            }}
                        />
                    </div>
                    <p className="text-muted">{alloc.usage_percentage.toFixed(1)}% utilizzato</p>
                </div>
            ))}
        </div>
    );
};

interface TimelineTabProps {
    userId: number;
}

const TimelineTab: React.FC<TimelineTabProps> = ({ userId }) => {
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTimeline();
    }, [userId]);

    const loadTimeline = async () => {
        try {
            setLoading(true);
            const response = await userDetailApi.getActivityTimeline(userId);
            setTimeline(response.data);
        } catch (error) {
            console.error('Error loading timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-spinner">Caricamento...</div>;
    }

    if (timeline.length === 0) {
        return (
            <div className="empty-state">
                <Clock size={48} />
                <p>Nessuna attività registrata</p>
            </div>
        );
    }

    return (
        <div className="timeline-container">
            {timeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                        <div className="timeline-header">
                            <h4>{item.title}</h4>
                            <span className="amount">€ {item.amount.toLocaleString('it-IT')}</span>
                        </div>
                        <div className="timeline-meta">
                            <span className="badge-sm">{item.type === 'expense' ? 'Spesa' : 'Rimborso'}</span>
                            {item.category && <span className="text-muted">• {item.category}</span>}
                            <span className="text-muted">
                                • {new Date(item.date).toLocaleDateString('it-IT')}
                            </span>
                        </div>
                        <StatusBadge status={item.status} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==================== Utility Components ====================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        paid: { label: 'Pagato', color: '#34C759', icon: CheckCircle },
        pending: { label: 'In Attesa', color: '#FFD60A', icon: Clock },
        approved: { label: 'Approvato', color: '#0A84FF', icon: CheckCircle },
        rejected: { label: 'Rifiutato', color: '#FF3B30', icon: XCircle },
        cancelled: { label: 'Annullato', color: '#8E8E93', icon: XCircle },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
        <span className="status-badge" style={{ backgroundColor: statusConfig.color }}>
            <Icon size={12} />
            {statusConfig.label}
        </span>
    );
};

export default UserDetail;

