import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Edit, Trash2, Phone, Mail, Building, Key, AlertCircle, FolderKanban, Power, Settings, Users } from 'lucide-react';
import CreateClientModal from '../../components/CreateClientModal/CreateClientModal';
import { getClients, deleteClient, toggleClientAccess, type Client } from '../../api/clients';
import { vendorsApi, type Vendor } from '../../api/vendors';
import './ContattiPage.css';

type ContactType = 'all' | 'clients' | 'vendors';

type ContactWithType = 
    | (Client & { type: 'client' })
    | (Vendor & { type: 'vendor' });

const ContattiPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<ContactWithType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
    const [contactType, setContactType] = useState<ContactType>('all');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterContactsList();
    }, [clients, vendors, searchQuery, filterActive, contactType]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Load clients
            const clientsData = await getClients({ active_only: false });
            setClients(clientsData);
            
            // Load vendors
            const vendorsData = await vendorsApi.getAll({ is_active: undefined });
            setVendors(vendorsData);
        } catch (err: any) {
            console.error('Error loading contacts:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const filterContactsList = () => {
        let allContacts: ContactWithType[] = [];
        
        // Add clients
        if (contactType === 'all' || contactType === 'clients') {
            clients.forEach(client => {
                allContacts.push({ ...client, type: 'client' as const });
            });
        }
        
        // Add vendors
        if (contactType === 'all' || contactType === 'vendors') {
            vendors.forEach(vendor => {
                allContacts.push({ ...vendor, type: 'vendor' as const });
            });
        }

        // Filter by search query
        if (searchQuery) {
            allContacts = allContacts.filter(contact => {
                if (contact.type === 'client') {
                    return (
                        contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.ragione_sociale?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.referente_nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.referente_cognome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.vat_number?.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                } else {
                    return (
                        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contact.vat_number?.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
            });
        }

        // Filter by active status
        if (filterActive === 'active') {
            allContacts = allContacts.filter(contact => contact.is_active);
        } else if (filterActive === 'inactive') {
            allContacts = allContacts.filter(contact => !contact.is_active);
        }

        setFilteredContacts(allContacts);
    };

    const handleContactClick = (contact: ContactWithType) => {
        if (contact.type === 'client') {
            navigate(`/clienti/${contact.id}`);
        } else {
            // TODO: Navigate to vendor detail page
            console.log('Vendor detail:', contact);
        }
    };

    const handleDeleteContact = async (contact: ContactWithType, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm('Sei sicuro di voler eliminare questo contatto?')) {
            return;
        }

        try {
            if (contact.type === 'client') {
                await deleteClient(contact.id);
            } else {
                await vendorsApi.delete(contact.id);
            }
            loadData();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleToggleAccess = async (clientId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            await toggleClientAccess(clientId);
            loadData();
        } catch (err: any) {
            alert(err.toString());
        }
    };

    const handleExportContacts = () => {
        // Export to CSV
        const headers = ['Tipo', 'Nome Azienda', 'Ragione Sociale', 'Email', 'Telefono', 'P.IVA', 'Progetti Attivi', 'Accesso Abilitato'];
        const csvData = filteredContacts.map(contact => {
            if (contact.type === 'client') {
                return [
                    'Cliente',
                    contact.company_name,
                    contact.ragione_sociale || '',
                    contact.email || '',
                    contact.phone || '',
                    contact.vat_number || '',
                    contact.active_projects_count || 0,
                    contact.access_enabled ? 'Sì' : 'No'
                ];
            } else {
                return [
                    'Fornitore',
                    contact.name,
                    contact.business_name || '',
                    contact.email || '',
                    contact.phone || '',
                    contact.vat_number || '',
                    '-',
                    '-'
                ];
            }
        });

        const csv = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contatti_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const totalContacts = clients.length + vendors.length;
    const activeContacts = clients.filter(c => c.is_active).length + vendors.filter(v => v.is_active).length;
    const clientsWithAccess = clients.filter(c => c.access_enabled).length;
    const totalProjects = clients.reduce((sum, c) => sum + (c.projects_count || 0), 0);

    if (loading) {
        return (
            <div className="clienti-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento contatti...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="clienti-page">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Errore</h3>
                    <p>{error}</p>
                    <button onClick={loadData} className="btn-retry">Riprova</button>
                </div>
            </div>
        );
    }

    return (
        <div className="clienti-page">
            {/* Header */}
            <div className="clienti-header">
                <div>
                    <h1>Anagrafica</h1>
                    <p className="subtitle">Gestione clienti e fornitori</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExportContacts}>
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
                        Nuovo Contatto
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="clienti-stats">
                <div className="stat-card">
                    <Building size={24} />
                    <div>
                        <div className="stat-value">{totalContacts}</div>
                        <div className="stat-label">Totale Contatti</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Power size={24} />
                    <div>
                        <div className="stat-value">{activeContacts}</div>
                        <div className="stat-label">Attivi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Key size={24} />
                    <div>
                        <div className="stat-value">{clientsWithAccess}</div>
                        <div className="stat-label">Con Accesso</div>
                    </div>
                </div>
                <div className="stat-card">
                    <FolderKanban size={24} />
                    <div>
                        <div className="stat-value">{totalProjects}</div>
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
                        className={contactType === 'all' ? 'active' : ''}
                        onClick={() => setContactType('all')}
                    >
                        Tutti ({totalContacts})
                    </button>
                    <button
                        className={contactType === 'clients' ? 'active' : ''}
                        onClick={() => setContactType('clients')}
                    >
                        Clienti ({clients.length})
                    </button>
                    <button
                        className={contactType === 'vendors' ? 'active' : ''}
                        onClick={() => setContactType('vendors')}
                    >
                        Fornitori ({vendors.length})
                    </button>
                </div>
                <div className="filter-tabs">
                    <button
                        className={filterActive === 'all' ? 'active' : ''}
                        onClick={() => setFilterActive('all')}
                    >
                        Tutti ({totalContacts})
                    </button>
                    <button
                        className={filterActive === 'active' ? 'active' : ''}
                        onClick={() => setFilterActive('active')}
                    >
                        Attivi ({activeContacts})
                    </button>
                    <button
                        className={filterActive === 'inactive' ? 'active' : ''}
                        onClick={() => setFilterActive('inactive')}
                    >
                        Inattivi ({totalContacts - activeContacts})
                    </button>
                </div>
            </div>

            {/* Contacts Table */}
            <div className="clienti-table-container">
                {filteredContacts.length === 0 ? (
                    <div className="empty-state">
                        <Building size={48} />
                        <p>Nessun contatto trovato</p>
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
                                <th>Tipo</th>
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
                            {filteredContacts.map(contact => {
                                const isClient = contact.type === 'client';
                                
                                return (
                                    <tr key={`${contact.type}-${contact.id}`} onClick={() => handleContactClick(contact)}>
                                        <td>
                                            <span className={`contact-type-badge ${contact.type}`}>
                                                {contact.type === 'client' ? (
                                                    <>
                                                        <Building size={14} />
                                                        Cliente
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users size={14} />
                                                        Fornitore
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="cliente-name">
                                            <div className="name-cell">
                                                <Building size={16} />
                                                <span>{isClient ? contact.company_name : contact.name}</span>
                                            </div>
                                        </td>
                                        <td>{isClient ? (contact.ragione_sociale || '-') : (contact.business_name || '-')}</td>
                                        <td>
                                            {isClient && (contact.referente_nome || contact.referente_cognome) ? (
                                                <div className="referente-cell">
                                                    <span>{contact.referente_nome} {contact.referente_cognome}</span>
                                                    {contact.referente_telefono && (
                                                        <span className="referente-phone">{contact.referente_telefono}</span>
                                                    )}
                                                </div>
                                            ) : isClient ? '-' : (contact.contact_person || '-')}
                                        </td>
                                        <td>
                                            <div className="contacts-cell">
                                                {contact.email && (
                                                    <a 
                                                        href={`mailto:${contact.email}`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Mail size={14} /> {contact.email}
                                                    </a>
                                                )}
                                                {contact.phone && (
                                                    <a 
                                                        href={`tel:${contact.phone}`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Phone size={14} /> {contact.phone}
                                                    </a>
                                                )}
                                                {!isClient && contact.mobile && (
                                                    <a 
                                                        href={`tel:${contact.mobile}`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Phone size={14} /> {contact.mobile} (cell)
                                                    </a>
                                                )}
                                                {!contact.email && !contact.phone && (!isClient && !contact.mobile) && '-'}
                                            </div>
                                        </td>
                                        <td>{isClient ? (contact.vat_number || contact.partita_iva || '-') : (contact.vat_number || '-')}</td>
                                        <td>
                                            {isClient ? (
                                                <div className="projects-badge">
                                                    <FolderKanban size={14} />
                                                    <span>{contact.projects_count || 0}</span>
                                                    {contact.active_projects_count ? (
                                                        <span className="active-count">({contact.active_projects_count} attivi)</span>
                                                    ) : null}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {isClient ? (
                                                <button
                                                    className={`access-toggle ${contact.access_enabled ? 'enabled' : 'disabled'}`}
                                                    onClick={(e) => handleToggleAccess(contact.id, e)}
                                                    title={contact.access_enabled ? 'Disabilita accesso' : 'Abilita accesso'}
                                                >
                                                    <Key size={14} />
                                                    {contact.access_enabled ? 'Abilitato' : 'Disabilitato'}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${contact.is_active ? 'active' : 'inactive'}`}>
                                                {contact.is_active ? 'Attivo' : 'Inattivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                {isClient && (
                                                    <button
                                                        className="btn-action"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedClient(contact);
                                                            setShowCreateModal(true);
                                                        }}
                                                        title="Modifica"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-action danger"
                                                    onClick={(e) => handleDeleteContact(contact, e)}
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            <CreateClientModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setSelectedClient(null); }}
                onSuccess={() => { loadData(); }}
                client={selectedClient}
            />
        </div>
    );
};

export default ContattiPage;
