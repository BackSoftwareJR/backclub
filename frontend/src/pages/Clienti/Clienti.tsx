import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Edit, Trash2, Phone, Mail, Building, Key, AlertCircle, FolderKanban, Power, Settings } from 'lucide-react';
// import QuickActionsBar from '../../components/QuickActionsBar/QuickActionsBar.tsx';
import CreateClientModal from '../../components/CreateClientModal/CreateClientModal';
import { getClients, deleteClient, toggleClientAccess, type Client } from '../../api/clients';
import './Clienti.css';

const Clienti: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        filterClientsList();
    }, [clients, searchQuery, filterActive]);

    const loadClients = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getClients({ active_only: false });
            console.log('Clients loaded:', data);
            setClients(data);
        } catch (err: any) {
            console.error('Error loading clients:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const filterClientsList = () => {
        let filtered = clients;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(client =>
                client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.ragione_sociale?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.referente_nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.referente_cognome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.vat_number?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by active status
        if (filterActive === 'active') {
            filtered = filtered.filter(client => client.is_active);
        } else if (filterActive === 'inactive') {
            filtered = filtered.filter(client => !client.is_active);
        }

        setFilteredClients(filtered);
    };

    const handleClientClick = (client: Client) => {
        navigate(`/clienti/${client.id}`);
    };

    const handleDeleteClient = async (clientId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm('Sei sicuro di voler eliminare questo cliente?')) {
            return;
        }

        try {
            await deleteClient(clientId);
            loadClients();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleToggleAccess = async (clientId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            await toggleClientAccess(clientId);
            loadClients();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleExportClients = () => {
        // Export to CSV
        const headers = ['Nome Azienda', 'Ragione Sociale', 'Email', 'Telefono', 'P.IVA', 'Progetti Attivi', 'Accesso Abilitato'];
        const csvData = filteredClients.map(client => [
            client.company_name,
            client.ragione_sociale || '',
            client.email || '',
            client.phone || '',
            client.vat_number || '',
            client.active_projects_count || 0,
            client.access_enabled ? 'Sì' : 'No'
        ]);

        const csv = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clienti_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="clienti-page">
                {/* <QuickActionsBar /> */}
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento clienti...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="clienti-page">
                {/* <QuickActionsBar /> */}
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Errore</h3>
                    <p>{error}</p>
                    <button onClick={loadClients} className="btn-retry">Riprova</button>
                </div>
            </div>
        );
    }

    return (
        <div className="clienti-page">
            {/* <QuickActionsBar /> */}

            {/* Header */}
            <div className="clienti-header">
                <div>
                    <h1>Clienti</h1>
                    <p className="subtitle">Gestione clienti e accessi ai progetti</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExportClients}>
                        <Download size={16} />
                        Esporta CSV
                    </button>
                    <button 
                        className="btn-export" 
                        onClick={() => navigate('/gestione-clienti')}
                        style={{ background: 'rgba(88, 86, 214, 0.15)', borderColor: 'rgba(88, 86, 214, 0.3)' }}
                    >
                        <Settings size={16} />
                        Gestione Clienti
                    </button>
                    <button className="btn-new-client" onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} />
                        Nuovo Cliente
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="clienti-stats">
                <div className="stat-card">
                    <Building size={24} />
                    <div>
                        <div className="stat-value">{clients.length}</div>
                        <div className="stat-label">Totale Clienti</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Power size={24} />
                    <div>
                        <div className="stat-value">{clients.filter(c => c.is_active).length}</div>
                        <div className="stat-label">Attivi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Key size={24} />
                    <div>
                        <div className="stat-value">{clients.filter(c => c.access_enabled).length}</div>
                        <div className="stat-label">Con Accesso</div>
                    </div>
                </div>
                <div className="stat-card">
                    <FolderKanban size={24} />
                    <div>
                        <div className="stat-value">{clients.reduce((sum, c) => sum + (c.projects_count || 0), 0)}</div>
                        <div className="stat-label">Progetti Totali</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="clienti-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca per nome, email, P.IVA..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button
                        className={filterActive === 'all' ? 'active' : ''}
                        onClick={() => setFilterActive('all')}
                    >
                        Tutti ({clients.length})
                    </button>
                    <button
                        className={filterActive === 'active' ? 'active' : ''}
                        onClick={() => setFilterActive('active')}
                    >
                        Attivi ({clients.filter(c => c.is_active).length})
                    </button>
                    <button
                        className={filterActive === 'inactive' ? 'active' : ''}
                        onClick={() => setFilterActive('inactive')}
                    >
                        Inattivi ({clients.filter(c => !c.is_active).length})
                    </button>
                </div>
            </div>

            {/* Clients Table */}
            <div className="clienti-table-container">
                {filteredClients.length === 0 ? (
                    <div className="empty-state">
                        <Building size={48} />
                        <p>Nessun cliente trovato</p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="btn-clear">
                                Cancella filtri
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="clienti-table">
                        <thead>
                            <tr>
                                <th>Azienda</th>
                                <th>Ragione Sociale</th>
                                <th>Referente</th>
                                <th>Contatti</th>
                                <th>P.IVA</th>
                                <th>Progetti</th>
                                <th>Accesso</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(client => (
                                <tr key={client.id} onClick={() => handleClientClick(client)}>
                                    <td className="cliente-name">
                                        <div className="name-cell">
                                            <Building size={16} />
                                            <span>{client.company_name}</span>
                                        </div>
                                    </td>
                                    <td>{client.ragione_sociale || '-'}</td>
                                    <td>
                                        {client.referente_nome || client.referente_cognome ? (
                                            <div className="referente-cell">
                                                <span>{client.referente_nome} {client.referente_cognome}</span>
                                                {client.referente_telefono && (
                                                    <span className="referente-phone">{client.referente_telefono}</span>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <div className="contacts-cell">
                                            {client.email && (
                                                <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>
                                                    <Mail size={14} /> {client.email}
                                                </a>
                                            )}
                                            {client.phone && (
                                                <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()}>
                                                    <Phone size={14} /> {client.phone}
                                                </a>
                                            )}
                                            {!client.email && !client.phone && '-'}
                                        </div>
                                    </td>
                                    <td>{client.vat_number || client.partita_iva || '-'}</td>
                                    <td>
                                        <div className="projects-badge">
                                            <FolderKanban size={14} />
                                            <span>{client.projects_count || 0}</span>
                                            {client.active_projects_count ? (
                                                <span className="active-count">({client.active_projects_count} attivi)</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className={`access-toggle ${client.access_enabled ? 'enabled' : 'disabled'}`}
                                            onClick={(e) => handleToggleAccess(client.id, e)}
                                            title={client.access_enabled ? 'Disabilita accesso' : 'Abilita accesso'}
                                        >
                                            <Key size={14} />
                                            {client.access_enabled ? 'Abilitato' : 'Disabilitato'}
                                        </button>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${client.is_active ? 'active' : 'inactive'}`}>
                                            {client.is_active ? 'Attivo' : 'Inattivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                className="btn-action"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedClient(client);
                                                    setShowCreateModal(true);
                                                }}
                                                title="Modifica"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-action danger"
                                                onClick={(e) => handleDeleteClient(client.id, e)}
                                                title="Elimina"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            <CreateClientModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setSelectedClient(null); }}
                onSuccess={() => { loadClients(); }}
                client={selectedClient}
            />
        </div>
    );
};

export default Clienti;
