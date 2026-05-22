import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { usciteCocchiApi, type CrmExpenseDetail, type UscitaCocchi, type CalendarEvent } from '../../api/usciteCocchi';
import { budgetApi } from '../../api/budget';
import {
    ArrowLeft,
    Calendar,
    List,
    Clock,
    Repeat,
    Plus,
    DollarSign,
    Send,
    Loader,
    Edit,
    Trash2,
    Check,
    X
} from 'lucide-react';
import './UsciteCocchiCrmDetail.css';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { it } });

const UsciteCocchiCrmDetail: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'calendar' | 'lista' | 'futuri' | 'ricorrenti' | 'admin'>('calendar');
    const [crmDetail, setCrmDetail] = useState<CrmExpenseDetail | null>(null);
    const [payments, setPayments] = useState<UscitaCocchi[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [upcoming, setUpcoming] = useState<UscitaCocchi[]>([]);
    const [loading, setLoading] = useState(true);

    // Admin modals
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showCocchiModal, setShowCocchiModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    // Forms
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetReason, setBudgetReason] = useState('');
    const [cocchiAmount, setCocchiAmount] = useState('');
    const [cocchiUser, setCocchiUser] = useState('');
    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        type: 'fattura' as const,
        description: '',
        payment_date: '',
        is_recurring: false,
        payment_frequency: 'once' as const
    });

    useEffect(() => {
        if (code) {
            loadData();
        }
    }, [code]);

    const loadData = async () => {
        if (!code) return;

        try {
            setLoading(true);
            const [detailRes, paymentsRes, calendarRes, upcomingRes] = await Promise.all([
                usciteCocchiApi.getCrmDetail(code),
                usciteCocchiApi.getCrmPayments(code),
                usciteCocchiApi.getCrmCalendar(code),
                usciteCocchiApi.getCrmUpcoming(code)
            ]);

            setCrmDetail(detailRes.data);
            setPayments(paymentsRes.data);
            setCalendarEvents(calendarRes.data);
            setUpcoming(upcomingRes.data);
        } catch (err: any) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBudget = async () => {
        if (!code || !budgetAmount) return;

        try {
            await budgetApi.distributeToCrm({
                crm_code: code,
                amount: parseFloat(budgetAmount),
                reason: budgetReason || `Allocazione budget da Uscite Cocchi`
            });

            alert('Budget allocato con successo!');
            setShowBudgetModal(false);
            setBudgetAmount('');
            setBudgetReason('');
            loadData();
        } catch (err: any) {
            alert('Errore: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSendCocchi = async () => {
        // TODO: Implement cocchi transfer to user
        alert('Funzione in sviluppo: invia cocchi a utente');
    };

    const handleCreateExpense = async () => {
        if (!code) return;

        try {
            // TODO: Call create expense API
            alert('Spesa creata con successo!');
            setShowExpenseModal(false);
            setExpenseData({
                title: '',
                amount: '',
                type: 'fattura',
                description: '',
                payment_date: '',
                is_recurring: false,
                payment_frequency: 'once'
            });
            loadData();
        } catch (err: any) {
            alert('Errore: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) {
        return (
            <div className="crm-detail-page">
                <div className="loading-container">
                    <Loader className="spinner" size={40} />
                    <p>Caricamento...</p>
                </div>
            </div>
        );
    }

    if (!crmDetail) {
        return (
            <div className="crm-detail-page">
                <div className="error-container">
                    <p>CRM non trovato</p>
                    <button onClick={() => navigate(-1)}>Torna indietro</button>
                </div>
            </div>
        );
    }

    const recurringPayments = payments.filter(p => p.is_recurring);

    return (
        <div className="crm-detail-page">
            {/* Header */}
            <div className="crm-detail-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Torna ai CRM
                </button>
                <div className="header-content">
                    <h1>{crmDetail.name}</h1>
                    <span className="crm-code">({crmDetail.code})</span>
                </div>
                <button className="btn-primary" onClick={() => setActiveTab('admin')}>
                    <Plus size={18} />
                    Azioni Admin
                </button>
            </div>

            {/* KPIs */}
            <div className="crm-kpis">
                <div className="kpi-card">
                    <p className="kpi-label">Totale Spese</p>
                    <h3 className="kpi-value">€ {crmDetail.total_amount.toLocaleString('it-IT')}</h3>
                </div>
                <div className="kpi-card">
                    <p className="kpi-label">Pending</p>
                    <h3 className="kpi-value pending">€ {crmDetail.pending_amount.toLocaleString('it-IT')}</h3>
                </div>
                <div className="kpi-card">
                    <p className="kpi-label">Pagato</p>
                    <h3 className="kpi-value paid">€ {crmDetail.paid_amount.toLocaleString('it-IT')}</h3>
                </div>
                <div className="kpi-card">
                    <p className="kpi-label">Transazioni</p>
                    <h3 className="kpi-value">{crmDetail.count}</h3>
                </div>
                <div className="kpi-card">
                    <p className="kpi-label">Ricorrenti</p>
                    <h3 className="kpi-value">{crmDetail.recurring_count}</h3>
                </div>
            </div>

            {/* Tabs */}
            <div className="crm-tabs">
                <button
                    className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <Calendar size={18} />
                    Calendario
                </button>
                <button
                    className={`tab ${activeTab === 'lista' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lista')}
                >
                    <List size={18} />
                    Lista Pagamenti
                </button>
                <button
                    className={`tab ${activeTab === 'futuri' ? 'active' : ''}`}
                    onClick={() => setActiveTab('futuri')}
                >
                    <Clock size={18} />
                    Da Sostenere ({upcoming.length})
                </button>
                <button
                    className={`tab ${activeTab === 'ricorrenti' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ricorrenti')}
                >
                    <Repeat size={18} />
                    Ricorrenti ({recurringPayments.length})
                </button>
                <button
                    className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                >
                    <Plus size={18} />
                    Admin
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'calendar' && (
                    <div className="calendar-container">
                        <BigCalendar
                            localizer={localizer}
                            events={calendarEvents.map(e => ({
                                ...e,
                                start: new Date(e.start),
                                end: new Date(e.end)
                            }))}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 600 }}
                            views={['month', 'week', 'day']}
                            defaultView="month"
                            eventPropGetter={(event: any) => ({
                                style: {
                                    backgroundColor: event.backgroundColor,
                                }
                            })}
                        />
                    </div>
                )}

                {activeTab === 'lista' && (
                    <div className="payments-list">
                        <table className="payments-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrizione</th>
                                    <th>Importo</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(payment => (
                                    <tr key={payment.id}>
                                        <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('it-IT') : '-'}</td>
                                        <td>{payment.title}</td>
                                        <td className="amount">€ {payment.amount.toLocaleString('it-IT')}</td>
                                        <td><span className="badge type">{payment.type}</span></td>
                                        <td><span className={`badge status ${payment.status}`}>{payment.status}</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit"><Edit size={14} /></button>
                                                <button className="btn-icon btn-delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'futuri' && (
                    <div className="upcoming-list">
                        <div className="upcoming-summary">
                            <h3>Prossime Scadenze</h3>
                            <p className="total-upcoming">Totale: € {upcoming.reduce((sum, p) => sum + p.amount, 0).toLocaleString('it-IT')}</p>
                        </div>
                        {upcoming.map(payment => (
                            <div key={payment.id} className="upcoming-card">
                                <div className="upcoming-date">
                                    {payment.payment_date && new Date(payment.payment_date).toLocaleDateString('it-IT')}
                                </div>
                                <div className="upcoming-content">
                                    <h4>{payment.title}</h4>
                                    <p>{payment.description}</p>
                                </div>
                                <div className="upcoming-amount">
                                    € {payment.amount.toLocaleString('it-IT')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'ricorrenti' && (
                    <div className="recurring-list">
                        <h3>Pagamenti Ricorrenti</h3>
                        {recurringPayments.map(payment => (
                            <div key={payment.id} className="recurring-card">
                                <div className="recurring-header">
                                    <h4>{payment.title}</h4>
                                    <span className="frequency">{payment.payment_frequency}</span>
                                </div>
                                <div className="recurring-details">
                                    <p>Importo: € {payment.amount.toLocaleString('it-IT')}</p>
                                    <p>Prossima: {payment.next_payment_date ? new Date(payment.next_payment_date).toLocaleDateString('it-IT') : '-'}</p>
                                    <p>Auto-rinnovo: {payment.auto_renew ? 'Sì' : 'No'}</p>
                                </div>
                                <div className="recurring-actions">
                                    <button className="btn-secondary">Modifica</button>
                                    <button className="btn-danger">Elimina</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className="admin-panel">
                        <h2>Pannello Amministratore</h2>
                        <p>Gestione completa CRM con poteri illimitati</p>

                        <div className="admin-grid">
                            {/* Allocazione Budget */}
                            <div className="admin-card" onClick={() => setShowBudgetModal(true)}>
                                <DollarSign size={32} className="admin-icon" />
                                <h3>Alloca Budget</h3>
                                <p>Assegna budget dal serbatoio a questo CRM</p>
                            </div>

                            {/* Invia Cocchi */}
                            <div className="admin-card" onClick={() => setShowCocchiModal(true)}>
                                <Send size={32} className="admin-icon" />
                                <h3>Invia Cocchi</h3>
                                <p>Trasferisci cocchi a un utente specifico</p>
                            </div>

                            {/* Crea Spesa */}
                            <div className="admin-card" onClick={() => setShowExpenseModal(true)}>
                                <Plus size={32} className="admin-icon" />
                                <h3>Crea Spesa</h3>
                                <p>Registra una nuova uscita per questo CRM</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Budget Modal */}
            {showBudgetModal && (
                <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Alloca Budget a {crmDetail.name}</h3>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>Importo (€)</label>
                                <input
                                    type="number"
                                    value={budgetAmount}
                                    onChange={(e) => setBudgetAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="form-group">
                                <label>Motivo (opzionale)</label>
                                <textarea
                                    value={budgetReason}
                                    onChange={(e) => setBudgetReason(e.target.value)}
                                    placeholder="Descrivi il motivo dell'allocazione..."
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setShowBudgetModal(false)}>
                                    <X size={16} />
                                    Annulla
                                </button>
                                <button className="btn-primary" onClick={handleAddBudget}>
                                    <Check size={16} />
                                    Alloca
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cocchi Modal */}
            {showCocchiModal && (
                <div className="modal-overlay" onClick={() => setShowCocchiModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Invia Cocchi a Utente</h3>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>Utente</label>
                                <select value={cocchiUser} onChange={(e) => setCocchiUser(e.target.value)}>
                                    <option value="">Seleziona utente...</option>
                                    {/* TODO: Load users */}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Importo (¢)</label>
                                <input
                                    type="number"
                                    value={cocchiAmount}
                                    onChange={(e) => setCocchiAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setShowCocchiModal(false)}>
                                    <X size={16} />
                                    Annulla
                                </button>
                                <button className="btn-primary" onClick={handleSendCocchi}>
                                    <Send size={16} />
                                    Invia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Crea Nuova Spesa</h3>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>Titolo</label>
                                <input
                                    type="text"
                                    value={expenseData.title}
                                    onChange={(e) => setExpenseData({ ...expenseData, title: e.target.value })}
                                    placeholder="Nome spesa..."
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Importo (€)</label>
                                    <input
                                        type="number"
                                        value={expenseData.amount}
                                        onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select
                                        value={expenseData.type}
                                        onChange={(e) => setExpenseData({ ...expenseData, type: e.target.value as any })}
                                    >
                                        <option value="fattura">Fattura</option>
                                        <option value="ricevuta">Ricevuta</option>
                                        <option value="bonifico">Bonifico</option>
                                        <option value="contanti">Contanti</option>
                                        <option value="carta">Carta</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="altro">Altro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descrizione</label>
                                <textarea
                                    value={expenseData.description}
                                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                                    placeholder="Dettagli spesa..."
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data Pagamento</label>
                                    <input
                                        type="date"
                                        value={expenseData.payment_date}
                                        onChange={(e) => setExpenseData({ ...expenseData, payment_date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={expenseData.is_recurring}
                                            onChange={(e) => setExpenseData({ ...expenseData, is_recurring: e.target.checked })}
                                        />
                                        {' '}Pagamento Ricorrente
                                    </label>
                                </div>
                            </div>
                            {expenseData.is_recurring && (
                                <div className="form-group">
                                    <label>Frequenza</label>
                                    <select
                                        value={expenseData.payment_frequency}
                                        onChange={(e) => setExpenseData({ ...expenseData, payment_frequency: e.target.value as any })}
                                    >
                                        <option value="weekly">Settimanale</option>
                                        <option value="monthly">Mensile</option>
                                        <option value="quarterly">Trimestrale</option>
                                        <option value="yearly">Annuale</option>
                                    </select>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setShowExpenseModal(false)}>
                                    <X size={16} />
                                    Annulla
                                </button>
                                <button className="btn-primary" onClick={handleCreateExpense}>
                                    <Plus size={16} />
                                    Crea Spesa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsciteCocchiCrmDetail;
