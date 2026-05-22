import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ExternalLink, Package } from 'lucide-react';
import priceListApi from '../../api/priceList';
import budgetApi from '../../api/budget';
import type { PriceListItem } from '../../types/sellers';
import type { CrmDepartment } from '../../api/budget';
import './ConfigurazioneListiniPage.css';

const ConfigurazioneListiniPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [departments, setDepartments] = useState<CrmDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDepartments();
    loadItems();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await budgetApi.getCrmList({ active_only: true });
      setDepartments(response.data);
    } catch (error) {
      console.error('Errore nel caricamento settori:', error);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 100 };
      if (departmentFilter !== 'all') {
        params.department_id = departmentFilter;
      }
      // Non filtriamo per is_active nel backend, filtriamo lato frontend
      const response = await priceListApi.getAll(params);
      const allItems = response.data || [];
      // Filtriamo lato frontend
      if (statusFilter === 'active') {
        setItems(allItems.filter((item: PriceListItem) => item.is_active));
      } else if (statusFilter === 'inactive') {
        setItems(allItems.filter((item: PriceListItem) => !item.is_active));
      } else {
        setItems(allItems);
      }
    } catch (error) {
      console.error('Errore nel caricamento listino:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [departmentFilter, statusFilter]);

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.department?.name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="configurazione-listini-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Configurazione Listini</h1>
          <p className="venditori-page-subtitle">Gestisci prodotti e servizi nel listino</p>
        </div>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/venditori/configurazione-listini/nuovo')}
        >
          <Plus size={18} />
          Nuovo Prodotto/Servizio
        </button>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca prodotto o servizio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">Tutti i settori</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id.toString()}>
                {dept.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="inactive">Inattivi</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="venditori-empty-state">
            <h3>Nessun prodotto trovato</h3>
            <p>Inizia creando il tuo primo prodotto o servizio</p>
            <button 
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate('/venditori/configurazione-listini/nuovo')}
            >
              <Plus size={18} />
              Crea Prodotto
            </button>
          </div>
        ) : (
          <div className="listini-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Settore</th>
                  <th>Prezzo Base</th>
                  <th>Tipo Prezzo</th>
                  <th>Landing Page</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div className="item-name">{item.name}</div>
                        {item.description && (
                          <div className="item-description">{item.description.substring(0, 60)}...</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {item.department ? (
                        <span className="department-badge" style={{ backgroundColor: `${item.department.color}20`, color: item.department.color }}>
                          {item.department.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="price-cell">€ {item.base_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`price-type-badge ${item.price_type}`}>
                        {item.price_type === 'fisso' && 'Fisso'}
                        {item.price_type === 'variabile' && 'Variabile'}
                        {item.price_type === 'personalizzato' && 'Personalizzato'}
                      </span>
                    </td>
                    <td>
                      {item.landing_page_url ? (
                        <a 
                          href={item.landing_page_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="link-external"
                        >
                          <ExternalLink size={14} />
                          Visualizza
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={`venditori-badge ${item.is_active ? 'venditori-badge-success' : 'venditori-badge-danger'}`}>
                        {item.is_active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/venditori/configurazione-listini/${item.id}`)}
                          title="Visualizza dettagli"
                        >
                          <Package size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/venditori/configurazione-listini/${item.id}/edit`)}
                          title="Modifica"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={async () => {
                            if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
                              try {
                                await priceListApi.delete(item.id);
                                loadItems();
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurazioneListiniPage;

