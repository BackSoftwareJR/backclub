import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { crmProjectsApi } from '../../api/crmProjects';
import type { CrmProject } from '../../api/crmProjects';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerProjectsPage.css';

const SellerProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, [statusFilter, user?.seller_id]);

  const loadProjects = async () => {
    if (!user?.seller_id) return;
    
    try {
      setLoading(true);
      const params: any = {
        seller_id: user.seller_id // Filtro automatico per venditore
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await crmProjectsApi.getAll(params);
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Errore nel caricamento progetti:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadProjects();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      planning: { label: 'Pianificazione', class: 'info' },
      active: { label: 'Attivo', class: 'success' },
      on_hold: { label: 'In Pausa', class: 'warning' },
      completed: { label: 'Completato', class: 'info' },
      cancelled: { label: 'Annullato', class: 'danger' },
    };
    return badges[status] || { label: status, class: '' };
  };

  if (loading) {
    return (
      <div className="progetti-venditori-page">
        <div className="venditori-page-header">
          <SkeletonLoader type="page-header" className="skeleton-header-no-btn" />
        </div>
        <div className="progetti-venditori-skeleton-list">
          <SkeletonLoader type="card" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="progetti-venditori-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">I Miei Progetti</h1>
          <p className="venditori-page-subtitle">Visualizza i tuoi progetti</p>
        </div>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca progetto..."
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
            <option value="planning">Pianificazione</option>
            <option value="active">Attivo</option>
            <option value="on_hold">In Pausa</option>
            <option value="completed">Completato</option>
            <option value="cancelled">Annullato</option>
          </select>
        </div>

        {projects.length === 0 ? (
          <div className="venditori-empty-state">
            <FolderKanban size={64} className="venditori-empty-state-icon" />
            <h3>Nessun progetto trovato</h3>
            <p>I tuoi progetti appariranno qui</p>
          </div>
        ) : (
          <div className="projects-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Nome Progetto</th>
                  <th>Cliente</th>
                  <th>Stato</th>
                  <th>Data Inizio</th>
                  <th>Data Fine</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const statusBadge = getStatusBadge(project.status);
                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="project-name-cell">
                          <FolderKanban size={18} />
                          <strong>{project.name}</strong>
                        </div>
                      </td>
                      <td>{project.client?.company_name || '-'}</td>
                      <td>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>{project.start_date ? new Date(project.start_date).toLocaleDateString('it-IT') : '-'}</td>
                      <td>{project.end_date ? new Date(project.end_date).toLocaleDateString('it-IT') : '-'}</td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={() => navigate(`/seller/progetti/${project.id}`)}
                        >
                          Visualizza <ArrowRight size={14} />
                        </button>
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

export default SellerProjectsPage;
