import React, { useState } from 'react';
import { TrendingUp, Package, FileText, Users, Briefcase, BarChart3, Plus, Minus, Download, Edit, Trash2, AlertCircle, DollarSign } from 'lucide-react';
import './Venditori.css';

type TabType = 'overview' | 'listini' | 'contratti' | 'venditori' | 'operativa' | 'analytics';

const Venditori: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [selectedContractStatus, setSelectedContractStatus] = useState<string>('tutti');

    // Product prices state (for quick edit)
    const [productPrices, setProductPrices] = useState<Record<number, number>>({
        1: 8000,
        2: 450,
        3: 3600,
        4: 50,
        5: 5500
    });

    // Mock Data - KPIs
    const kpis = {
        mrr: 45800,
        activeContracts: 87,
        pendingRenewals: 12,
        monthSales: 128400
    };

    // Mock Data - Product Catalog
    const products = [
        { id: 1, name: 'Sito Web Professionale', type: 'one-off', price: 8000, discount: 15, variants: false },
        { id: 2, name: 'CRM Canone Mensile', type: 'recurring-monthly', price: 450, discount: 10, variants: false },
        { id: 3, name: 'Assistenza Annuale', type: 'recurring-annual', price: 3600, discount: 20, variants: false },
        { id: 4, name: 'Pacchetto Lead', type: 'consumption', price: 50, discount: 5, variants: false },
        { id: 5, name: 'Bundle Start CRM', type: 'bundle', price: 5500, discount: 25, variants: false },
    ];

    // Price adjustment handlers
    const incrementPrice = (productId: number, amount: number) => {
        setProductPrices(prev => ({
            ...prev,
            [productId]: prev[productId] + amount
        }));
    };

    const decrementPrice = (productId: number, amount: number) => {
        setProductPrices(prev => ({
            ...prev,
            [productId]: Math.max(0, prev[productId] - amount)
        }));
    };

    // Mock Data - Contracts
    const contracts = [
        { id: 1, client: 'Tech Solutions SRL', product: 'CRM Canone', status: 'active', value: 5400, renewalDate: '2025-06-15', seller: 'Mario Rossi' },
        { id: 2, client: 'Startup Innovativa', product: 'Sito Web', status: 'awaiting-signature', value: 8000, renewalDate: null, seller: 'Laura Bianchi' },
        { id: 3, client: 'Enterprise Group', product: 'Assistenza', status: 'expiring', value: 3600, renewalDate: '2025-02-10', seller: 'Mario Rossi' },
        { id: 4, client: 'Design Studio', product: 'Bundle Start', status: 'draft', value: 5500, renewalDate: null, seller: 'Laura Bianchi' },
        { id: 5, client: 'Media Agency', product: 'Pacchetto Lead', status: 'expired', value: 2500, renewalDate: '2024-12-20', seller: 'Giovanni Verdi' },
    ];

    // Mock Data - Sellers
    const sellers = [
        { id: 1, name: 'Mario Rossi', territory: 'Nord Italia', contracts: 28, revenue: 156000, commission: 15600, pending: 2 },
        { id: 2, name: 'Laura Bianchi', territory: 'Centro Italia', contracts: 34, revenue: 189000, commission: 18900, pending: 1 },
        { id: 3, name: 'Giovanni Verdi', territory: 'Sud Italia', contracts: 25, revenue: 132000, commission: 13200, pending: 0 },
    ];

    // Mock Data - Operations
    const operations = [
        { id: 1, project: 'Sito Web Tech Solutions', client: 'Tech Solutions', status: 'in-progress', progress: 65, hours: { used: 18, total: 20 } },
        { id: 2, project: 'CRM Enterprise Group', client: 'Enterprise Group', status: 'testing', progress: 90, hours: { used: 45, total: 50 } },
        { id: 3, project: 'Assistenza Design Studio', client: 'Design Studio', status: 'delivered', progress: 100, hours: { used: 12, total: 15 } },
    ];

    // Mock Data - Analytics
    const salesByCategory = [
        { category: 'Siti Web', value: 45, color: '#0A84FF' },
        { category: 'CRM', value: 30, color: '#34C759' },
        { category: 'Lead Generation', value: 15, color: '#FF9F0A' },
        { category: 'Assistenza', value: 10, color: '#BF5AF2' },
    ];

    const filteredContracts = selectedContractStatus === 'tutti'
        ? contracts
        : contracts.filter(c => c.status === selectedContractStatus);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string; class: string }> = {
            'draft': { label: 'Bozza', class: 'draft' },
            'awaiting-signature': { label: 'In Attesa Firma', class: 'awaiting' },
            'active': { label: 'Attivo', class: 'active' },
            'expiring': { label: 'In Scadenza', class: 'expiring' },
            'expired': { label: 'Scaduto', class: 'expired' },
        };
        return badges[status] || { label: status, class: '' };
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'listini', label: 'Configuratore Listini', icon: Package },
        { id: 'contratti', label: 'Gestione Contratti', icon: FileText },
        { id: 'venditori', label: 'Amministrazione Venditori', icon: Users },
        { id: 'operativa', label: 'Gestione Operativa', icon: Briefcase },
        { id: 'analytics', label: 'Dashboard Analitica', icon: BarChart3 },
    ];

    return (
        <div className="venditori-page">

            {/* Header */}
            <div className="venditori-header">
                <h1>Dashboard Venditori</h1>
                <p className="subtitle">Gestione completa vendite e contratti</p>
            </div>

            {/* Tabs */}
            <div className="venditori-tabs">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`vendor-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as TabType)}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="vendor-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="overview-section">
                        <div className="kpi-grid">
                            <div className="kpi-card mrr">
                                <div className="kpi-icon"><DollarSign size={24} /></div>
                                <div className="kpi-info">
                                    <div className="kpi-label">MRR</div>
                                    <div className="kpi-value">€ {kpis.mrr.toLocaleString('it-IT')}</div>
                                    <div className="kpi-change">+12% vs mese scorso</div>
                                </div>
                            </div>
                            <div className="kpi-card contracts">
                                <div className="kpi-icon"><FileText size={24} /></div>
                                <div className="kpi-info">
                                    <div className="kpi-label">Contratti Attivi</div>
                                    <div className="kpi-value">{kpis.activeContracts}</div>
                                </div>
                            </div>
                            <div className="kpi-card renewals">
                                <div className="kpi-icon"><AlertCircle size={24} /></div>
                                <div className="kpi-info">
                                    <div className="kpi-label">Rinnovi Pending</div>
                                    <div className="kpi-value">{kpis.pendingRenewals}</div>
                                </div>
                            </div>
                            <div className="kpi-card sales">
                                <div className="kpi-icon"><TrendingUp size={24} /></div>
                                <div className="kpi-info">
                                    <div className="kpi-label">Vendite Mese</div>
                                    <div className="kpi-value">€ {kpis.monthSales.toLocaleString('it-IT')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Listini Tab */}
                {activeTab === 'listini' && (
                    <div className="listini-section">
                        <div className="section-header-vendor">
                            <h2>Configuratore Listini</h2>
                            <button className="btn-add-vendor">
                                <Plus size={16} />
                                Nuovo Prodotto
                            </button>
                        </div>
                        <div className="products-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Prodotto</th>
                                        <th>Tipologia</th>
                                        <th>Prezzo</th>
                                        <th>Sconto Max</th>
                                        <th>Varianti</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id}>
                                            <td>{product.name}</td>
                                            <td>
                                                <span className={`type-badge ${product.type}`}>
                                                    {product.type === 'one-off' && 'Una Tantum'}
                                                    {product.type === 'recurring-monthly' && 'Ricorrente Mensile'}
                                                    {product.type === 'recurring-annual' && 'Ricorrente Annuale'}
                                                    {product.type === 'consumption' && 'A Consumo'}
                                                    {product.type === 'bundle' && 'Pacchetto'}
                                                </span>
                                            </td>
                                            <td className="price-cell-editable">
                                                <div className="price-editor">
                                                    <button
                                                        className="btn-price-adjust minus"
                                                        onClick={() => decrementPrice(product.id, product.type === 'consumption' ? 5 : 100)}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="price-input"
                                                        value={productPrices[product.id]}
                                                        onChange={(e) => setProductPrices(prev => ({
                                                            ...prev,
                                                            [product.id]: Math.max(0, parseInt(e.target.value) || 0)
                                                        }))}
                                                        min="0"
                                                    />
                                                    <button
                                                        className="btn-price-adjust plus"
                                                        onClick={() => incrementPrice(product.id, product.type === 'consumption' ? 5 : 100)}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td>{product.discount}%</td>
                                            <td>{product.variants ? 'Sì' : 'No'}</td>
                                            <td>
                                                <div className="action-btns-vendor">
                                                    <button className="btn-icon-vendor edit"><Edit size={14} /></button>
                                                    <button className="btn-icon-vendor delete"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Contratti Tab */}
                {activeTab === 'contratti' && (
                    <div className="contratti-section">
                        <div className="section-header-vendor">
                            <h2>Repository Contratti</h2>
                            <div className="header-actions-vendor">
                                <select
                                    value={selectedContractStatus}
                                    onChange={(e) => setSelectedContractStatus(e.target.value)}
                                    className="filter-select-vendor"
                                >
                                    <option value="tutti">Tutti gli stati</option>
                                    <option value="draft">Bozza</option>
                                    <option value="awaiting-signature">In Attesa Firma</option>
                                    <option value="active">Attivo</option>
                                    <option value="expiring">In Scadenza</option>
                                    <option value="expired">Scaduto</option>
                                </select>
                                <button className="btn-add-vendor">
                                    <Plus size={16} />
                                    Nuovo Contratto
                                </button>
                            </div>
                        </div>
                        <div className="contracts-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Prodotto</th>
                                        <th>Valore</th>
                                        <th>Scadenza</th>
                                        <th>Venditore</th>
                                        <th>Stato</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContracts.map(contract => {
                                        const badge = getStatusBadge(contract.status);
                                        return (
                                            <tr key={contract.id}>
                                                <td className="client-name">{contract.client}</td>
                                                <td>{contract.product}</td>
                                                <td className="value-cell">€ {contract.value.toLocaleString('it-IT')}</td>
                                                <td>{contract.renewalDate ? new Date(contract.renewalDate).toLocaleDateString('it-IT') : '-'}</td>
                                                <td>{contract.seller}</td>
                                                <td>
                                                    <span className={`status-badge ${badge.class}`}>{badge.label}</span>
                                                </td>
                                                <td>
                                                    <div className="action-btns-vendor">
                                                        <button className="btn-icon-vendor"><Download size={14} /></button>
                                                        <button className="btn-icon-vendor edit"><Edit size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Venditori Tab */}
                {activeTab === 'venditori' && (
                    <div className="venditori-section">
                        <div className="section-header-vendor">
                            <h2>Amministrazione Venditori</h2>
                        </div>
                        <div className="sellers-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Venditore</th>
                                        <th>Territorio</th>
                                        <th>Contratti</th>
                                        <th>Fatturato</th>
                                        <th>Provvigioni</th>
                                        <th>Approvazioni Pending</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sellers.map(seller => (
                                        <tr key={seller.id}>
                                            <td className="seller-name">{seller.name}</td>
                                            <td>{seller.territory}</td>
                                            <td>{seller.contracts}</td>
                                            <td className="revenue-cell">€ {seller.revenue.toLocaleString('it-IT')}</td>
                                            <td className="commission-cell">€ {seller.commission.toLocaleString('it-IT')}</td>
                                            <td>
                                                {seller.pending > 0 ? (
                                                    <span className="pending-badge">{seller.pending}</span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td>
                                                <button className="btn-icon-vendor"><Edit size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Operativa Tab */}
                {activeTab === 'operativa' && (
                    <div className="operativa-section">
                        <div className="section-header-vendor">
                            <h2>Gestione Operativa Post-Vendita</h2>
                        </div>
                        <div className="operations-grid">
                            {operations.map(op => (
                                <div key={op.id} className="operation-card">
                                    <div className="operation-header">
                                        <h4>{op.project}</h4>
                                        <span className={`op-status ${op.status}`}>
                                            {op.status === 'in-progress' && 'In Sviluppo'}
                                            {op.status === 'testing' && 'In Collaudo'}
                                            {op.status === 'delivered' && 'Consegnato'}
                                        </span>
                                    </div>
                                    <div className="operation-client">{op.client}</div>
                                    <div className="progress-section">
                                        <div className="progress-label">Avanzamento: {op.progress}%</div>
                                        <div className="progress-bar-wrapper">
                                            <div className="progress-bar" style={{ width: `${op.progress}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="hours-section">
                                        <div className="hours-label">Ore Consumate</div>
                                        <div className="hours-value">{op.hours.used} / {op.hours.total} ore</div>
                                        <div className="hours-remaining">
                                            {op.hours.total - op.hours.used} ore rimanenti
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="analytics-section">
                        <div className="section-header-vendor">
                            <h2>Dashboard Analitica</h2>
                        </div>
                        <div className="analytics-grid">
                            <div className="analytics-card">
                                <h3>Vendite per Categoria</h3>
                                <div className="pie-chart-section">
                                    {salesByCategory.map(item => (
                                        <div key={item.category} className="category-row">
                                            <div className="category-color" style={{ backgroundColor: item.color }}></div>
                                            <div className="category-name">{item.category}</div>
                                            <div className="category-value">{item.value}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="analytics-card">
                                <h3>Tasso di Rinnovo</h3>
                                <div className="renewal-stats">
                                    <div className="renewal-percentage">87%</div>
                                    <div className="renewal-label">Clienti rinnovano i contratti</div>
                                    <div className="renewal-trend">+5% rispetto anno scorso</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Venditori;
