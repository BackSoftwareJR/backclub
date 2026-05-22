import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Briefcase } from 'lucide-react';
import { crmProjectsApi, type CrmProject } from '../../api/crmProjects';
import './ProjectSelectorModal.css';

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (project: CrmProject) => void;
}

const ProjectSelectorModal: React.FC<ProjectSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CrmProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      // Focus sul campo di ricerca quando si apre
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setProjects([]);
      setFilteredProjects([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.client?.company_name?.toLowerCase().includes(query) ||
          project.crmDepartment?.name?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await crmProjectsApi.getAll({ per_page: 100 });
      const projectsList = response.data || [];
      setProjects(projectsList);
      setFilteredProjects(projectsList);
    } catch (error) {
      console.error('Errore nel caricamento progetti:', error);
      alert('Errore nel caricamento progetti');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (project: CrmProject) => {
    onSelect(project);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="project-selector-modal-overlay" onClick={onClose}>
      <div
        className="project-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="project-selector-header">
          <h2>Seleziona Progetto</h2>
          <button className="project-selector-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="project-selector-search">
          <Search size={18} className="project-selector-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cerca per nome progetto, cliente o dipartimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="project-selector-search-input"
          />
        </div>

        <div className="project-selector-list">
          {loading ? (
            <div className="project-selector-loading">
              <div className="spinner"></div>
              <p>Caricamento progetti...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="project-selector-empty">
              <Briefcase size={48} />
              <p>
                {searchQuery
                  ? 'Nessun progetto trovato'
                  : 'Nessun progetto disponibile'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="project-selector-item"
                onClick={() => handleSelect(project)}
              >
                <div className="project-selector-item-icon">
                  <Briefcase size={20} />
                </div>
                <div className="project-selector-item-content">
                  <div className="project-selector-item-name">{project.name}</div>
                  <div className="project-selector-item-meta">
                    {project.client?.company_name && (
                      <span className="project-selector-item-client">
                        {project.client.company_name}
                      </span>
                    )}
                    {project.crmDepartment?.name && (
                      <span className="project-selector-item-department">
                        {project.crmDepartment.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="project-selector-item-status">
                  <span
                    className={`status-badge status-${project.status}`}
                  >
                    {project.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectorModal;

