import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCircle, ArrowRight, FileText, FolderKanban, Filter } from 'lucide-react';
import { getClients } from '../../api/clients';
import { sellersApi } from '../../api/sellers';
import type { Client } from '../../api/clients';
import type { Seller } from '../../types/sellers';
import './ClientiVenditoriPage.css';

const ClientiVenditoriPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState<number | null>(null);

  useEffect(() => {
    loadSellers();
    loadClients();
  }, [sellerFilter]);

  const loadSellers = async () => {
    try {
      const sellersList = await sellersApi.getAll({ is_active: true });
      setSellers(sellersList);
    } catch (error) {
      console.error('Errore nel caricamento venditori:', error);
    }
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (sellerFilter) {
        params.seller_id = sellerFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const clientsList = await getClients(params);
      setClients(clientsList);
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadClients();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      client.company_name?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      (client as any).seller?.user?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getSellerName = (client: Client) => {
    const seller = (client as any).seller;
    if (seller?.user?.name) {
      return seller.user.name;
    }
    if (seller?.name) {
      return seller.name;
    }
    return '-';
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="clienti-venditori-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Clienti</h1>
          <p className="venditori-page-subtitle">Visualizza i clienti portati dai venditori</p>
        </div>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca cliente per nome, email, telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="venditori-filter-wrapper">
            <Filter size={18} />
            <select
              className="venditori-filter-select"
              value={sellerFilter || ''}
              onChange={(e) => setSellerFilter(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Tutti i venditori</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.user?.name || 'Venditore ' + seller.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="venditori-empty-state">
            <UserCircle size={64} className="venditori-empty-state-icon" />
            <h3>Nessun cliente trovato</h3>
            <p>
              {sellerFilter 
                ? 'Nessun cliente trovato per questo venditore' 
                : 'I clienti portati dai venditori appariranno qui'}
            </p>
          </div>
        ) : (
          <div className="clients-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contatti</th>
                  <th>Venditore</th>
                  <th>Progetti</th>
                  <th>Contratti</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-name-cell">
                        <div className="client-avatar">
                          {client.company_name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="client-name">{client.company_name}</div>
                          {client.ragione_sociale && client.ragione_sociale !== client.company_name && (
                            <div className="client-secondary-name">{client.ragione_sociale}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="client-contacts">
                        {client.email && (
                          <div className="contact-item">
                            <span className="contact-label">Email:</span>
                            <span className="contact-value">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="contact-item">
                            <span className="contact-label">Tel:</span>
                            <span className="contact-value">{client.phone}</span>
                          </div>
                        )}
                        {!client.email && !client.phone && <span className="unassigned">-</span>}
                      </div>
                    </td>
                    <td>
                      <div className="seller-cell">
                        {getSellerName(client) !== '-' ? (
                          <span className="seller-name">{getSellerName(client)}</span>
                        ) : (
                          <span className="unassigned">Non assegnato</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="stats-cell">
                        <div className="stat-item">
                          <FolderKanban size={14} />
                          <span>{(client as any).projects_count || 0}</span>
                        </div>
                        {(client as any).crm_projects_count > 0 && (
                          <div className="stat-item secondary">
                            <span>CRM: {(client as any).crm_projects_count}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="stats-cell">
                        <div className="stat-item">
                          <FileText size={14} />
                          <span>{(client as any).contracts_count || 0}</span>
                        </div>
                        {(client as any).quotes_count > 0 && (
                          <div className="stat-item secondary">
                            <span>Preventivi: {(client as any).quotes_count}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => navigate(`/venditori/clienti/${client.id}`)}
                      >
                        Visualizza <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientiVenditoriPage;
