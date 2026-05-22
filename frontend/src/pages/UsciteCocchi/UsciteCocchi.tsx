import React, { useState } from 'react';
import { TrendingDown, Download, Filter, Plus, Check, X, Calendar, User, DollarSign } from 'lucide-react';
import './UsciteCocchi.css';

type TabType = 'all' | 'pending' | 'approved' | 'rejected';

const UsciteCocchi: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Mock Data - Uscite
    const uscite = [
        { id: 1, date: '2025-01-27', amount: 300, recipient: 'Marco Neri', category: 'Freelance Payment', status: 'approved', approvedBy: 'Admin', notes: 'Pagamento sviluppo backend' },
        { id: 2, date: '2025-01-26', amount: 450, recipient: 'Sofia Russo', category: 'Freelance Payment', status: 'approved', approvedBy: 'Admin', notes: 'Design UI progetto' },
        { id: 3, date: '2025-01-26', amount: 150, recipient: 'Server Hosting', category: 'Infrastructure', status: 'pending', approvedBy: null, notes: 'Canone mensile server' },
        { id: 4, date: '2025-01-25', amount: 500, recipient: 'Marketing Agency', category: 'Marketing', status: 'pending', approvedBy: null, notes: 'Campagna social media' },
        { id: 5, date: '2025-01-24', amount: 200, recipient: 'Software License', category: 'Software', status: 'approved', approvedBy: 'Admin', notes: 'Licenza Adobe Creative' },
        { id: 6, date: '2025-01-23', amount: 100, recipient: 'Office Supplies', category: 'Office', status: 'rejected', approvedBy: 'Admin', notes: 'Materiale ufficio' },
        { id: 7, date: '2025-01-22', amount: 350, recipient: 'Anna Ferrari', category: 'Freelance Payment', status: 'approved', approvedBy: 'Admin', notes: 'Content marketing' },
    ];

    // Categories
    const categories = ['all', 'Freelance Payment', 'Infrastructure', 'Marketing', 'Software', 'Office'];

    // Filter uscite
    const filteredUscite = uscite.filter(u => {
        const matchesTab = activeTab === 'all' || u.status === activeTab;
        const matchesCategory = categoryFilter === 'all' || u.category === categoryFilter;
        return matchesTab && matchesCategory;
    });

    // Stats
    const stats = {
        total: uscite.reduce((sum, u) => u.status !== 'rejected' ? sum + u.amount : sum, 0),
        pending: uscite.filter(u => u.status === 'pending').length,
        thisMonth: uscite.filter(u => new Date(u.date).getMonth() === new Date().getMonth()).reduce((sum, u) => sum + u.amount, 0),
    };

    // Stats per categoria
    const categoryStats = categories.slice(1).map(cat => {
        const total = uscite.filter(u => u.category === cat && u.status === 'approved').reduce((sum, u) => sum + u.amount, 0);
        return { category: cat, total };
    }).sort((a, b) => b.total - a.total);

    const tabs = [
        { id: 'all', label: 'Tutte', count: uscite.length },
        { id: 'pending', label: 'In Attesa', count: uscite.filter(u => u.status === 'pending').length },
        { id: 'approved', label: 'Approvate', count: uscite.filter(u => u.status === 'approved').length },
        { id: 'rejected', label: 'Rifiutate', count: uscite.filter(u => u.status === 'rejected').length },
    ];

    return (
        <div className="uscite-cocchi-page">

            {/* Header */}
            <div className="uscite-header">
                <div>
                    <h1>Uscite Cocchi</h1>
                    <p className="subtitle">Gestione completa uscite e pagamenti Cocchi</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export">
                        <Download size={16} />
                        Esporta
                    </button>
                    <button className="btn-new-uscita">
                        <Plus size={16} />
                        Nuova Uscita
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="uscite-stats">
                <div className="stat-card-uscite total">
                    <TrendingDown size={24} />
                    <div>
                        <div className="stat-label">Totale Uscite</div>
                        <div className="stat-value">€ {stats.total.toLocaleString('it-IT')}</div>
                    </div>
                </div>
                <div className="stat-card-uscite pending">
                    <Calendar size={24} />
                    <div>
                        <div className="stat-label">In Attesa Approvazione</div>
                        <div className="stat-value">{stats.pending}</div>
                    </div>
                </div>
                <div className="stat-card-uscite month">
                    <DollarSign size={24} />
                    <div>
                        <div className="stat-label">Uscite Questo Mese</div>
                        <div className="stat-value">€ {stats.thisMonth.toLocaleString('it-IT')}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="uscite-filters">
                <div className="filter-group">
                    <Filter size={16} />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="category-select">
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat === 'all' ? 'Tutte le categorie' : cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="uscite-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`uscite-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id as TabType)}
                    >
                        {tab.label}
                        <span className="tab-count">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Uscite Table */}
            <div className="uscite-table-container">
                <table className="uscite-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Destinatario</th>
                            <th>Categoria</th>
                            <th>Importo</th>
                            <th>Note</th>
                            <th>Approvato Da</th>
                            <th>Status</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUscite.map(uscita => (
                            <tr key={uscita.id}>
                                <td>{new Date(uscita.date).toLocaleDateString('it-IT')}</td>
                                <td className="recipient-cell">
                                    <User size={14} />
                                    {uscita.recipient}
                                </td>
                                <td>
                                    <span className={`category-badge ${uscita.category.toLowerCase().replace(' ', '-')}`}>
                                        {uscita.category}
                                    </span>
                                </td>
                                <td className="amount-cell">€ {uscita.amount.toLocaleString('it-IT')}</td>
                                <td className="notes-cell">{uscita.notes}</td>
                                <td>{uscita.approvedBy || '-'}</td>
                                <td>
                                    <span className={`status-badge-uscite ${uscita.status}`}>
                                        {uscita.status === 'approved' && '✓ Approvata'}
                                        {uscita.status === 'pending' && '⏳ In Attesa'}
                                        {uscita.status === 'rejected' && '✗ Rifiutata'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btns-uscite">
                                        {uscita.status === 'pending' && (
                                            <>
                                                <button className="btn-approve" title="Approva">
                                                    <Check size={14} />
                                                </button>
                                                <button className="btn-reject" title="Rifiuta">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Category Analytics */}
            <div className="category-analytics">
                <h2>Uscite per Categoria</h2>
                <div className="category-chart">
                    {categoryStats.map(stat => (
                        <div key={stat.category} className="category-bar-row">
                            <div className="category-label">{stat.category}</div>
                            <div className="category-bar-container">
                                <div
                                    className="category-bar-fill"
                                    style={{ width: `${(stat.total / categoryStats[0].total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="category-amount">€ {stat.total.toLocaleString('it-IT')}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UsciteCocchi;
