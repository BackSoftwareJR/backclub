import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCache } from '../../utils/freelanceCache';
import type { FreelanceProject } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceProgettiTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import FreelanceProjectMediaCard from './components/FreelanceProjectMediaCard';
import './FreelanceProjectsPage.css';

type FilterStatus = 'tutti' | 'attivi' | 'completati' | 'pausa';

const STATUS_LABELS: Record<string, string> = {
  in_attesa_presa_carico: 'In Attesa',
  preso_in_carico: 'Preso in Carico',
  avviato: 'Avviato',
  active: 'Attivo',
  paused: 'In Pausa',
  completed: 'Completato',
  archived: 'Archiviato',
};

const STATUS_COLORS: Record<string, string> = {
  in_attesa_presa_carico: '#007AFF',
  preso_in_carico: '#007AFF',
  avviato: '#34C759',
  active: '#34C759',
  paused: '#FF9500',
  completed: '#8E8E93',
  archived: '#8E8E93',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'attivi', label: 'Attivi' },
  { id: 'completati', label: 'Completati' },
  { id: 'pausa', label: 'In Pausa' },
];

const FreelanceProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<FreelanceProject[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('tutti');
  const [searchQuery, setSearchQuery] = useState('');

  const basePath = isCrmScoped && crmDepartmentCode
    ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}`
    : '/freelance';

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const crmCode: string | undefined = isCrmScoped ? (crmDepartmentCode ?? undefined) : undefined;
      const cached = freelanceCache.projects.get<FreelanceProject[]>(user.id, crmCode);
      if (cached && cached.length >= 0) {
        setProjects(cached);
        setLoading(false);
      }

      try {
        const list = isCrmScoped && crmDepartmentCode
          ? await freelanceCrmApi.getProjects(crmDepartmentCode)
          : await freelanceApi.getFreelancerProjects();
        setProjects(list);
        freelanceCache.projects.set(user.id, crmCode, list);
      } catch (error) {
        console.error('Error loading projects:', error);
        if (!cached) setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  const handleProjectClick = (project: FreelanceProject) => {
    if (project.is_project_manager) {
      navigate(`${basePath}/progetti/${project.id}/gestione`);
    } else {
      navigate(`${basePath}/progetti/${project.id}`);
    }
  };

  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const getDisplayName = (name: string | null | undefined): string => {
    if (!name?.trim()) return '';
    return name.replace(/^Contratto\s*-\s*[Pp]reventivo\s*/i, '').trim() || name;
  };

  const matchesFilter = (project: FreelanceProject): boolean => {
    const s = project.status;
    if (filterStatus === 'tutti') return true;
    if (filterStatus === 'attivi') return s === 'active' || s === 'avviato' || s === 'preso_in_carico' || s === 'in_attesa_presa_carico';
    if (filterStatus === 'completati') return s === 'completed' || s === 'archived';
    if (filterStatus === 'pausa') return s === 'paused';
    return true;
  };

  const filteredProjects = projects.filter((p) => {
    if (!matchesFilter(p)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        getDisplayName(p.name).toLowerCase().includes(q) ||
        (p.client?.company_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="fp-loading">
        <div className="fp-spinner" />
      </div>
    );
  }

  return (
    <div className="fp-page">
      <GuideTour steps={freelanceProgettiTourSteps} tourId="freelance-progetti-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* ── Header row ── */}
      <div className="fp-header">
        <div className="fp-header-left">
          <h1 className="fp-title">Progetti</h1>
          <span className="fp-count-badge">{projects.length}</span>
        </div>
        <div className="fp-header-right">
          <div className="fp-search">
            <Search size={13} className="fp-search-icon" />
            <input
              type="text"
              placeholder="Cerca..."
              className="fp-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="fp-filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`fp-filter-pill${filterStatus === f.id ? ' active' : ''}`}
                onClick={() => setFilterStatus(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {filteredProjects.length > 0 ? (
        <motion.div
          className="fp-grid"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filteredProjects.map((project) => {
            const statusColor = STATUS_COLORS[project.status] ?? '#8E8E93';
            const statusLabel = STATUS_LABELS[project.status] ?? project.status;
            const displayName = getDisplayName(project.name);
            const progress = project.progress ?? 0;
            const dueDate = formatDate(project.end_date);
            const taskCount = project.is_project_manager
              ? (project.totalTasksCount ?? 0)
              : (project.myTasksCount ?? 0);

            return (
              <motion.div key={project.id} variants={cardVariants}>
                <FreelanceProjectMediaCard
                  project={project}
                  displayName={displayName}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                  progress={progress}
                  taskCount={taskCount}
                  dueDate={dueDate}
                  onClick={() => handleProjectClick(project)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="fp-empty">
          <FolderKanban size={40} className="fp-empty-icon" />
          <p className="fp-empty-text">
            {searchQuery || filterStatus !== 'tutti'
              ? 'Nessun progetto corrisponde ai filtri'
              : 'Nessun progetto assegnato'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FreelanceProjectsPage;
