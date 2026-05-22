import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Upload, MapPin, Briefcase } from 'lucide-react';
import sellersApi from '../../api/sellers';
import type { Seller } from '../../types/sellers';
import './AmministrazioneVenditoriPage.css';

const AmministrazioneVenditoriPage: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const data = await sellersApi.getAll({ with_stats: true });
      setSellers(data);
    } catch (error) {
      console.error('Errore nel caricamento venditori:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    return (
      seller.user?.name.toLowerCase().includes(searchLower) ||
      seller.user?.email.toLowerCase().includes(searchLower) ||
      seller.territory?.some(t => t.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getContractStatus = (seller: Seller) => {
    if (!seller.contract_end_date) return { label: 'Nessun contratto', class: 'no-contract' };
    
    const endDate = new Date(seller.contract_end_date);
    const today = new Date();
    const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return { label: 'Scaduto', class: 'expired' };
    } else if (daysDiff <= 30) {
      return { label: `Scade tra ${daysDiff} giorni`, class: 'expiring' };
    } else {
      return { label: `Valido fino ${formatDate(seller.contract_end_date)}`, class: 'active' };
    }
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="amministrazione-venditori-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Amministrazione Venditori</h1>
          <p className="venditori-page-subtitle">Gestisci i venditori e i loro contratti</p>
        </div>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/venditori/amministrazione-venditori/nuovo')}
        >
          <Plus size={18} />
          Nuovo Venditore
        </button>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca venditore..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredSellers.length === 0 ? (
          <div className="venditori-empty-state">
            <Briefcase size={64} className="venditori-empty-state-icon" />
            <h3>Nessun venditore trovato</h3>
            <p>Inizia creando il tuo primo venditore</p>
            <button 
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate('/venditori/amministrazione-venditori/nuovo')}
            >
              <Plus size={18} />
              Crea Venditore
            </button>
          </div>
        ) : (
          <div className="sellers-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Venditore</th>
                  <th>Email</th>
                  <th>Territorio</th>
                  <th>Contratto</th>
                  <th>Provvigione</th>
                  <th>Statistiche</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((seller) => {
                  const contractStatus = getContractStatus(seller);
                  
                  return (
                    <tr key={seller.id}>
                      <td>
                        <div className="seller-name-cell">
                          <div className="seller-avatar">
                            {seller.user?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="seller-name">{seller.user?.name}</div>
                            <div className="seller-phone">{seller.user?.phone || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{seller.user?.email}</td>
                      <td>
                        {seller.territory && seller.territory.length > 0 ? (
                          <div className="territory-tags">
                            {seller.territory.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="territory-tag">
                                <MapPin size={12} />
                                {t}
                              </span>
                            ))}
                            {seller.territory.length > 2 && (
                              <span className="territory-tag-more">+{seller.territory.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className="contract-info">
                          <div className={`contract-status ${contractStatus.class}`}>
                            {contractStatus.label}
                          </div>
                          {seller.contract_file && (
                            <button 
                              className="btn-link-small"
                              onClick={() => window.open(seller.contract_file, '_blank')}
                            >
                              <Upload size={14} />
                              Visualizza
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{seller.commission_rate}%</td>
                      <td>
                        <div className="seller-stats">
                          <div className="stat-item">
                            <span className="stat-label">Clienti:</span>
                            <span className="stat-value">{seller.clients_count || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Preventivi:</span>
                            <span className="stat-value">{seller.quotes_count || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Contratti:</span>
                            <span className="stat-value">{seller.contracts_count || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`venditori-badge ${seller.is_active ? 'venditori-badge-success' : 'venditori-badge-danger'}`}>
                          {seller.is_active ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            onClick={() => navigate(`/venditori/amministrazione-venditori/${seller.id}`)}
                            title="Visualizza dettagli"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={async () => {
                              if (window.confirm('Sei sicuro di voler eliminare questo venditore?')) {
                                try {
                                  await sellersApi.delete(seller.id);
                                  loadSellers();
                                } catch (error) {
                                  alert('Errore nell\'eliminazione');
                                }
                              }
                            }}
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
      </div>
    </div>
  );
};

export default AmministrazioneVenditoriPage;

