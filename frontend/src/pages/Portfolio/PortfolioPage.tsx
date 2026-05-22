import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowDownRight,
  LogOut,
  Receipt,
  Banknote,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  portfolioApi,
  getPortfolioToken,
  setPortfolioToken,
  clearPortfolioToken,
  type PortfolioTransaction,
  type PortfolioDashboard,
} from '../../api/portfolio';
import './PortfolioPage.css';

const PRIVACY_KEY = 'portfolio_privacy_hidden';

const getPrivacyStored = () => localStorage.getItem(PRIVACY_KEY) === 'true';
const setPrivacyStored = (v: boolean) => localStorage.setItem(PRIVACY_KEY, String(v));

const maskAmount = (hidden: boolean) => (hidden ? '••••••' : null);
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

const COLORS = { invoice_settled: '#22c55e', deposit: '#3b82f6', expense: '#ef4444', withdrawal: '#f59e0b' };

const PortfolioPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(getPortfolioToken());
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [sendCodeMessage, setSendCodeMessage] = useState('');

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [dashboard, setDashboard] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const [privacyHidden, setPrivacyHidden] = useState(getPrivacyStored);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalDesc, setWithdrawalDesc] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDesc, setDepositDesc] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [balanceRes, transRes, dashRes] = await Promise.all([
        portfolioApi.getBalance(),
        portfolioApi.getTransactions({ per_page: 100 }),
        portfolioApi.getDashboard(),
      ]);
      setBalance(balanceRes.data?.balance ?? 0);
      setTransactions(transRes.data ?? []);
      setDashboard(dashRes.data ?? null);
    } catch {
      setBalance(0);
      setTransactions([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setCodeLoading(true);
    try {
      const res = await portfolioApi.verifyCode(code.trim());
      if (res.success && res.token) {
        setPortfolioToken(res.token);
        setToken(res.token);
      } else setCodeError('Codice non valido');
    } catch {
      setCodeError('Codice non valido');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSendCode = async () => {
    setSendCodeMessage('');
    setSendCodeLoading(true);
    try {
      const res = await portfolioApi.sendCode();
      setSendCodeMessage(res.message || 'Codice inviato. Controlla la posta (anche spam).');
    } catch (err: any) {
      setSendCodeMessage(err.response?.data?.message || 'Errore nell\'invio dell\'email.');
    } finally {
      setSendCodeLoading(false);
    }
  };

  const togglePrivacy = () => {
    setPrivacyHidden((prev) => {
      const next = !prev;
      setPrivacyStored(next);
      return next;
    });
  };

  const handleLogout = () => {
    clearPortfolioToken();
    setToken(null);
    setBalance(null);
    setTransactions([]);
    setDashboard(null);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Inserisci un importo valido');
      return;
    }
    setSubmitLoading(true);
    try {
      await portfolioApi.addExpense({
        amount,
        description: expenseDesc.trim() || undefined,
        transaction_date: expenseDate,
      });
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDesc('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      loadData();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Errore nel salvataggio');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Inserisci un importo valido');
      return;
    }
    setSubmitLoading(true);
    try {
      await portfolioApi.addWithdrawal({
        amount,
        description: withdrawalDesc.trim() || 'Prelievo personale',
        transaction_date: withdrawalDate,
      });
      setShowWithdrawalModal(false);
      setWithdrawalAmount('');
      setWithdrawalDesc('');
      setWithdrawalDate(new Date().toISOString().split('T')[0]);
      loadData();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Errore nel salvataggio');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Inserisci un importo valido');
      return;
    }
    setSubmitLoading(true);
    try {
      await portfolioApi.addDeposit({
        amount,
        description: depositDesc.trim() || 'Versamento personale',
        transaction_date: depositDate,
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositDesc('');
      setDepositDate(new Date().toISOString().split('T')[0]);
      loadData();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Errore nel salvataggio');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT');

  const getTypeLabel = (t: PortfolioTransaction['type']) => {
    if (t === 'invoice_settled') return 'Fattura incassata';
    if (t === 'deposit') return 'Versamento';
    if (t === 'expense') return 'Spesa';
    return 'Prelievo';
  };

  const getTypeIcon = (t: PortfolioTransaction['type']) => {
    if (t === 'invoice_settled') return <ArrowDownLeft size={18} />;
    if (t === 'deposit') return <ArrowDownRight size={18} />;
    if (t === 'withdrawal') return <Banknote size={18} />;
    return <Receipt size={18} />;
  };

  const displayBalance = privacyHidden ? maskAmount(true) : formatCurrency(balance ?? 0);
  const displayAmount = (n: number) => (privacyHidden ? '••••••' : (n >= 0 ? '+' : '') + formatCurrency(n));

  const pieData = dashboard?.totals_by_type
    ? Object.entries(dashboard.totals_by_type)
        .filter(([, v]) => v !== 0)
        .map(([name, value]) => ({
          name: name === 'invoice_settled' ? 'Fatture' : name === 'deposit' ? 'Versamenti' : name === 'expense' ? 'Spese' : 'Prelievi',
          value: Math.abs(value),
          color: COLORS[name as keyof typeof COLORS] || '#888',
        }))
    : [];

  // ——— Code gate (login) ———
  if (!token) {
    return (
      <div className="portfolio-app portfolio-code-gate">
        <div className="portfolio-code-box">
          <div className="portfolio-code-header">
            <Lock size={32} />
            <h1>Portfolio Azienda</h1>
            <p>Inserisci il codice a 6 cifre ricevuto via email</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="portfolio-code-form">
            {codeError && <div className="portfolio-code-error">{codeError}</div>}
            {sendCodeMessage && (
              <div className={sendCodeMessage.startsWith('Codice inviato') ? 'portfolio-code-success' : 'portfolio-code-error'}>
                {sendCodeMessage}
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Codice a 6 cifre"
              maxLength={6}
              autoFocus
              disabled={codeLoading}
            />
            <button type="submit" disabled={codeLoading}>
              {codeLoading ? 'Verifica...' : 'Accedi'}
            </button>
            <button type="button" className="portfolio-send-code-btn" onClick={handleSendCode} disabled={sendCodeLoading}>
              <Mail size={18} />
              {sendCodeLoading ? 'Invio in corso...' : 'Invia codice per email'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ——— Main app (bank-style) ———
  return (
    <div className="portfolio-app">
      <header className="portfolio-app-header">
        <div className="portfolio-app-brand">
          <Shield size={24} />
          <div>
            <h1>Portfolio</h1>
            <span className="portfolio-app-subtitle">BackClub · Conto aziendale</span>
          </div>
        </div>
        <div className="portfolio-app-header-actions">
          <button
            type="button"
            className="portfolio-btn-icon"
            onClick={togglePrivacy}
            title={privacyHidden ? 'Mostra importi' : 'Nascondi importi'}
            aria-label={privacyHidden ? 'Mostra importi' : 'Nascondi importi'}
          >
            {privacyHidden ? <Eye size={22} /> : <EyeOff size={22} />}
          </button>
          <button type="button" className="portfolio-logout" onClick={handleLogout} title="Esci">
            <LogOut size={20} />
            Esci
          </button>
        </div>
      </header>

      <main className="portfolio-app-main">
        {loading ? (
          <div className="portfolio-loading">
            <div className="portfolio-loading-spinner" />
            <p>Caricamento...</p>
          </div>
        ) : (
          <>
            <section className="portfolio-hero">
              <div className="portfolio-hero-card">
                <span className="portfolio-hero-label">Saldo disponibile</span>
                <span className="portfolio-hero-value">{displayBalance}</span>
              </div>
            </section>

            <section className="portfolio-quick-actions">
              <button type="button" className="portfolio-action-btn portfolio-action-deposit" onClick={() => setShowDepositModal(true)}>
                <ArrowDownRight size={24} />
                <span>Versamento</span>
              </button>
              <button type="button" className="portfolio-action-btn portfolio-action-expense" onClick={() => setShowExpenseModal(true)}>
                <Receipt size={24} />
                <span>Spesa</span>
              </button>
              <button type="button" className="portfolio-action-btn portfolio-action-withdrawal" onClick={() => setShowWithdrawalModal(true)}>
                <Banknote size={24} />
                <span>Prelievo</span>
              </button>
            </section>

            {dashboard?.balance_history && dashboard.balance_history.length > 0 && (
              <section className="portfolio-chart-section">
                <h2>Andamento saldo (ultimi 12 mesi)</h2>
                <div className="portfolio-chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dashboard.balance_history} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                      <YAxis hide={privacyHidden} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={(v) => (privacyHidden ? '••••' : `€ ${v}`)} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                        formatter={(value: number | undefined) => [value != null && !privacyHidden ? formatCurrency(value) : (privacyHidden ? '••••••' : '–'), 'Saldo']}
                        labelFormatter={(label) => label}
                      />
                      <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {pieData.length > 0 && (
              <section className="portfolio-chart-section">
                <h2>Ripartizione (ultimi 12 mesi)</h2>
                <div className="portfolio-pie-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                        formatter={(value: number | undefined) => [value != null && !privacyHidden ? formatCurrency(value) : (privacyHidden ? '••••••' : '–'), '']}
                      />
                      <Legend formatter={() => null} />
                    </PieChart>
                  </ResponsiveContainer>
                  {!privacyHidden && (
                    <div className="portfolio-pie-legend">
                      {pieData.map((d) => (
                        <span key={d.name} className="portfolio-pie-legend-item">
                          <span className="portfolio-pie-legend-dot" style={{ background: d.color }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="portfolio-movements">
              <h2>Ultimi movimenti</h2>
              {transactions.length === 0 ? (
                <p className="portfolio-empty">Nessun movimento.</p>
              ) : (
                <ul className="portfolio-movement-list">
                  {transactions.map((t) => (
                    <li key={t.id} className={`portfolio-movement-item portfolio-movement-${t.type}`}>
                      <span className="portfolio-movement-icon">{getTypeIcon(t.type)}</span>
                      <div className="portfolio-movement-main">
                        <span className="portfolio-movement-type">{getTypeLabel(t.type)}</span>
                        <span className="portfolio-movement-desc">{t.description || '-'}</span>
                        <span className="portfolio-movement-date">{formatDate(t.transaction_date)}</span>
                      </div>
                      <span className={`portfolio-movement-amount ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                        {displayAmount(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modals */}
      {showExpenseModal && (
        <div className="portfolio-modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="portfolio-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registra spesa</h3>
            <form onSubmit={handleAddExpense}>
              {submitError && <div className="portfolio-modal-error">{submitError}</div>}
              <label>Importo (€) *</label>
              <input type="number" step="0.01" min="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required />
              <label>Descrizione</label>
              <input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Es. Ufficio, materiale..." />
              <label>Data *</label>
              <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
              <div className="portfolio-modal-actions">
                <button type="button" onClick={() => setShowExpenseModal(false)}>Annulla</button>
                <button type="submit" disabled={submitLoading}>{submitLoading ? 'Salvataggio...' : 'Salva'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdrawalModal && (
        <div className="portfolio-modal-overlay" onClick={() => setShowWithdrawalModal(false)}>
          <div className="portfolio-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Prelievo personale</h3>
            <form onSubmit={handleAddWithdrawal}>
              {submitError && <div className="portfolio-modal-error">{submitError}</div>}
              <label>Importo (€) *</label>
              <input type="number" step="0.01" min="0.01" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} required />
              <label>Note (opzionale)</label>
              <input type="text" value={withdrawalDesc} onChange={(e) => setWithdrawalDesc(e.target.value)} placeholder="Prelievo personale" />
              <label>Data *</label>
              <input type="date" value={withdrawalDate} onChange={(e) => setWithdrawalDate(e.target.value)} required />
              <div className="portfolio-modal-actions">
                <button type="button" onClick={() => setShowWithdrawalModal(false)}>Annulla</button>
                <button type="submit" disabled={submitLoading}>{submitLoading ? 'Salvataggio...' : 'Salva'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="portfolio-modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="portfolio-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Versamento personale</h3>
            <form onSubmit={handleAddDeposit}>
              {submitError && <div className="portfolio-modal-error">{submitError}</div>}
              <label>Importo (€) *</label>
              <input type="number" step="0.01" min="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
              <label>Descrizione (opzionale)</label>
              <input type="text" value={depositDesc} onChange={(e) => setDepositDesc(e.target.value)} placeholder="Versamento personale" />
              <label>Data *</label>
              <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
              <div className="portfolio-modal-actions">
                <button type="button" onClick={() => setShowDepositModal(false)}>Annulla</button>
                <button type="submit" disabled={submitLoading}>{submitLoading ? 'Salvataggio...' : 'Salva'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
