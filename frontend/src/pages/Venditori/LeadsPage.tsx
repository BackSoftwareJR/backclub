import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, Mail, Globe, User, Search, FileText, Upload, Eye, Table2, Users, MapPin, ChevronRight, Trash2, Download } from 'lucide-react';
import leadsApi from '../../api/leads';
import { sellersApi } from '../../api/sellers';
import type { Lead } from '../../types/sellers';
import type { Seller } from '../../types/sellers';
import ImportCsvModal from './ImportCsvModal';
import ItalyMap from '../../components/ItalyMap/ItalyMap';
import './LeadsPage.css';

type ViewType = 'table' | 'sellers' | 'regions';

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [viewType, setViewType] = useState<ViewType>('table');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadSellers();
    loadLeads();
  }, [statusFilter, sourceFilter, sellerFilter]);

  const loadSellers = async () => {
    try {
      setLoadingSellers(true);
      const sellersList = await sellersApi.getAll({ is_active: true });
      setSellers(sellersList);
    } catch (error) {
      console.error('Errore nel caricamento venditori:', error);
    } finally {
      setLoadingSellers(false);
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (sourceFilter !== 'all') {
        params.source = sourceFilter;
      }
      if (sellerFilter !== 'all') {
        if (sellerFilter === 'unassigned') {
          params.seller_id = 'unassigned';
        } else {
          params.seller_id = sellerFilter;
        }
      }
      const response = await leadsApi.getAll(params);
      setLeads(response.data);
    } catch (error) {
      console.error('Errore nel caricamento leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (lead: Lead) => {
    try {
      const response = await leadsApi.prepareForQuote(lead.id);
      // L'API restituisce direttamente i dati, non wrappati in ApiResponse
      const quoteData = (response as any).quote_data || response;
      
      // Naviga al wizard preventivi con i dati precompilati
      navigate('/venditori/preventivi/nuovo', {
        state: {
          fromLead: true,
          leadId: lead.id,
          quoteData: quoteData,
        },
      });
    } catch (error: any) {
      console.error('Errore nella preparazione preventivo:', error);
      alert('Errore nella preparazione del preventivo: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  const handleDelete = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation(); // Previene la propagazione dell'evento
    
    if (!confirm(`Sei sicuro di voler eliminare il contatto "${lead.company_name}"?`)) {
      return;
    }

    try {
      await leadsApi.delete(lead.id);
      alert('Contatto eliminato con successo');
      loadLeads(); // Ricarica la lista
    } catch (error: any) {
      console.error('Errore nell\'eliminazione del contatto:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione del contatto');
    }
  };

  const handleDownloadTemplate = () => {
    // Funzione per gestire correttamente i valori CSV (escape virgole e virgolette)
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Colonne del template CSV
    const headers = [
      'Tipologia',
      'Nome Cliente',
      'Email',
      'Cellulare',
      'Sito Web',
      'Indirizzo',
      'Stato Digitale Attuale',
      'Strategia di Pitch & Opportunità'
    ];

    // Crea una riga di esempio
    const exampleRow = [
      'RSA', // Tipologia
      'Esempio Azienda S.r.l.', // Nome Cliente
      'esempio@email.it', // Email
      '+39 123 456 7890', // Cellulare
      'https://www.esempio.it', // Sito Web
      'Via Esempio 123, 10100 Torino (TO)', // Indirizzo
      'Presenza digitale base', // Stato Digitale Attuale
      'Focus su servizi digitali per migliorare visibilità' // Strategia di Pitch & Opportunità
    ];

    // Crea il contenuto CSV con escape corretto
    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      exampleRow.map(escapeCsvValue).join(',')
    ].join('\n');

    // Crea il blob e scarica (BOM per Excel UTF-8)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_importazione_leads.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getSourceLabel = (source?: string) => {
    const labels: Record<string, string> = {
      website: 'Sito Web',
      referral: 'Referral',
      manual: 'Manuale',
      csv_import: 'Importazione CSV',
      cold_call: 'Cold Call',
    };
    return labels[source || ''] || source || 'Non specificato';
  };

  const getSourceBadgeClass = (source?: string) => {
    const classes: Record<string, string> = {
      website: 'source-website',
      referral: 'source-referral',
      manual: 'source-manual',
      csv_import: 'source-csv',
      cold_call: 'source-cold',
    };
    return classes[source || ''] || 'source-default';
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        lead.company_name.toLowerCase().includes(searchLower) ||
        lead.contact_person?.toLowerCase().includes(searchLower) ||
        lead.description?.toLowerCase().includes(searchLower) ||
        lead.tipologia?.toLowerCase().includes(searchLower)
      );
      
      const matchesSeller = !sellerFilter || sellerFilter === 'all' || 
        (sellerFilter === 'unassigned' && !lead.assigned_seller_id) ||
        (sellerFilter !== 'unassigned' && lead.assigned_seller_id === Number(sellerFilter));
      
      const matchesRegion = !regionFilter || lead.region === regionFilter;
      
      return matchesSearch && matchesSeller && matchesRegion;
    });
  }, [leads, searchTerm, sellerFilter, regionFilter]);

  // Raggruppa leads per venditore
  const leadsBySeller = useMemo(() => {
    const grouped: Record<number, { seller: Seller; leads: Lead[] }> = {};
    const unassigned: Lead[] = [];
    
    filteredLeads.forEach(lead => {
      if (lead.assigned_seller_id && lead.seller) {
        if (!grouped[lead.assigned_seller_id]) {
          grouped[lead.assigned_seller_id] = {
            seller: lead.seller,
            leads: []
          };
        }
        grouped[lead.assigned_seller_id].leads.push(lead);
      } else {
        unassigned.push(lead);
      }
    });
    
    return { grouped, unassigned };
  }, [filteredLeads]);

  // Raggruppa leads per regione
  const leadsByRegion = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    filteredLeads.forEach(lead => {
      const region = lead.region || 'Non specificata';
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(lead);
    });
    
    return grouped;
  }, [filteredLeads]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      new: { label: 'Nuovo', class: 'info' },
      contacted: { label: 'Contattato', class: 'warning' },
      qualified: { label: 'Qualificato', class: 'info' },
      proposal: { label: 'Proposta', class: 'warning' },
      negotiation: { label: 'Negoziazione', class: 'warning' },
      won: { label: 'Vinto', class: 'success' },
      lost: { label: 'Perso', class: 'danger' },
    };
    return badges[status] || { label: status, class: '' };
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      low: { label: 'Bassa', class: 'low' },
      medium: { label: 'Media', class: 'medium' },
      high: { label: 'Alta', class: 'high' },
      urgent: { label: 'Urgente', class: 'urgent' },
    };
    return badges[priority] || { label: priority, class: '' };
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="leads-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Contatti da Chiamare</h1>
          <p className="venditori-page-subtitle">Gestisci i lead e i contatti commerciali</p>
        </div>
        <div className="header-actions">
          <button 
            className="venditori-btn venditori-btn-secondary"
            onClick={handleDownloadTemplate}
            title="Scarica template CSV con tutte le colonne necessarie"
          >
            <Download size={18} />
            Template CSV
          </button>
          <button 
            className="venditori-btn venditori-btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={18} />
            Importa CSV
          </button>
          <button 
            className="venditori-btn venditori-btn-primary"
            onClick={() => navigate('/venditori/leads/nuovo')}
          >
            <Plus size={18} />
            Nuovo Contatto
          </button>
        </div>
      </div>

      <div className="venditori-content-card">
        {/* View Toggle */}
        <div className="view-toggle-section">
          <div className="view-toggle-buttons">
            <button
              className={`view-toggle-btn ${viewType === 'table' ? 'active' : ''}`}
              onClick={() => {
                setViewType('table');
                setSellerFilter('all');
                setRegionFilter('');
              }}
            >
              <Table2 size={18} />
              <span>Tabella</span>
            </button>
            <button
              className={`view-toggle-btn ${viewType === 'sellers' ? 'active' : ''}`}
              onClick={() => {
                setViewType('sellers');
                setSellerFilter('all');
                setRegionFilter('');
              }}
            >
              <Users size={18} />
              <span>Venditori</span>
            </button>
            <button
              className={`view-toggle-btn ${viewType === 'regions' ? 'active' : ''}`}
              onClick={() => {
                setViewType('regions');
                setSellerFilter('all');
                setRegionFilter('');
              }}
            >
              <MapPin size={18} />
              <span>Regioni</span>
            </button>
          </div>
        </div>

        {/* Filters - Solo nella vista tabella */}
        {viewType === 'table' && (
          <div className="venditori-actions-bar">
            <div className="venditori-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="venditori-search-input"
                placeholder="Cerca per ragione sociale, contatto, descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tutti gli stati</option>
              <option value="new">Nuovo</option>
              <option value="contacted">Contattato</option>
              <option value="qualified">Qualificato</option>
              <option value="proposal">Proposta</option>
              <option value="negotiation">Negoziazione</option>
              <option value="won">Vinto</option>
              <option value="lost">Perso</option>
            </select>
            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">Tutte le fonti</option>
              <option value="website">Sito Web</option>
              <option value="referral">Referral</option>
              <option value="manual">Manuale</option>
              <option value="csv_import">Importazione CSV</option>
              <option value="cold_call">Cold Call</option>
            </select>
            <select
              className="filter-select"
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
            >
              <option value="all">Tutti i venditori</option>
              <option value="unassigned">Non assegnati</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.user?.name || `Venditore ${seller.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Vista Tabella */}
        {viewType === 'table' && (
          <>
            {filteredLeads.length === 0 ? (
              <div className="venditori-empty-state">
                <Phone size={64} className="venditori-empty-state-icon" />
                <h3>Nessun contatto trovato</h3>
                <p>Aggiungi il tuo primo contatto da chiamare</p>
                <div className="empty-state-actions">
                  <button 
                    className="venditori-btn venditori-btn-secondary"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={18} />
                    Importa CSV
                  </button>
                  <button 
                    className="venditori-btn venditori-btn-primary"
                    onClick={() => navigate('/venditori/leads/nuovo')}
                  >
                    <Plus size={18} />
                    Aggiungi Contatto
                  </button>
                </div>
              </div>
            ) : (
              <div className="leads-table-wrapper">
                <table className="venditori-table leads-table">
                  <thead>
                    <tr>
                      <th>Ragione Sociale</th>
                      <th>Tipologia</th>
                      <th>Contatto</th>
                      <th>Telefoni</th>
                      <th>Email</th>
                      <th>Sito Web</th>
                      <th>Indirizzo</th>
                      <th>Fonte</th>
                      <th>Venditore</th>
                      <th>Stato</th>
                      <th>Priorità</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const statusBadge = getStatusBadge(lead.status);
                      const priorityBadge = getPriorityBadge(lead.priority);
                      const primaryPhone = lead.statistics?.primary_phone || lead.phones?.[0]?.number;
                      const primaryEmail = lead.statistics?.primary_email || lead.emails?.[0]?.email;
                      
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div>
                              <div className="lead-company-name">{lead.company_name}</div>
                              {lead.contact_person && (
                                <div className="lead-contact-person">
                                  <User size={12} />
                                  {lead.contact_person}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {lead.tipologia ? (
                              <span className="tipologia-badge">{lead.tipologia}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{lead.contact_person || '-'}</td>
                          <td>
                            {primaryPhone ? (
                              <div className="contact-info">
                                <Phone size={14} />
                                <a href={`tel:${primaryPhone}`} className="contact-link">
                                  {primaryPhone}
                                </a>
                                {lead.phones && lead.phones.length > 1 && (
                                  <span className="contact-count">+{lead.phones.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {primaryEmail ? (
                              <div className="contact-info">
                                <Mail size={14} />
                                <a href={`mailto:${primaryEmail}`} className="contact-link">
                                  {primaryEmail}
                                </a>
                                {lead.emails && lead.emails.length > 1 && (
                                  <span className="contact-count">+{lead.emails.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {lead.websites && lead.websites.length > 0 ? (
                              <div className="websites-list">
                                {lead.websites.slice(0, 1).map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="website-link"
                                  >
                                    <Globe size={14} />
                                    Sito
                                  </a>
                                ))}
                                {lead.websites.length > 1 && (
                                  <span className="contact-count">+{lead.websites.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {lead.address ? (
                              <span className="address-text" title={lead.address}>
                                {lead.address.length > 30 ? lead.address.substring(0, 30) + '...' : lead.address}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <span className={`source-badge ${getSourceBadgeClass(lead.source)}`}>
                              {getSourceLabel(lead.source)}
                            </span>
                            {lead.referral_user && (
                              <div className="referral-info">
                                <User size={12} />
                                {lead.referral_user.name}
                              </div>
                            )}
                          </td>
                          <td>{lead.seller?.user?.name || <span className="unassigned">Non assegnato</span>}</td>
                          <td>
                            <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td>
                            <span className={`priority-badge priority-${priorityBadge.class}`}>
                              {priorityBadge.label}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-icon btn-icon-primary"
                                onClick={() => handleCreateQuote(lead)}
                                title="Fai Preventivo"
                              >
                                <FileText size={16} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => navigate(`/venditori/leads/${lead.id}`)}
                                title="Visualizza"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className="btn-icon btn-icon-danger"
                                onClick={(e) => handleDelete(lead, e)}
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
              </div>
            )}
          </>
        )}

        {/* Vista Venditori */}
        {viewType === 'sellers' && (
          <div className="sellers-view">
            {loadingSellers ? (
              <div className="venditori-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <>
                {/* Venditori con leads assegnati */}
                {Object.values(leadsBySeller.grouped).length > 0 && (
                  <div className="sellers-grid">
                    {Object.values(leadsBySeller.grouped).map(({ seller, leads: sellerLeads }) => (
                      <div
                        key={seller.id}
                        className="seller-card"
                        onClick={() => {
                          setViewType('table');
                          setSellerFilter(seller.id.toString());
                        }}
                      >
                        <div className="seller-card-header">
                          <div className="seller-avatar">
                            {seller.user?.name?.charAt(0).toUpperCase() || 'V'}
                          </div>
                          <div className="seller-info">
                            <h3 className="seller-name">{seller.user?.name || `Venditore ${seller.id}`}</h3>
                            <p className="seller-email">{seller.user?.email || '-'}</p>
                          </div>
                        </div>
                        <div className="seller-card-stats">
                          <div className="stat-item">
                            <div className="stat-value">{sellerLeads.length}</div>
                            <div className="stat-label">Contatti</div>
                          </div>
                        </div>
                        <div className="seller-card-footer">
                          <span className="view-link">
                            Visualizza <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Leads non assegnati */}
                {leadsBySeller.unassigned.length > 0 && (
                  <div className="unassigned-section">
                    <h3 className="section-title">Non Assegnati</h3>
                    <div
                      className="seller-card unassigned-card"
                      onClick={() => {
                        setViewType('table');
                        setSellerFilter('unassigned');
                      }}
                    >
                      <div className="seller-card-header">
                        <div className="seller-avatar unassigned-avatar">
                          <User size={24} />
                        </div>
                        <div className="seller-info">
                          <h3 className="seller-name">Non Assegnati</h3>
                          <p className="seller-email">Contatti senza venditore</p>
                        </div>
                      </div>
                      <div className="seller-card-stats">
                        <div className="stat-item">
                          <div className="stat-value">{leadsBySeller.unassigned.length}</div>
                          <div className="stat-label">Contatti</div>
                        </div>
                      </div>
                      <div className="seller-card-footer">
                        <span className="view-link">
                          Visualizza <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {Object.values(leadsBySeller.grouped).length === 0 && leadsBySeller.unassigned.length === 0 && (
                  <div className="venditori-empty-state">
                    <Users size={64} className="venditori-empty-state-icon" />
                    <h3>Nessun contatto trovato</h3>
                    <p>Non ci sono contatti assegnati ai venditori</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Vista Regioni */}
        {viewType === 'regions' && (
          <div className="regions-view">
            <ItalyMap
              regions={leadsByRegion}
              onRegionClick={(regionName) => {
                setViewType('table');
                setRegionFilter(regionName);
              }}
            />
          </div>
        )}
      </div>

      {showImportModal && (
        <ImportCsvModal
          onClose={() => {
            setShowImportModal(false);
            loadLeads();
          }}
        />
      )}
    </div>
  );
};

export default LeadsPage;
