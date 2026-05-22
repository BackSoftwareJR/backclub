import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Filter, Download, FileText, Receipt, X, Calendar, User, DollarSign, Tag, Briefcase } from 'lucide-react';
import './UsciteCocchiDetail.css';

type FilterType = 'all' | 'entrata' | 'uscita';
type DocumentType = 'all' | 'fattura' | 'ricevuta';

interface Transaction {
    id: number;
    date: string;
    type: 'entrata' | 'uscita';
    amount: number;
    // Multi-entity relationships
    clienteId?: number;
    clienteName?: string;
    utenteId?: number;
    utenteName?: string;
    progettoId?: number;
    progettoName?: string;
    // Category/Type  
    categoria: string;
    tipoSpesa: string;
    documentType: 'fattura' | 'ricevuta' | 'both';
    numero: string;
    note: string;
}

const UsciteCocchiDetail: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [documentFilter, setDocumentFilter] = useState<DocumentType>('all');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Mock Data - Transactions with multi-entity relationships
    const transactions: Transaction[] = [
        {
            id: 1, date: '2025-01-27', type: 'entrata', amount: 10000,
            clienteId: 1, clienteName: 'Tech Solutions SRL',
            progettoId: 1, progettoName: 'Progetto Alpha',
            categoria: 'Fattura Progetto', tipoSpesa: 'Sviluppo Web',
            documentType: 'fattura', numero: 'FT-2025-001', note: 'Sito web completato'
        },
        {
            id: 2, date: '2025-01-26', type: 'uscita', amount: -450,
            utenteId: 1, utenteName: 'Sofia Russo',
            progettoId: 1, progettoName: 'Progetto Alpha',
            categoria: 'Pagamento Freelance', tipoSpesa: 'Design',
            documentType: 'ricevuta', numero: 'RC-2025-012', note: 'Design UI'
        },
        {
            id: 3, date: '2025-01-26', type: 'entrata', amount: 5000,
            clienteId: 2, clienteName: 'Startup Innovativa',
            progettoId: 2, progettoName: 'Progetto Beta',
            categoria: 'Acconto Progetto', tipoSpesa: 'Sviluppo App',
            documentType: 'fattura', numero: 'FT-2025-002', note: 'App mobile - acconto 50%'
        },
        {
            id: 4, date: '2025-01-25', type: 'uscita', amount: -200,
            utenteId: 2, utenteName: 'Admin',
            categoria: 'Abbonamento Software', tipoSpesa: 'Mantenimento',
            documentType: 'ricevuta', numero: 'RC-2025-013', note: 'Adobe Creative Cloud'
        },
        {
            id: 5, date: '2025-01-24', type: 'entrata', amount: 8000,
            clienteId: 3, clienteName: 'Enterprise Group',
            utenteId: 3, utenteName: 'Marco Bianchi',
            progettoId: 3, progettoName: 'Consulenza Mensile',
            categoria: 'Fattura Servizi', tipoSpesa: 'Consulenza',
            documentType: 'both', numero: 'FT-2025-003', note: 'Consulenza mensile'
        },
        {
            id: 6, date: '2025-01-23', type: 'uscita', amount: -350,
            utenteId: 4, utenteName: 'Anna Ferrari',
            progettoId: 2, progettoName: 'Progetto Beta',
            categoria: 'Pagamento Freelance', tipoSpesa: 'Marketing',
            documentType: 'ricevuta', numero: 'RC-2025-014', note: 'Content marketing'
        },
        {
            id: 7, date: '2025-01-22', type: 'entrata', amount: 3500,
            clienteId: 4, clienteName: 'Design Studio',
            progettoId: 4, progettoName: 'Branding Package',
            categoria: 'Fattura Progetto', tipoSpesa: 'Design',
            documentType: 'fattura', numero: 'FT-2025-004', note: 'Branding package'
        },
    ];

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        const matchesType = filterType === 'all' || tx.type === filterType;
        const matchesDocument = documentFilter === 'all' || tx.documentType === documentFilter || tx.documentType === 'both';
        const matchesSearch = searchQuery === '' ||
            tx.clienteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.utenteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.progettoName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.tipoSpesa.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.note.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesType && matchesDocument && matchesSearch;
    });

    // Stats
    const totalEntrate = transactions.filter(t => t.type === 'entrata').reduce((sum, t) => sum + t.amount, 0);
    const totalUscite = Math.abs(transactions.filter(t => t.type === 'uscita').reduce((sum, t) => sum + t.amount, 0));
    const saldo = totalEntrate - totalUscite;

    // Navigation to wallet pages
    const goToClienteWallet = (id: number, name: string) => {
        navigate(`/wallet/cliente/${id}`, { state: { name } });
    };

    const goToUtenteWallet = (id: number, name: string) => {
        navigate(`/wallet/utente/${id}`, { state: { name } });
    };

    const goToProgettoWallet = (id: number, name: string) => {
        navigate(`/wallet/progetto/${id}`, { state: { name } });
    };

    const goToTipoWallet = (tipo: string) => {
        navigate(`/wallet/tipo/${encodeURIComponent(tipo)}`);
    };

    return (
        <div className="uscite-detail-page">

            {/* Header */}
            <div className="uscite-detail-header">
                <button className="btn-back-uscite" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Torna a Spese
                </button>
                <h1>Dettaglio Uscite Cocchi</h1>
                <p className="subtitle">Visualizza e cerca tutte le transazioni in entrata e uscita</p>
            </div>

            {/* Stats Row */}
            <div className="uscite-stats-row">
                <div className="uscite-stat-card entrate">
                    <div className="stat-label">Entrate Cocchi</div>
                    <div className="stat-value">¢ {totalEntrate.toLocaleString('it-IT')}</div>
                </div>
                <div className="uscite-stat-card uscite-stat">
                    <div className="stat-label">Uscite Cocchi</div>
                    <div className="stat-value">¢ {totalUscite.toLocaleString('it-IT')}</div>
                </div>
                <div className="uscite-stat-card saldo">
                    <div className="stat-label">Saldo</div>
                    <div className="stat-value">¢ {saldo.toLocaleString('it-IT')}</div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="uscite-controls">
                <div className="search-bar-uscite">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca per cliente, utente, progetto, categoria, tipo, numero documento, note..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filters-row">
                    <div className="filter-group-uscite">
                        <Filter size={16} />
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}>
                            <option value="all">Tutte le transazioni</option>
                            <option value="entrata">Solo Entrate</option>
                            <option value="uscita">Solo Uscite</option>
                        </select>
                    </div>
                    <div className="filter-group-uscite">
                        <FileText size={16} />
                        <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value as DocumentType)}>
                            <option value="all">Tutti i documenti</option>
                            <option value="fattura">Solo Fatture</option>
                            <option value="ricevuta">Solo Ricevute</option>
                        </select>
                    </div>
                    <button className="btn-export-uscite">
                        <Download size={16} />
                        Esporta

                    </button>
                </div>
            </div>

            {/* Results Count */}
            <div className="results-count">
                Mostrando {filteredTransactions.length} di {transactions.length} transazioni
            </div>

            {/* Transactions Table */}
            <div className="uscite-table-container">
                <table className="uscite-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Cliente</th>
                            <th>Utente</th>
                            <th>Progetto</th>
                            <th>Tipo Spesa</th>
                            <th>Documento</th>
                            <th>Importo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id}>
                                <td>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                                <td>
                                    <span className={`type-badge ${tx.type}`}>
                                        {tx.type === 'entrata' ? 'Entrata' : 'Uscita'}
                                    </span>
                                </td>
                                <td>
                                    {tx.clienteId ? (
                                        <button
                                            className="link-button"
                                            onClick={() => goToClienteWallet(tx.clienteId!, tx.clienteName!)}
                                        >
                                            <User size={14} />
                                            {tx.clienteName}
                                        </button>
                                    ) : '-'}
                                </td>
                                <td>
                                    {tx.utenteId ? (
                                        <button
                                            className="link-button"
                                            onClick={() => goToUtenteWallet(tx.utenteId!, tx.utenteName!)}
                                        >
                                            <User size={14} />
                                            {tx.utenteName}
                                        </button>
                                    ) : '-'}
                                </td>
                                <td>
                                    {tx.progettoId ? (
                                        <button
                                            className="link-button"
                                            onClick={() => goToProgettoWallet(tx.progettoId!, tx.progettoName!)}
                                        >
                                            <Briefcase size={14} />
                                            {tx.progettoName}
                                        </button>
                                    ) : '-'}
                                </td>
                                <td>
                                    <button
                                        className="link-button tipo-link"
                                        onClick={() => goToTipoWallet(tx.tipoSpesa)}
                                    >
                                        <Tag size={14} />
                                        {tx.tipoSpesa}
                                    </button>
                                </td>
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
                                    {tx.type === 'entrata' ? '+' : ''}¢ {Math.abs(tx.amount).toLocaleString('it-IT')}
                                </td>
                                <td>
                                    <button className="btn-view-detail" onClick={() => setSelectedTransaction(tx)}>Dettaglio</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredTransactions.length === 0 && (
                <div className="no-results">
                    <Search size={48} />
                    <p>Nessuna transazione trovata</p>
                    <small>Prova a modificare i filtri di ricerca</small>
                </div>
            )}

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
                    <div className="modal-content transaction-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Dettaglio Transazione</h2>
                            <button className="btn-close-modal" onClick={() => setSelectedTransaction(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <div className="detail-label">
                                        <Calendar size={16} />
                                        Data
                                    </div>
                                    <div className="detail-value">{new Date(selectedTransaction.date).toLocaleDateString('it-IT')}</div>
                                </div>
                                <div className="detail-item">
                                    <div className="detail-label">
                                        <Tag size={16} />
                                        Tipo
                                    </div>
                                    <div className="detail-value">
                                        <span className={`type-badge ${selectedTransaction.type}`}>
                                            {selectedTransaction.type === 'entrata' ? 'Entrata' : 'Uscita'}
                                        </span>
                                    </div>
                                </div>
                                {selectedTransaction.clienteId && (
                                    <div className="detail-item">
                                        <div className="detail-label">
                                            <User size={16} />
                                            Cliente
                                        </div>
                                        <div className="detail-value">{selectedTransaction.clienteName}</div>
                                    </div>
                                )}
                                {selectedTransaction.utenteId && (
                                    <div className="detail-item">
                                        <div className="detail-label">
                                            <User size={16} />
                                            Utente
                                        </div>
                                        <div className="detail-value">{selectedTransaction.utenteName}</div>
                                    </div>
                                )}
                                {selectedTransaction.progettoId && (
                                    <div className="detail-item">
                                        <div className="detail-label">
                                            <Briefcase size={16} />
                                            Progetto
                                        </div>
                                        <div className="detail-value">{selectedTransaction.progettoName}</div>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <div className="detail-label">
                                        <DollarSign size={16} />
                                        Importo
                                    </div>
                                    <div className={`detail-value amount-big ${selectedTransaction.type}`}>
                                        {selectedTransaction.type === 'entrata' ? '+' : ''}¢ {Math.abs(selectedTransaction.amount).toLocaleString('it-IT')}
                                    </div>
                                </div>
                                <div className="detail-item full-width">
                                    <div className="detail-label">
                                        <Tag size={16} />
                                        Tipo Spesa
                                    </div>
                                    <div className="detail-value">{selectedTransaction.tipoSpesa}</div>
                                </div>
                                <div className="detail-item full-width">
                                    <div className="detail-label">
                                        <FileText size={16} />
                                        Categoria
                                    </div>
                                    <div className="detail-value">{selectedTransaction.categoria}</div>
                                </div>
                                <div className="detail-item full-width">
                                    <div className="detail-label">
                                        {selectedTransaction.documentType === 'fattura' ? <FileText size={16} /> : <Receipt size={16} />}
                                        Numero Documento
                                    </div>
                                    <div className="detail-value numero-doc">{selectedTransaction.numero}</div>
                                </div>
                                <div className="detail-item full-width">
                                    <div className="detail-label">Note</div>
                                    <div className="detail-value">{selectedTransaction.note}</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-secondary" onClick={() => setSelectedTransaction(null)}>Chiudi</button>
                            <button className="btn-modal-primary">
                                <Download size={16} />
                                Scarica Documento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsciteCocchiDetail;
