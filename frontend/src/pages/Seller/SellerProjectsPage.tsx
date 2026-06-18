import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { crmProjectsApi } from '../../api/crmProjects';
import type { CrmProject, CrmProjectFilters } from '../../api/crmProjects';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerProjectsPage.css';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planning:              { label: 'Pianificazione',   cls: 'seller-badge-info' },
  active:                { label: 'Attivo',            cls: 'seller-badge-active' },
  on_hold:               { label: 'In Pausa',          cls: 'seller-badge-warning' },
  completed:             { label: 'Completato',        cls: 'seller-badge-completed' },
  cancelled:             { label: 'Annullato',         cls: 'seller-badge-danger' },
  in_attesa_presa_carico:{ label: 'In Attesa',         cls: 'seller-badge-warning' },
  preso_in_carico:       { label: 'Preso in Carico',   cls: 'seller-badge-info' },
  avviato:               { label: 'Avviato',           cls: 'seller-badge-active' },
  paused:                { label: 'In Pausa',          cls: 'seller-badge-warning' },
  archived:              { label: 'Archiviato',        cls: 'seller-badge-secondary' },
};

const FILTERS = [
  { value: 'all',       label: 'Tutti' },
  { value: 'active',    label: 'Attivi' },
  { value: 'planning',  label: 'Pianificazione' },
  { value: 'on_hold',   label: 'In Pausa' },
  { value: 'completed', label: 'Completati' },
  { value: 'cancelled', label: 'Annullati' },
];

const getProgress = (project: CrmProject): number => {
  switch (project.status as string) {
    case 'completed':             return 100;
    case 'active': case 'avviato':return 60;
    case 'paused': case 'on_hold':return 50;
    case 'preso_in_carico':       return 20;
    case 'planning':              return 15;
    case 'in_attesa_presa_carico':return 5;
    default:                      return 0;
  }
};

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
      const params: CrmProjectFilters = { seller_id: user.seller_id };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
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
      if (searchTerm !== undefined) loadProjects();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-header">
          <SkeletonLoader type="page-header" className="skeleton-header-no-btn" />
        </div>
        <div className="sp-skeleton-grid">
          <SkeletonLoader type="card" count={8} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="sp-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="sp-header">
        <div>
          <h1 className="sp-title">I Miei Progetti</h1>
          <p className="sp-subtitle">Visualizza e monitora i tuoi progetti</p>
        </div>
      </div>

      {/* Search + filter pills */}
      <div className="sp-toolbar">
        <div className="sp-search-wrap">
          <Search size={16} className="sp-search-icon" />
          <input
            type="text"
            className="sp-search"
            placeholder="Cerca progetto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sp-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`sp-filter-pill${statusFilter === f.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {projects.length === 0 ? (
        <div className="sp-empty">
          <FolderKanban size={48} className="sp-empty-icon" />
          <h3 className="sp-empty-title">Nessun progetto trovato</h3>
          <p className="sp-empty-subtitle">I tuoi progetti appariranno qui</p>
        </div>
      ) : (
        <motion.div
          className="sp-grid"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {projects.map((project) => {
            const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, cls: 'seller-badge-secondary' };
            const progress = getProgress(project);

            return (
              <motion.div
                key={project.id}
                className="sp-card seller-card"
                variants={cardVariants}
                onClick={() => navigate(`/seller/progetti/${project.id}`)}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                <div className="sp-card-top">
                  <div className="sp-card-icon-wrap">
                    <FolderKanban size={18} className="sp-card-icon" />
                  </div>
                  <span className={`seller-badge ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <h3 className="sp-card-name">{project.name}</h3>

                {project.client && (
                  <p className="sp-card-client">{project.client.company_name}</p>
                )}

                {/* Progress bar */}
                <div className="sp-progress-wrap">
                  <div className="sp-progress-bar">
                    <div className="sp-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="sp-progress-label">{progress}%</span>
                </div>

                {/* Dates */}
                <div className="sp-card-meta">
                  {project.start_date && (
                    <span className="sp-meta-item">
                      <Calendar size={12} />
                      {new Date(project.start_date).toLocaleDateString('it-IT')}
                    </span>
                  )}
                  {project.end_date && (
                    <span className="sp-meta-item">
                      → {new Date(project.end_date).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>

                <div className="sp-card-footer">
                  <span className="sp-card-view">
                    Visualizza <ArrowRight size={13} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};

export default SellerProjectsPage;
