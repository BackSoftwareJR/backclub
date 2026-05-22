import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, Grid, List, Play, CheckCircle2 } from 'lucide-react';
import { contractsApi } from '../../api/contracts';
import type { Contract } from '../../types/sellers';
import './ContrattiPage.css';

const ContrattiPage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  useEffect(() => {
    loadContracts();
  }, [statusFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await contractsApi.getAll(params);
      setContracts(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento contratti:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.contract_number?.toLowerCase().includes(searchLower) ||
      contract.title?.toLowerCase().includes(searchLower) ||
      contract.client?.company_name?.toLowerCase().includes(searchLower) ||
      contract.seller?.user?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      draft: { label: 'Bozza', class: 'warning' },
      requested: { label: 'Richiesta', class: 'info' },
      pending_signature: { label: 'In Attesa di Firma', class: 'warning' },
      active: { label: 'Attivo', class: 'success' },
      suspended: { label: 'Sospeso', class: 'danger' },
      completed: { label: 'Completato', class: 'info' },
      terminated: { label: 'Terminato', class: 'danger' },
    };
    return badges[status] || { label: status, class: '' };
  };

  const getProjectStatus = (contract: Contract) => {
    // Se ha già un progetto collegato
    if (contract.crm_project_id) {
      return {
        label: 'Avviato',
        class: 'success',
        icon: CheckCircle2,
      };
    }
    // Se è firmato (active) ma non ha progetto, può essere avviato
    if (contract.status === 'active' && contract.signed_file) {
      return {
        label: 'Da Avviare',
        class: 'warning',
        icon: Play,
      };
    }
    // Altrimenti non è ancora pronto
    return {
      label: '-',
      class: '',
      icon: null,
    };
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="contratti-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Contratti</h1>
          <p className="venditori-page-subtitle">Gestisci tutti i contratti</p>
        </div>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/segreteria/contratti/nuovo')}
        >
          <Plus size={18} />
          Nuovo Contratto
        </button>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca contratto..."
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
            <option value="requested">Richiesta</option>
            <option value="pending_signature">In Attesa di Firma</option>
            <option value="active">Attivo</option>
            <option value="draft">Bozza</option>
            <option value="suspended">Sospeso</option>
            <option value="completed">Completato</option>
            <option value="terminated">Terminato</option>
          </select>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              <List size={18} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Vista card"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="venditori-empty-state">
            <h3>Nessun contratto trovato</h3>
            <p>Crea il tuo primo contratto</p>
            <button 
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate('/segreteria/contratti/nuovo')}
            >
              <Plus size={18} />
              Crea Contratto
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="contracts-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Titolo</th>
                  <th>Cliente</th>
                  <th>Venditore</th>
                  <th>Valore</th>
                  <th>Stato</th>
                  <th>Progetto</th>
                  <th>Data Inizio</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const statusBadge = getStatusBadge(contract.status);
                  const projectStatus = getProjectStatus(contract);
                  const ProjectIcon = projectStatus.icon;
                  return (
                    <tr key={contract.id}>
                      <td className="contract-number">{contract.contract_number}</td>
                      <td>{contract.title}</td>
                      <td>{contract.client?.company_name || '-'}</td>
                      <td>{contract.seller?.user?.name || '-'}</td>
                      <td className="total-cell">
                        {contract.total_value ? `€ ${contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>
                        {projectStatus.icon ? (
                          <span className={`venditori-badge venditori-badge-${projectStatus.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {ProjectIcon && <ProjectIcon size={14} />}
                            {projectStatus.label}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>{contract.start_date ? new Date(contract.start_date).toLocaleDateString('it-IT') : '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            onClick={() => navigate(`/segreteria/contratti/${contract.id}`)}
                            title="Visualizza"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="contracts-card-grid">
            {filteredContracts.map((contract) => {
              const statusBadge = getStatusBadge(contract.status);
              const projectStatus = getProjectStatus(contract);
              const ProjectIcon = projectStatus.icon;
              return (
                <div key={contract.id} className="contract-card">
                  <div className="contract-card-header">
                    <div>
                      <div className="contract-card-number">{contract.contract_number}</div>
                      <div className="contract-card-title">{contract.title}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                      {projectStatus.icon && (
                        <span className={`venditori-badge venditori-badge-${projectStatus.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {ProjectIcon && <ProjectIcon size={12} />}
                          {projectStatus.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="contract-card-body">
                    <div className="contract-card-info">
                      <div className="info-item">
                        <span className="info-label">Cliente:</span>
                        <span className="info-value">{contract.client?.company_name || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Venditore:</span>
                        <span className="info-value">{contract.seller?.user?.name || '-'}</span>
                      </div>
                      {contract.total_value && (
                        <div className="info-item">
                          <span className="info-label">Valore:</span>
                          <span className="info-value">€ {contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="contract-card-actions">
                    <button
                      className="btn-link"
                      onClick={() => navigate(`/segreteria/contratti/${contract.id}`)}
                    >
                      Visualizza dettagli
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContrattiPage;

