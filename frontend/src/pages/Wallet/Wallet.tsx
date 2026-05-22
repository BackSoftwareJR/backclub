import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, Tag, TrendingUp, TrendingDown, DollarSign, FileText, Receipt, Target, Wallet as WalletIcon } from 'lucide-react';
import './Wallet.css';

type WalletType = 'cliente' | 'utente' | 'progetto' | 'tipo';

interface Transaction {
    id: number;
    date: string;
    type: 'entrata' | 'uscita';
    amount: number;
    categoria: string;
    tipoSpesa: string;
    documentType: 'fattura' | 'ricevuta' | 'both';
    numero: string;
    note: string;
    clienteName?: string;
    utenteName?: string;
    progettoName?: string;
}

const Wallet: React.FC = () => {
    const navigate = useNavigate();
    const { type, id } = useParams<{ type: WalletType; id: string }>();
    const location = useLocation();
    const entityName = location.state?.name || decodeURIComponent(id || '');

    // Mock transactions - filter based on wallet type
    const allTransactions: Transaction[] = [
        { id: 1, date: '2025-01-27', type: 'entrata', amount: 10000, clienteName: 'Tech Solutions SRL', progettoName: 'Progetto Alpha', categoria: 'Fattura Progetto', tipoSpesa: 'Sviluppo Web', documentType: 'fattura', numero: 'FT-2025-001', note: 'Sito web completato' },
        { id: 2, date: '2025-01-26', type: 'uscita', amount: -450, utenteName: 'Sofia Russo', progettoName: 'Progetto Alpha', categoria: 'Pagamento Freelance', tipoSpesa: 'Design', documentType: 'ricevuta', numero: 'RC-2025-012', note: 'Design UI' },
        { id: 3, date: '2025-01-26', type: 'entrata', amount: 5000, clienteName: 'Startup Innovativa', progettoName: 'Progetto Beta', categoria: 'Acconto Progetto', tipoSpesa: 'Sviluppo App', documentType: 'fattura', numero: 'FT-2025-002', note: 'App mobile - acconto 50%' },
        { id: 4, date: '2025-01-25', type: 'uscita', amount: -200, utenteName: 'Admin', categoria: 'Abbonamento Software', tipoSpesa: 'Mantenimento', documentType: 'ricevuta', numero: 'RC-2025-013', note: 'Adobe Creative Cloud' },
        { id: 5, date: '2025-01-24', type: 'entrata', amount: 8000, clienteName: 'Enterprise Group', utenteName: 'Marco Bianchi', progettoName: 'Consulenza Mensile', categoria: 'Fattura Servizi', tipoSpesa: 'Consulenza', documentType: 'both', numero: 'FT-2025-003', note: 'Consulenza mensile' },
        { id: 6, date: '2025-01-23', type: 'uscita', amount: -350, utenteName: 'Anna Ferrari', progettoName: 'Progetto Beta', categoria: 'Pagamento Freelance', tipoSpesa: 'Marketing', documentType: 'ricevuta', numero: 'RC-2025-014', note: 'Content marketing' },
        { id: 7, date: '2025-01-22', type: 'entrata', amount: 3500, clienteName: 'Design Studio', progettoName: 'Branding Package', categoria: 'Fattura Progetto', tipoSpesa: 'Design', documentType: 'fattura', numero: 'FT-2025-004', note: 'Branding package' },
    ];

    // Filter transactions based on wallet type
    const transactions = allTransactions.filter(tx => {
        if (type === 'cliente' && tx.clienteName === entityName) return true;
        if (type === 'utente' && tx.utenteName === entityName) return true;
        if (type === 'progetto' && tx.progettoName === entityName) return true;
        if (type === 'tipo' && tx.tipoSpesa === entityName) return true;
        return false;
    });

    // Calculate stats
    const totalEntrate = transactions.filter(t => t.type === 'entrata').reduce((sum, t) => sum + t.amount, 0);
    const totalUscite = Math.abs(transactions.filter(t => t.type === 'uscita').reduce((sum, t) => sum + t.amount, 0));
    const saldo = totalEntrate - totalUscite;
    const transactionCount = transactions.length;

    // Project Budget Calculation
    // Budget = Entrate - Riserve (48%) - Risparmio (15%) = 37% Spendibile
    const budgetSpendibile = type === 'progetto' ? Math.round(totalEntrate * 0.37) : 0;
    const budgetSpeso = type === 'progetto' ? totalUscite : 0;
    const budgetRimanente = budgetSpendibile - budgetSpeso;

    // Get icon and title based on type
    const getWalletInfo = () => {
        switch (type) {
            case 'cliente':
                return { icon: User, title: 'Wallet Cliente', color: '#0A84FF' };
            case 'utente':
                return { icon: User, title: 'Wallet Utente', color: '#34C759' };
            case 'progetto':
                return { icon: Briefcase, title: 'Wallet Progetto', color: '#BF5AF2' };
            case 'tipo':
                return { icon: Tag, title: 'Wallet Tipo Spesa', color: '#FF9F0A' };
            default:
                return { icon: DollarSign, title: 'Wallet', color: '#FFFFFF' };
        }
    };

    const walletInfo = getWalletInfo();
    const WalletIconComponent = walletInfo.icon;

    return (
        <div className="wallet-page">

            <div className="wallet-header" style={{ borderLeftColor: walletInfo.color }}>
                <button className="btn-back-wallet" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Torna a Uscite
                </button>
                <div className="wallet-title-section">
                    <div className="wallet-icon-wrapper" style={{ background: `${walletInfo.color}20`, color: walletInfo.color }}>
                        <WalletIconComponent size={32} />
                    </div>
                    <div>
                        <h1>{walletInfo.title}</h1>
                        <h2 className="entity-name">{entityName}</h2>
                    </div>
                </div>
            </div>

            {/* Project-specific Budget Stats */}
            {type === 'progetto' ? (
                <>
                    <div className="budget-info-banner">
                        <Target size={20} />
                        <p>Budget Progetto: Entrate - Riserve (48%) - Risparmio (15%) = 37% Spendibile</p>
                    </div>
                    <div className="wallet-stats-grid">
                        <div className="wallet-stat-card entrate">
                            <div className="stat-icon"><TrendingUp size={24} /></div>
                            <div>
                                <div className="stat-label">Entrate Cocchi</div>
                                <div className="stat-value">¢{totalEntrate.toLocaleString('it-IT')}</div>
                            </div>
                        </div>
                        <div className="wallet-stat-card budget">
                            <div className="stat-icon"><Target size={24} /></div>
                            <div>
                                <div className="stat-label">Budget Spendibile (37%)</div>
                                <div className="stat-value">¢{budgetSpendibile.toLocaleString('it-IT')}</div>
                            </div>
                        </div>
                        <div className="wallet-stat-card uscite">
                            <div className="stat-icon"><TrendingDown size={24} /></div>
                            <div>
                                <div className="stat-label">Budget Speso</div>
                                <div className="stat-value">¢{budgetSpeso.toLocaleString('it-IT')}</div>
                            </div>
                        </div>
                        <div className="wallet-stat-card saldo">
                            <div className="stat-icon"><WalletIcon size={24} /></div>
                            <div>
                                <div className="stat-label">Budget Rimanente</div>
                                <div className={`stat-value ${budgetRimanente >= 0 ? 'positive' : 'negative'}`}>
                                    ¢{budgetRimanente.toLocaleString('it-IT')}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="wallet-stats-grid">
                    <div className="wallet-stat-card transactions">
                        <div className="stat-icon"><FileText size={24} /></div>
                        <div>
                            <div className="stat-label">Transazioni Totali</div>
                            <div className="stat-value">{transactionCount}</div>
                        </div>
                    </div>
                    <div className="wallet-stat-card entrate">
                        <div className="stat-icon"><TrendingUp size={24} /></div>
                        <div>
                            <div className="stat-label">Entrate Cocchi</div>
                            <div className="stat-value">¢{totalEntrate.toLocaleString('it-IT')}</div>
                        </div>
                    </div>
                    <div className="wallet-stat-card uscite">
                        <div className="stat-icon"><TrendingDown size={24} /></div>
                        <div>
                            <div className="stat-label">Uscite Cocchi</div>
                            <div className="stat-value">¢{totalUscite.toLocaleString('it-IT')}</div>
                        </div>
                    </div>
                    <div className="wallet-stat-card saldo">
                        <div className="stat-icon"><DollarSign size={24} /></div>
                        <div>
                            <div className="stat-label">Saldo</div>
                            <div className={`stat-value ${saldo >= 0 ? 'positive' : 'negative'}`}>
                                ¢{saldo.toLocaleString('it-IT')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="wallet-transactions-section">
                <h3>Elenco Transazioni</h3>
                <div className="wallet-transactions-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                {type !== 'cliente' && <th>Cliente</th>}
                                {type !== 'utente' && <th>Utente</th>}
                                {type !== 'progetto' && <th>Progetto</th>}
                                {type !== 'tipo' && <th>Tipo Spesa</th>}
                                <th>Documento</th>
                                <th>Importo</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                                    <td>
                                        <span className={`type-badge ${tx.type}`}>
                                            {tx.type === 'entrata' ? 'Entrata' : 'Uscita'}
                                        </span>
                                    </td>
                                    {type !== 'cliente' && <td>{tx.clienteName || '-'}</td>}
                                    {type !== 'utente' && <td>{tx.utenteName || '-'}</td>}
                                    {type !== 'progetto' && <td>{tx.progettoName || '-'}</td>}
                                    {type !== 'tipo' && <td>{tx.tipoSpesa}</td>}
                                    <td>
                                        <span className="doc-icon">
                                            {tx.documentType === 'fattura' && <FileText size={14} />}
                                            {tx.documentType === 'ricevuta' && <Receipt size={14} />}
                                            {tx.documentType === 'both' && <>
                                                <FileText size={14} />
                                                <Receipt size={14} />
                                            </>}
                                        </span>
                                    </td>
                                    <td className={`amount-cell ${tx.type}`}>
                                        {tx.type === 'entrata' ? '+' : ''}¢{Math.abs(tx.amount).toLocaleString('it-IT')}
                                    </td>
                                    <td className="note-cell">{tx.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {transactions.length === 0 && (
                <div className="no-transactions-wallet">
                    <FileText size={48} />
                    <p>Nessuna transazione trovata</p>
                    <small>per questo {type}</small>
                </div>
            )}
        </div>
    );
};

export default Wallet;
