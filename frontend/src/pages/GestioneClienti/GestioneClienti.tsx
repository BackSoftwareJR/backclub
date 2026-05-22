import React, { useState, useEffect } from 'react';
import { 
    Gift, 
    Briefcase, 
    Newspaper, 
    MessageSquare, 
    Plus, 
    Edit, 
    Trash2, 
    AlertCircle,
    CheckCircle,
    DollarSign,
    Users,
    TrendingUp,
    ShoppingBag,
    Mail,
    Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// import QuickActionsBar from '../../components/QuickActionsBar/QuickActionsBar';
import gestioneClientiApi, { type ClientPrice, type Offer, type Service, type NewsArticle, type ClientOrder, type ClientGift, type BackClubAccessRequest } from '../../api/gestioneClienti';
import { projectsApi, type CrmPublicProject } from '../../api/projects';
import { type Client } from '../../api/clients';
import './GestioneClienti.css';

type TabType = 'overview' | 'clienti-attivi' | 'ordini' | 'regali' | 'prezzi' | 'offerte' | 'servizi' | 'notizie' | 'richieste-backclub' | 'portfolio-sito' | 'personal-assistant';


const GestioneClienti: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(false);

    // Data states
    const [activeClients, setActiveClients] = useState<Client[]>([]);
    const [orders, setOrders] = useState<ClientOrder[]>([]);
    const [gifts, setGifts] = useState<ClientGift[]>([]);
    const [clientPrices, setClientPrices] = useState<ClientPrice[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
    const [backclubRequests, setBackclubRequests] = useState<BackClubAccessRequest[]>([]);
    const [publicProjects, setPublicProjects] = useState<CrmPublicProject[]>([]);
    
    // Modal states
    const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);

    // Modal states (per future implementazioni)
    // const [showPriceModal, setShowPriceModal] = useState(false);
    // const [showOfferModal, setShowOfferModal] = useState(false);
    // const [showServiceModal, setShowServiceModal] = useState(false);
    // const [showNewsModal, setShowNewsModal] = useState(false);
    // const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const promises: Promise<any>[] = [];
            
            if (activeTab === 'clienti-attivi' || activeTab === 'overview') {
                promises.push(loadActiveClients());
            }
            if (activeTab === 'ordini' || activeTab === 'overview') {
                promises.push(loadOrders());
            }
            if (activeTab === 'regali' || activeTab === 'overview') {
                promises.push(loadGifts());
            }
            if (activeTab === 'prezzi' || activeTab === 'overview') {
                promises.push(loadClientPrices());
            }
            if (activeTab === 'offerte' || activeTab === 'overview') {
                promises.push(loadOffers());
            }
            if (activeTab === 'servizi' || activeTab === 'overview') {
                promises.push(loadServices());
            }
            if (activeTab === 'notizie' || activeTab === 'overview') {
                promises.push(loadNewsArticles());
            }
            if (activeTab === 'richieste-backclub' || activeTab === 'overview') {
                promises.push(loadBackclubRequests());
            }
            if (activeTab === 'portfolio-sito') {
                promises.push(loadPublicProjects());
            }

            await Promise.all(promises);
        } catch (err: any) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadActiveClients = async () => {
        try {
            const data = await gestioneClientiApi.getActiveClients();
            setActiveClients(data);
        } catch (err: any) {
            console.error('Error loading active clients:', err);
        }
    };

    const loadOrders = async () => {
        try {
            const data = await gestioneClientiApi.getOrders();
            setOrders(data);
        } catch (err: any) {
            console.error('Error loading orders:', err);
        }
    };

    const loadGifts = async () => {
        try {
            const data = await gestioneClientiApi.getGifts();
            setGifts(data);
        } catch (err: any) {
            console.error('Error loading gifts:', err);
        }
    };

    const loadClientPrices = async () => {
        try {
            const data = await gestioneClientiApi.getPrices();
            setClientPrices(data);
        } catch (err: any) {
            console.error('Error loading client prices:', err);
        }
    };

    const loadOffers = async () => {
        try {
            const data = await gestioneClientiApi.getOffers();
            setOffers(data);
        } catch (err: any) {
            console.error('Error loading offers:', err);
        }
    };

    const loadServices = async () => {
        try {
            const data = await gestioneClientiApi.getServices();
            setServices(data);
        } catch (err: any) {
            console.error('Error loading services:', err);
        }
    };

    const loadNewsArticles = async () => {
        try {
            const data = await gestioneClientiApi.getNews();
            setNewsArticles(data);
        } catch (err: any) {
            console.error('Error loading news articles:', err);
        }
    };

    const loadBackclubRequests = async () => {
        try {
            const data = await gestioneClientiApi.getBackclubRequests();
            setBackclubRequests(data);
        } catch (err: any) {
            console.error('Error loading BackClub requests:', err);
        }
    };

    const loadPublicProjects = async () => {
        try {
            const response = await projectsApi.getCrmPublicSettings();
            setPublicProjects(response.data);
        } catch (err: any) {
            console.error('Error loading public CRM projects:', err);
        }
    };

    const handleToggleProjectPublic = async (project: CrmPublicProject) => {
        try {
            const updated = await projectsApi.updateCrmPublicSettings(project.id, {
                is_public: !project.is_public,
            });
            setPublicProjects(prev =>
                prev.map(p => (p.id === project.id ? { ...p, ...updated.data } : p))
            );
        } catch (err: any) {
            console.error('Error updating project public flag:', err);
            alert('Errore durante il salvataggio della visibilità del progetto');
        }
    };

    const handleSaveProjectBasicInfo = async (project: CrmPublicProject, changes: Partial<CrmPublicProject>) => {
        try {
            const payload: any = {};
            if (changes.public_slug !== undefined) payload.public_slug = changes.public_slug;
            if (changes.public_title !== undefined) payload.public_title = changes.public_title;
            if (changes.public_category !== undefined) payload.public_category = changes.public_category;
            if (changes.public_status_label !== undefined) payload.public_status_label = changes.public_status_label;
            if (changes.public_hero_image_url !== undefined) payload.public_hero_image_url = changes.public_hero_image_url;

            const updated = await projectsApi.updateCrmPublicSettings(project.id, payload);
            setPublicProjects(prev =>
                prev.map(p => (p.id === project.id ? { ...p, ...updated.data } : p))
            );
        } catch (err: any) {
            console.error('Error updating project public settings:', err);
            alert('Errore durante il salvataggio delle impostazioni del progetto');
        }
    };

    const handleCreatePrice = () => {
        // TODO: Implementare modal per creare prezzo speciale
        alert('Funzionalità in arrivo: creazione prezzo speciale');
    };

    const handleEditPrice = (_price: ClientPrice) => {
        // TODO: Implementare modal per modificare prezzo speciale
        alert('Funzionalità in arrivo: modifica prezzo speciale');
    };

    const handleCreateOffer = () => {
        // TODO: Implementare modal per creare offerta
        alert('Funzionalità in arrivo: creazione offerta');
    };

    const handleEditOffer = (_offer: Offer) => {
        // TODO: Implementare modal per modificare offerta
        alert('Funzionalità in arrivo: modifica offerta');
    };

    const handleCreateService = () => {
        // TODO: Implementare modal per creare servizio
        alert('Funzionalità in arrivo: creazione servizio');
    };

    const handleEditService = (_service: Service) => {
        // TODO: Implementare modal per modificare servizio
        alert('Funzionalità in arrivo: modifica servizio');
    };

    const handleCreateNews = () => {
        // TODO: Implementare modal per creare notizia
        alert('Funzionalità in arrivo: creazione notizia');
    };

    const handleEditNews = (_news: NewsArticle) => {
        // TODO: Implementare modal per modificare notizia
        alert('Funzionalità in arrivo: modifica notizia');
    };

    const handleViewOrder = (order: ClientOrder) => {
        setSelectedOrder(order);
        // TODO: Aprire modal dettaglio ordine
        alert(`Dettaglio ordine ${order.order_number}`);
    };

    const handleEditOrder = (order: ClientOrder) => {
        setSelectedOrder(order);
        setShowCreateOrderModal(true);
    };

    const handleSendToSellers = async (order: ClientOrder) => {
        if (!confirm(`Vuoi inviare l'ordine ${order.order_number} ai venditori come preventivo?`)) {
            return;
        }

        try {
            await gestioneClientiApi.sendOrderToSellers(order.id);
            alert('✓ Ordine inviato ai venditori con successo!');
            await loadOrders();
        } catch (err: any) {
            console.error('Error sending order to sellers:', err);
            alert('Errore: ' + (err.response?.data?.message || err.message || 'Errore sconosciuto'));
        }
    };

    if (loading && activeTab === 'overview') {
        return (
            <div className="gestione-clienti-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gestione-clienti-page">

            {/* Header */}
            <div className="gestione-clienti-header">
                <div>
                    <h1>Gestione Clienti</h1>
                    <p className="subtitle">CRM clienti e relazioni commerciali - E-commerce e Gestionale</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="gestione-clienti-tabs">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    <TrendingUp size={16} />
                    Overview
                </button>
                <button
                    className={activeTab === 'clienti-attivi' ? 'active' : ''}
                    onClick={() => setActiveTab('clienti-attivi')}
                >
                    <Users size={16} />
                    Clienti Attivi
                </button>
                <button
                    className={activeTab === 'ordini' ? 'active' : ''}
                    onClick={() => setActiveTab('ordini')}
                >
                    <ShoppingBag size={16} />
                    Ordini
                </button>
                <button
                    className={activeTab === 'regali' ? 'active' : ''}
                    onClick={() => setActiveTab('regali')}
                >
                    <Gift size={16} />
                    Regali
                </button>
                <button
                    className={activeTab === 'prezzi' ? 'active' : ''}
                    onClick={() => setActiveTab('prezzi')}
                >
                    <DollarSign size={16} />
                    Prezzi Speciali
                </button>
                <button
                    className={activeTab === 'offerte' ? 'active' : ''}
                    onClick={() => setActiveTab('offerte')}
                >
                    <Gift size={16} />
                    Offerte
                </button>
                <button
                    className={activeTab === 'servizi' ? 'active' : ''}
                    onClick={() => setActiveTab('servizi')}
                >
                    <Briefcase size={16} />
                    Servizi
                </button>
                <button
                    className={activeTab === 'notizie' ? 'active' : ''}
                    onClick={() => setActiveTab('notizie')}
                >
                    <Newspaper size={16} />
                    Notizie Web
                </button>
                <button
                    className={activeTab === 'richieste-backclub' ? 'active' : ''}
                    onClick={() => setActiveTab('richieste-backclub')}
                >
                    <Mail size={16} />
                    Richieste accesso BackClub
                </button>
                <button
                    className={activeTab === 'portfolio-sito' ? 'active' : ''}
                    onClick={() => setActiveTab('portfolio-sito')}
                >
                    <Briefcase size={16} />
                    Portfolio Sito
                </button>
                <button
                    className={activeTab === 'personal-assistant' ? 'active' : ''}
                    onClick={() => setActiveTab('personal-assistant')}
                >
                    <MessageSquare size={16} />
                    Personal Assistant
                </button>
            </div>

            {/* Tab Content */}
            <div className="gestione-clienti-content">
                {activeTab === 'overview' && (
                    <div className="overview-section">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <Users size={24} />
                                <div>
                                    <div className="stat-value">{activeClients.length}</div>
                                    <div className="stat-label">Clienti Attivi</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <ShoppingBag size={24} />
                                <div>
                                    <div className="stat-value">{orders.length}</div>
                                    <div className="stat-label">Ordini Totali</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Gift size={24} />
                                <div>
                                    <div className="stat-value">{gifts.filter(g => g.is_active).length}</div>
                                    <div className="stat-label">Regali Attivi</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <DollarSign size={24} />
                                <div>
                                    <div className="stat-value">{clientPrices.length}</div>
                                    <div className="stat-label">Prezzi Speciali</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Briefcase size={24} />
                                <div>
                                    <div className="stat-value">{services.filter(s => s.is_visible_to_clients).length}</div>
                                    <div className="stat-label">Servizi Visibili</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Newspaper size={24} />
                                <div>
                                    <div className="stat-value">{newsArticles.filter(n => n.is_published).length}</div>
                                    <div className="stat-label">Notizie Pubblicate</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Mail size={24} />
                                <div>
                                    <div className="stat-value">{backclubRequests.length}</div>
                                    <div className="stat-label">Richieste accesso BackClub</div>
                                </div>
                            </div>
                        </div>

                        <div className="overview-actions">
                            <h2>Azioni Rapide</h2>
                            <div className="quick-actions-grid">
                                <button className="quick-action-card" onClick={() => setActiveTab('clienti-attivi')}>
                                    <Users size={32} />
                                    <span>Clienti Attivi</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('ordini')}>
                                    <ShoppingBag size={32} />
                                    <span>Gestisci Ordini</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('regali')}>
                                    <Gift size={32} />
                                    <span>Crea Regalo</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('prezzi')}>
                                    <DollarSign size={32} />
                                    <span>Gestisci Prezzi Speciali</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('offerte')}>
                                    <Gift size={32} />
                                    <span>Crea Nuova Offerta</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('servizi')}>
                                    <Briefcase size={32} />
                                    <span>Gestisci Servizi</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('notizie')}>
                                    <Newspaper size={32} />
                                    <span>Pubblica Notizia</span>
                                </button>
                                <button className="quick-action-card" onClick={() => setActiveTab('richieste-backclub')}>
                                    <Mail size={32} />
                                    <span>Richieste accesso BackClub</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'clienti-attivi' && (
                    <div className="clienti-attivi-section">
                        <div className="section-header">
                            <h2>Clienti Attivi</h2>
                            <p className="subtitle">Clienti con accesso abilitato all'e-commerce</p>
                        </div>

                        {activeClients.length === 0 ? (
                            <div className="empty-state">
                                <Users size={48} />
                                <p>Nessun cliente attivo trovato</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Azienda</th>
                                            <th>Ragione Sociale</th>
                                            <th>Referente</th>
                                            <th>Email</th>
                                            <th>Telefono</th>
                                            <th>Progetti</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeClients.map(client => (
                                            <tr key={client.id}>
                                                <td className="cliente-name">
                                                    <div className="name-cell">
                                                        <Users size={16} />
                                                        <span>{client.company_name}</span>
                                                    </div>
                                                </td>
                                                <td>{client.ragione_sociale || '-'}</td>
                                                <td>
                                                    {client.referente_nome || client.referente_cognome ? (
                                                        <span>{client.referente_nome} {client.referente_cognome}</span>
                                                    ) : '-'}
                                                </td>
                                                <td>{client.email || '-'}</td>
                                                <td>{client.phone || '-'}</td>
                                                <td>
                                                    <div className="projects-badge">
                                                        <span>{client.projects_count || 0}</span>
                                                        {client.active_projects_count ? (
                                                            <span className="active-count">({client.active_projects_count} attivi)</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button 
                                                            className="btn-action" 
                                                            onClick={() => navigate(`/clienti/${client.id}`)}
                                                            title="Vedi dettagli"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button 
                                                            className="btn-action" 
                                                            onClick={() => navigate(`/clienti/${client.id}`)}
                                                            title="Modifica"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ordini' && (
                    <div className="ordini-section">
                        <div className="section-header">
                            <h2>Ordini Clienti</h2>
                            <button className="btn-primary" onClick={() => setShowCreateOrderModal(true)}>
                                <Plus size={16} />
                                Aggiungi Ordine
                            </button>
                        </div>

                        {/* 3 Macroaree */}
                        <div className="orders-macro-areas">
                            {/* Ordini dal Sito */}
                            <div className="order-macro-area">
                                <div className="macro-area-header">
                                    <h3>
                                        <ShoppingBag size={20} />
                                        Ordini dal Sito
                                    </h3>
                                    <span className="order-count">{orders.filter(o => o.order_source === 'dal_sito').length}</span>
                                </div>
                                <div className="orders-list">
                                    {orders.filter(o => o.order_source === 'dal_sito').length === 0 ? (
                                        <div className="empty-mini-state">
                                            <p>Nessun ordine dal sito</p>
                                        </div>
                                    ) : (
                                        orders.filter(o => o.order_source === 'dal_sito').map(order => (
                                            <div key={order.id} className="order-card">
                                                <div className="order-card-header">
                                                    <div>
                                                        <span className="order-number-small">{order.order_number}</span>
                                                        <span className="order-client">{order.client_name || 'N/A'}</span>
                                                    </div>
                                                    <span className={`status-badge status-${order.status}`}>
                                                        {order.status === 'pending' && 'In Attesa'}
                                                        {order.status === 'confirmed' && 'Confermato'}
                                                        {order.status === 'processing' && 'In Elaborazione'}
                                                        {order.status === 'completed' && 'Completato'}
                                                        {order.status === 'cancelled' && 'Annullato'}
                                                    </span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-info-row">
                                                        <span>Data:</span>
                                                        <strong>{new Date(order.order_date).toLocaleDateString('it-IT')}</strong>
                                                    </div>
                                                    <div className="order-info-row">
                                                        <span>Importo:</span>
                                                        <strong>€ {typeof order.final_amount === 'number' ? order.final_amount.toFixed(2) : parseFloat(order.final_amount || '0').toFixed(2)}</strong>
                                                    </div>
                                                    {order.project_info && (
                                                        <div className="order-project-info">
                                                            <strong>Info Progetto:</strong>
                                                            <p>{order.project_info.obiettivi || order.project_info.idee || 'Nessuna info disponibile'}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="order-card-actions">
                                                    <button className="btn-action" onClick={() => handleViewOrder(order)}>
                                                        <Eye size={14} />
                                                        Dettagli
                                                    </button>
                                                    {!order.sent_to_sellers && (
                                                        <button 
                                                            className="btn-action primary" 
                                                            onClick={() => handleSendToSellers(order)}
                                                        >
                                                            <Mail size={14} />
                                                            Invia a Venditori
                                                        </button>
                                                    )}
                                                    {order.sent_to_sellers && (
                                                        <span className="sent-badge">
                                                            <CheckCircle size={14} />
                                                            Inviato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Ordini Referral */}
                            <div className="order-macro-area">
                                <div className="macro-area-header">
                                    <h3>
                                        <Users size={20} />
                                        Ordini Referral
                                    </h3>
                                    <span className="order-count">{orders.filter(o => o.order_source === 'referral').length}</span>
                                </div>
                                <div className="orders-list">
                                    {orders.filter(o => o.order_source === 'referral').length === 0 ? (
                                        <div className="empty-mini-state">
                                            <p>Nessun ordine referral</p>
                                        </div>
                                    ) : (
                                        orders.filter(o => o.order_source === 'referral').map(order => (
                                            <div key={order.id} className="order-card">
                                                <div className="order-card-header">
                                                    <div>
                                                        <span className="order-number-small">{order.order_number}</span>
                                                        <span className="order-client">{order.client_name || 'N/A'}</span>
                                                    </div>
                                                    <span className={`status-badge status-${order.status}`}>
                                                        {order.status === 'pending' && 'In Attesa'}
                                                        {order.status === 'confirmed' && 'Confermato'}
                                                        {order.status === 'processing' && 'In Elaborazione'}
                                                        {order.status === 'completed' && 'Completato'}
                                                        {order.status === 'cancelled' && 'Annullato'}
                                                    </span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-info-row">
                                                        <span>Data:</span>
                                                        <strong>{new Date(order.order_date).toLocaleDateString('it-IT')}</strong>
                                                    </div>
                                                    <div className="order-info-row">
                                                        <span>Importo:</span>
                                                        <strong>€ {typeof order.final_amount === 'number' ? order.final_amount.toFixed(2) : parseFloat(order.final_amount || '0').toFixed(2)}</strong>
                                                    </div>
                                                    {order.referral_user_name && (
                                                        <div className="order-info-row">
                                                            <span>Referral:</span>
                                                            <strong>{order.referral_user_name}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="order-card-actions">
                                                    <button className="btn-action" onClick={() => handleViewOrder(order)}>
                                                        <Eye size={14} />
                                                        Dettagli
                                                    </button>
                                                    {!order.sent_to_sellers && (
                                                        <button 
                                                            className="btn-action primary" 
                                                            onClick={() => handleSendToSellers(order)}
                                                        >
                                                            <Mail size={14} />
                                                            Invia a Venditori
                                                        </button>
                                                    )}
                                                    {order.sent_to_sellers && (
                                                        <span className="sent-badge">
                                                            <CheckCircle size={14} />
                                                            Inviato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Ordini Clienti Diretti */}
                            <div className="order-macro-area">
                                <div className="macro-area-header">
                                    <h3>
                                        <Briefcase size={20} />
                                        Ordini Clienti
                                    </h3>
                                    <span className="order-count">{orders.filter(o => o.order_source === 'cliente_diretto').length}</span>
                                </div>
                                <div className="orders-list">
                                    {orders.filter(o => o.order_source === 'cliente_diretto').length === 0 ? (
                                        <div className="empty-mini-state">
                                            <p>Nessun ordine cliente diretto</p>
                                        </div>
                                    ) : (
                                        orders.filter(o => o.order_source === 'cliente_diretto').map(order => (
                                            <div key={order.id} className="order-card">
                                                <div className="order-card-header">
                                                    <div>
                                                        <span className="order-number-small">{order.order_number}</span>
                                                        <span className="order-client">{order.client_name || 'N/A'}</span>
                                                    </div>
                                                    <span className={`status-badge status-${order.status}`}>
                                                        {order.status === 'pending' && 'In Attesa'}
                                                        {order.status === 'confirmed' && 'Confermato'}
                                                        {order.status === 'processing' && 'In Elaborazione'}
                                                        {order.status === 'completed' && 'Completato'}
                                                        {order.status === 'cancelled' && 'Annullato'}
                                                    </span>
                                                </div>
                                                <div className="order-card-body">
                                                    <div className="order-info-row">
                                                        <span>Data:</span>
                                                        <strong>{new Date(order.order_date).toLocaleDateString('it-IT')}</strong>
                                                    </div>
                                                    <div className="order-info-row">
                                                        <span>Importo:</span>
                                                        <strong>€ {typeof order.final_amount === 'number' ? order.final_amount.toFixed(2) : parseFloat(order.final_amount || '0').toFixed(2)}</strong>
                                                    </div>
                                                    {order.notes && (
                                                        <div className="order-notes">
                                                            <strong>Note:</strong>
                                                            <p>{order.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="order-card-actions">
                                                    <button className="btn-action" onClick={() => handleViewOrder(order)}>
                                                        <Eye size={14} />
                                                        Dettagli
                                                    </button>
                                                    <button className="btn-action" onClick={() => handleEditOrder(order)}>
                                                        <Edit size={14} />
                                                        Modifica
                                                    </button>
                                                    {!order.sent_to_sellers && (
                                                        <button 
                                                            className="btn-action primary" 
                                                            onClick={() => handleSendToSellers(order)}
                                                        >
                                                            <Mail size={14} />
                                                            Invia a Venditori
                                                        </button>
                                                    )}
                                                    {order.sent_to_sellers && (
                                                        <span className="sent-badge">
                                                            <CheckCircle size={14} />
                                                            Inviato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'regali' && (
                    <div className="regali-section">
                        <div className="section-header">
                            <h2>Regali per Clienti</h2>
                            <button className="btn-primary" onClick={() => alert('Funzionalità in arrivo: creazione regalo')}>
                                <Plus size={16} />
                                Nuovo Regalo
                            </button>
                        </div>

                        {gifts.length === 0 ? (
                            <div className="empty-state">
                                <Gift size={48} />
                                <p>Nessun regalo creato</p>
                                <button className="btn-primary" onClick={() => alert('Funzionalità in arrivo: creazione regalo')}>
                                    Crea il primo regalo
                                </button>
                            </div>
                        ) : (
                            <div className="gifts-grid">
                                {gifts.map(gift => (
                                    <div key={gift.id} className="gift-card">
                                        <div className="gift-content">
                                            <div className="gift-header">
                                                <h3>{gift.title}</h3>
                                                <span className={`email-status-badge ${gift.email_status}`}>
                                                    {gift.email_status === 'draft' && 'Bozza'}
                                                    {gift.email_status === 'scheduled' && 'Programmato'}
                                                    {gift.email_status === 'sent' && 'Inviato'}
                                                    {gift.email_status === 'failed' && 'Errore'}
                                                </span>
                                            </div>
                                            <p className="gift-description">{gift.description}</p>
                                            <div className="gift-details">
                                                <div className="gift-detail-row">
                                                    <span>Tipo:</span>
                                                    <strong>
                                                        {gift.gift_type === 'discount' && `Sconto ${gift.discount_percentage}%`}
                                                        {gift.gift_type === 'service' && `Servizio: ${gift.service_name || 'N/A'}`}
                                                        {gift.gift_type === 'credit' && `Credito €${gift.credit_amount ? (typeof gift.credit_amount === 'number' ? gift.credit_amount.toFixed(2) : parseFloat(gift.credit_amount || '0').toFixed(2)) : '0.00'}`}
                                                        {gift.gift_type === 'custom' && 'Personalizzato'}
                                                    </strong>
                                                </div>
                                                <div className="gift-detail-row">
                                                    <span>Destinatari:</span>
                                                    <strong>{gift.client_ids?.length || 0} clienti</strong>
                                                </div>
                                                <div className="gift-detail-row">
                                                    <span>Valido:</span>
                                                    <strong>
                                                        {new Date(gift.valid_from).toLocaleDateString('it-IT')} - {new Date(gift.valid_until).toLocaleDateString('it-IT')}
                                                    </strong>
                                                </div>
                                            </div>
                                            <div className="gift-actions">
                                                <button 
                                                    className="btn-action" 
                                                    onClick={() => alert('Funzionalità in arrivo: modifica regalo')}
                                                    title="Modifica"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                {gift.email_status === 'draft' && (
                                                    <button 
                                                        className="btn-action primary" 
                                                        onClick={() => alert('Funzionalità in arrivo: invio email')}
                                                        title="Invia Email"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    className="btn-action danger" 
                                                    onClick={() => alert('Funzionalità in arrivo: elimina regalo')}
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'prezzi' && (
                    <div className="prezzi-section">
                        <div className="section-header">
                            <h2>Prezzi Speciali per Clienti</h2>
                            <button className="btn-primary" onClick={handleCreatePrice}>
                                <Plus size={16} />
                                Nuovo Prezzo Speciale
                            </button>
                        </div>

                        {clientPrices.length === 0 ? (
                            <div className="empty-state">
                                <DollarSign size={48} />
                                <p>Nessun prezzo speciale configurato</p>
                                <button className="btn-primary" onClick={handleCreatePrice}>
                                    Crea il primo prezzo speciale
                                </button>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Servizio</th>
                                            <th>Prezzo Originale</th>
                                            <th>Prezzo Speciale</th>
                                            <th>Sconto</th>
                                            <th>Valido Fino</th>
                                            <th>Stato</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clientPrices.map(price => (
                                            <tr key={price.id}>
                                                <td>{price.client_name || 'N/A'}</td>
                                                <td>{price.service_name || 'N/A'}</td>
                                                <td>€ {typeof price.original_price === 'number' ? price.original_price.toFixed(2) : parseFloat(price.original_price || '0').toFixed(2)}</td>
                                                <td>€ {typeof price.price === 'number' ? price.price.toFixed(2) : parseFloat(price.price || '0').toFixed(2)}</td>
                                                <td>{price.discount_percentage}%</td>
                                                <td>{price.valid_until ? new Date(price.valid_until).toLocaleDateString('it-IT') : 'Illimitato'}</td>
                                                <td>
                                                    <span className={`status-badge ${price.is_active ? 'active' : 'inactive'}`}>
                                                        {price.is_active ? 'Attivo' : 'Inattivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button className="btn-action" onClick={() => handleEditPrice(price)}>
                                                            <Edit size={16} />
                                                        </button>
                                                        <button className="btn-action danger">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'offerte' && (
                    <div className="offerte-section">
                        <div className="section-header">
                            <h2>Offerte Promozionali</h2>
                            <button className="btn-primary" onClick={handleCreateOffer}>
                                <Plus size={16} />
                                Nuova Offerta
                            </button>
                        </div>

                        {offers.length === 0 ? (
                            <div className="empty-state">
                                <Gift size={48} />
                                <p>Nessuna offerta creata</p>
                                <button className="btn-primary" onClick={handleCreateOffer}>
                                    Crea la prima offerta
                                </button>
                            </div>
                        ) : (
                            <div className="offers-grid">
                                {offers.map(offer => (
                                    <div key={offer.id} className="offer-card">
                                        {offer.image_url && (
                                            <div className="offer-image" style={{ backgroundImage: `url(${offer.image_url})` }} />
                                        )}
                                        <div className="offer-content">
                                            <div className="offer-header">
                                                <h3>{offer.title}</h3>
                                                <span className="discount-badge">-{offer.discount_percentage}%</span>
                                            </div>
                                            <p className="offer-description">{offer.description}</p>
                                            <div className="offer-dates">
                                                <span>Dal: {new Date(offer.valid_from).toLocaleDateString('it-IT')}</span>
                                                <span>Al: {new Date(offer.valid_until).toLocaleDateString('it-IT')}</span>
                                            </div>
                                            <div className="offer-actions">
                                                <button className="btn-action" onClick={() => handleEditOffer(offer)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn-action danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'servizi' && (
                    <div className="servizi-section">
                        <div className="section-header">
                            <h2>Servizi Disponibili</h2>
                            <button className="btn-primary" onClick={handleCreateService}>
                                <Plus size={16} />
                                Nuovo Servizio
                            </button>
                        </div>

                        {services.length === 0 ? (
                            <div className="empty-state">
                                <Briefcase size={48} />
                                <p>Nessun servizio configurato</p>
                                <button className="btn-primary" onClick={handleCreateService}>
                                    Aggiungi il primo servizio
                                </button>
                            </div>
                        ) : (
                            <div className="services-grid">
                                {services.map(service => (
                                    <div key={service.id} className="service-card">
                                        {service.image_url && (
                                            <div className="service-image" style={{ backgroundImage: `url(${service.image_url})` }} />
                                        )}
                                        <div className="service-content">
                                            <div className="service-header">
                                                <h3>{service.name}</h3>
                                                <span className={`visibility-badge ${service.is_visible_to_clients ? 'visible' : 'hidden'}`}>
                                                    {service.is_visible_to_clients ? 'Visibile' : 'Nascosto'}
                                                </span>
                                            </div>
                                            <p className="service-description">{service.description}</p>
                                            <div className="service-footer">
                                                <span className="service-price">€ {typeof service.base_price === 'number' ? service.base_price.toFixed(2) : parseFloat(service.base_price || '0').toFixed(2)}</span>
                                                <span className="service-category">{service.category}</span>
                                            </div>
                                            <div className="service-actions">
                                                <button className="btn-action" onClick={() => handleEditService(service)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn-action danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'notizie' && (
                    <div className="notizie-section">
                        <div className="section-header">
                            <h2>Notizie sul Mondo Web</h2>
                            <button className="btn-primary" onClick={handleCreateNews}>
                                <Plus size={16} />
                                Nuova Notizia
                            </button>
                        </div>

                        {newsArticles.length === 0 ? (
                            <div className="empty-state">
                                <Newspaper size={48} />
                                <p>Nessuna notizia pubblicata</p>
                                <button className="btn-primary" onClick={handleCreateNews}>
                                    Pubblica la prima notizia
                                </button>
                            </div>
                        ) : (
                            <div className="news-grid">
                                {newsArticles.map(article => (
                                    <div key={article.id} className="news-card">
                                        {article.image_url && (
                                            <div className="news-image" style={{ backgroundImage: `url(${article.image_url})` }} />
                                        )}
                                        <div className="news-content">
                                            <div className="news-header">
                                                <h3>{article.title}</h3>
                                                <span className={`publish-badge ${article.is_published ? 'published' : 'draft'}`}>
                                                    {article.is_published ? 'Pubblicata' : 'Bozza'}
                                                </span>
                                            </div>
                                            <p className="news-excerpt">{article.excerpt}</p>
                                            <div className="news-meta">
                                                <span>Autore: {article.author}</span>
                                                <span>Categoria: {article.category}</span>
                                                {article.published_at && (
                                                    <span>Pubblicata: {new Date(article.published_at).toLocaleDateString('it-IT')}</span>
                                                )}
                                            </div>
                                            <div className="news-actions">
                                                <button className="btn-action" onClick={() => handleEditNews(article)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn-action danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'richieste-backclub' && (
                    <div className="clienti-attivi-section">
                        <div className="section-header">
                            <h2>Richieste accesso BackClub</h2>
                            <p className="subtitle">Richieste inviate dalla pagina Richiedi accesso (backclub.it/richiedi-accesso)</p>
                        </div>

                        {backclubRequests.length === 0 ? (
                            <div className="empty-state">
                                <Mail size={48} />
                                <p>Nessuna richiesta di accesso</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Data richiesta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backclubRequests.map((req) => (
                                            <tr key={req.id}>
                                                <td className="cliente-name">
                                                    <div className="name-cell">
                                                        <Mail size={16} />
                                                        <span>{req.email}</span>
                                                    </div>
                                                </td>
                                                <td>{new Date(req.created_at).toLocaleString('it-IT')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'portfolio-sito' && (
                    <div className="portfolio-sito-section">
                        <div className="section-header">
                            <h2>Portfolio Sito BackSoftware</h2>
                            <p className="subtitle">
                                Seleziona quali progetti CRM rendere visibili sul sito marketing e configura i contenuti pubblici.
                            </p>
                        </div>

                        {publicProjects.length === 0 ? (
                            <div className="empty-state">
                                <Briefcase size={48} />
                                <p>Nessun progetto CRM trovato.</p>
                                <p className="subtitle">
                                    Crea prima alcuni progetti nella sezione Progetti e poi gestisci qui la loro visibilità sul sito.
                                </p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Progetto</th>
                                            <th>Cliente</th>
                                            <th>Categoria</th>
                                            <th>Slug pubblico</th>
                                            <th>Titolo pubblico</th>
                                            <th>Stato sito</th>
                                            <th>Visibile sul sito</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {publicProjects.map(project => (
                                            <tr key={project.id}>
                                                <td>{project.name}</td>
                                                <td>{project.client_name || '-'}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        defaultValue={project.public_category || ''}
                                                        className="inline-input"
                                                        onBlur={e =>
                                                            handleSaveProjectBasicInfo(project, {
                                                                public_category: e.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        defaultValue={project.public_slug || ''}
                                                        placeholder="slug-percorsi-web"
                                                        className="inline-input"
                                                        onBlur={e =>
                                                            handleSaveProjectBasicInfo(project, {
                                                                public_slug: e.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        defaultValue={project.public_title || ''}
                                                        placeholder={project.name}
                                                        className="inline-input"
                                                        onBlur={e =>
                                                            handleSaveProjectBasicInfo(project, {
                                                                public_title: e.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        defaultValue={project.public_status_label || ''}
                                                        placeholder="Online, In sviluppo..."
                                                        className="inline-input"
                                                        onBlur={e =>
                                                            handleSaveProjectBasicInfo(project, {
                                                                public_status_label: e.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={project.is_public}
                                                            onChange={() => handleToggleProjectPublic(project)}
                                                        />
                                                        <span className="toggle-slider" />
                                                    </label>
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button
                                                            className="btn-action"
                                                            title="Apri scheda cliente"
                                                            onClick={() => {
                                                                if (project.client_id) {
                                                                    navigate(`/clienti/${project.client_id}`);
                                                                }
                                                            }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'personal-assistant' && (
                    <div className="personal-assistant-section">
                        <div className="pa-header">
                            <div>
                                <h2>Personal Assistant</h2>
                                <p className="subtitle">Assistenza prioritaria dedicata agli utenti Backclub</p>
                            </div>
                        </div>

                        <div className="pa-info-card">
                            <div className="pa-icon">
                                <MessageSquare size={48} />
                            </div>
                            <div className="pa-content">
                                <h3>Assistenza a 360 gradi</h3>
                                <p>
                                    Il Personal Assistant è un servizio esclusivo riservato agli utenti Backclub. 
                                    Attraverso questa sezione, i clienti possono gestire richieste e comunicare 
                                    direttamente con un team di assistenza prioritaria pronto a intervenire e 
                                    sostenere in ogni aspetto del loro business digitale.
                                </p>
                                <div className="pa-features">
                                    <div className="pa-feature">
                                        <CheckCircle size={20} />
                                        <span>Supporto prioritario 24/7</span>
                                    </div>
                                    <div className="pa-feature">
                                        <CheckCircle size={20} />
                                        <span>Gestione richieste personalizzate</span>
                                    </div>
                                    <div className="pa-feature">
                                        <CheckCircle size={20} />
                                        <span>Consulenza strategica dedicata</span>
                                    </div>
                                    <div className="pa-feature">
                                        <CheckCircle size={20} />
                                        <span>Monitoraggio e follow-up continuo</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pa-stats">
                            <div className="pa-stat-card">
                                <Users size={24} />
                                <div>
                                    <div className="stat-value">0</div>
                                    <div className="stat-label">Clienti Attivi</div>
                                </div>
                            </div>
                            <div className="pa-stat-card">
                                <MessageSquare size={24} />
                                <div>
                                    <div className="stat-value">0</div>
                                    <div className="stat-label">Richieste Aperte</div>
                                </div>
                            </div>
                            <div className="pa-stat-card">
                                <CheckCircle size={24} />
                                <div>
                                    <div className="stat-value">0</div>
                                    <div className="stat-label">Richieste Risolte</div>
                                </div>
                            </div>
                        </div>

                        <div className="pa-note">
                            <AlertCircle size={20} />
                            <p>
                                <strong>Nota:</strong> La sezione Personal Assistant per i clienti sarà disponibile 
                                nella versione clienti dell'applicazione. Questa dashboard admin permette di 
                                monitorare e gestire le richieste degli utenti Backclub.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Crea Ordine */}
            {showCreateOrderModal && (
                <div className="modal-overlay" onClick={() => { setShowCreateOrderModal(false); setSelectedOrder(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedOrder ? 'Modifica Ordine' : 'Nuovo Ordine'}</h2>
                            <button className="modal-close" onClick={() => { setShowCreateOrderModal(false); setSelectedOrder(null); }}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                Modal per creare/modificare ordine in arrivo...
                                <br />
                                <small>Funzionalità in sviluppo</small>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestioneClienti;

