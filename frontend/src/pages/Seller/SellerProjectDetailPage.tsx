import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FolderKanban, Building2, Calendar, Users,
  FileText, Link, GitBranch, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { crmProjectsApi } from '../../api/crmProjects';
import type { CrmProject } from '../../api/crmProjects';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerProjectDetailPage.css';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  in_attesa_presa_carico: { label: 'In Attesa',         cls: 'seller-badge-warning' },
  preso_in_carico:        { label: 'Preso in Carico',   cls: 'seller-badge-info' },
  avviato:                { label: 'Avviato',           cls: 'seller-badge-active' },
  active:                 { label: 'Attivo',            cls: 'seller-badge-active' },
  paused:                 { label: 'In Pausa',          cls: 'seller-badge-warning' },
  on_hold:                { label: 'In Pausa',          cls: 'seller-badge-warning' },
  planning:               { label: 'Pianificazione',    cls: 'seller-badge-info' },
  completed:              { label: 'Completato',        cls: 'seller-badge-completed' },
  archived:               { label: 'Archiviato',        cls: 'seller-badge-secondary' },
  cancelled:              { label: 'Annullato',         cls: 'seller-badge-danger' },
};

const CONTRACT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Bozza',       cls: 'seller-badge-secondary' },
  pending:   { label: 'In Attesa',   cls: 'seller-badge-warning' },
  signed:    { label: 'Firmato',     cls: 'seller-badge-active' },
  active:    { label: 'Attivo',      cls: 'seller-badge-active' },
  expired:   { label: 'Scaduto',     cls: 'seller-badge-danger' },
  cancelled: { label: 'Annullato',   cls: 'seller-badge-danger' },
};

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

interface TimelineItem {
  date: string;
  label: string;
  icon: React.ReactNode;
  type: 'success' | 'info' | 'warning';
}

const buildTimeline = (project: CrmProject): TimelineItem[] => {
  const items: TimelineItem[] = [];

  items.push({
    date: project.created_at,
    label: 'Progetto creato',
    icon: <FolderKanban size={13} />,
    type: 'info',
  });

  if (project.start_date) {
    items.push({
      date: project.start_date,
      label: 'Data di inizio',
      icon: <Calendar size={13} />,
      type: 'success',
    });
  }

  (project.contracts ?? []).forEach((c) => {
    items.push({
      date: c.created_at ?? project.created_at,
      label: `Contratto ${c.contract_number}`,
      icon: <FileText size={13} />,
      type: 'info',
    });
  });

  if (project.status === 'completed' && project.end_date) {
    items.push({
      date: project.end_date,
      label: 'Progetto completato',
      icon: <CheckCircle2 size={13} />,
      type: 'success',
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const SellerProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<CrmProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await crmProjectsApi.getById(Number(id));
      setProject(res.data);
    } catch (e) {
      console.error('Errore nel caricamento progetto:', e);
      setError('Impossibile caricare il progetto.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="spd-page">
        <SkeletonLoader type="page-header" />
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="spd-page">
        <div className="spd-error">
          <AlertCircle size={32} />
          <p>{error ?? 'Progetto non trovato.'}</p>
          <button className="spd-back-btn" onClick={() => navigate('/seller/progetti')}>
            <ArrowLeft size={16} /> Torna ai progetti
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, cls: 'seller-badge-secondary' };
  const timeline = buildTimeline(project);

  return (
    <motion.div
      className="spd-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] as const }}
    >
      {/* Back */}
      <button className="spd-back-btn" onClick={() => navigate('/seller/progetti')}>
        <ArrowLeft size={16} />
        Progetti
      </button>

      {/* Page header */}
      <div className="spd-page-header">
        <div className="spd-header-icon">
          <FolderKanban size={22} />
        </div>
        <div className="spd-header-info">
          <div className="spd-header-row">
            <h1 className="spd-project-name">{project.name}</h1>
            <span className={`seller-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
          </div>
          {project.description && (
            <p className="spd-project-desc">{project.description}</p>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="spd-layout">

        {/* ── Left: main details ── */}
        <div className="spd-main">

          {/* Info */}
          <section className="spd-section">
            <h2 className="spd-section-title">Dettagli</h2>
            <div className="spd-hairline" />
            <dl className="spd-info-grid">
              <div className="spd-info-row">
                <dt className="spd-info-label">Cliente</dt>
                <dd className="spd-info-value">
                  <Building2 size={14} className="spd-info-icon" />
                  {project.client?.company_name ?? '—'}
                </dd>
              </div>
              <div className="spd-info-row">
                <dt className="spd-info-label">Data Inizio</dt>
                <dd className="spd-info-value">
                  <Calendar size={14} className="spd-info-icon" />
                  {formatDate(project.start_date)}
                </dd>
              </div>
              <div className="spd-info-row">
                <dt className="spd-info-label">Data Fine</dt>
                <dd className="spd-info-value">
                  <Calendar size={14} className="spd-info-icon" />
                  {formatDate(project.end_date)}
                </dd>
              </div>
              {project.github_url && (
                <div className="spd-info-row">
                  <dt className="spd-info-label">GitHub</dt>
                  <dd className="spd-info-value">
                    <GitBranch size={14} className="spd-info-icon" />
                    <a href={project.github_url} target="_blank" rel="noreferrer" className="spd-link">
                      Repository
                    </a>
                  </dd>
                </div>
              )}
              {project.website_url && (
                <div className="spd-info-row">
                  <dt className="spd-info-label">Website</dt>
                  <dd className="spd-info-value">
                    <Link size={14} className="spd-info-icon" />
                    <a href={project.website_url} target="_blank" rel="noreferrer" className="spd-link">
                      Visita il sito
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Contracts */}
          {project.contracts && project.contracts.length > 0 && (
            <section className="spd-section">
              <h2 className="spd-section-title">Contratti</h2>
              <div className="spd-hairline" />
              <div className="spd-contracts-list">
                {project.contracts.map((contract) => {
                  const cStatus = CONTRACT_STATUS_MAP[contract.status] ?? { label: contract.status, cls: 'seller-badge-secondary' };
                  return (
                    <div key={contract.id} className="spd-contract-row">
                      <div className="spd-contract-icon">
                        <FileText size={15} />
                      </div>
                      <div className="spd-contract-info">
                        <span className="spd-contract-number">{contract.contract_number}</span>
                        <span className="spd-contract-title-text">{contract.title}</span>
                      </div>
                      <span className={`seller-badge ${cStatus.cls}`}>{cStatus.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Team members */}
          {project.teamMembers && project.teamMembers.length > 0 && (
            <section className="spd-section">
              <h2 className="spd-section-title">
                <Users size={15} className="spd-section-icon" /> Team
              </h2>
              <div className="spd-hairline" />
              <div className="spd-team-list">
                {project.teamMembers.map((member) => (
                  <div key={member.id} className="spd-team-row">
                    <div className="spd-team-avatar">
                      {member.user?.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="spd-team-info">
                      <span className="spd-team-name">{member.user?.name ?? 'Utente'}</span>
                      <span className="spd-team-role">{member.role}</span>
                    </div>
                    {!member.is_active && (
                      <span className="seller-badge seller-badge-secondary">Inattivo</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: timeline + status card ── */}
        <aside className="spd-sidebar">

          {/* Status card */}
          <section className="spd-section">
            <h2 className="spd-section-title">Stato Progetto</h2>
            <div className="spd-hairline" />
            <div className="spd-status-info">
              <span className={`seller-badge seller-badge-lg ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
              <p className="spd-status-updated">
                Aggiornato il {formatDate(project.updated_at)}
              </p>
            </div>
          </section>

          {/* Timeline */}
          <section className="spd-section">
            <h2 className="spd-section-title">
              <Clock size={15} className="spd-section-icon" /> Attività
            </h2>
            <div className="spd-hairline" />
            <div className="spd-timeline">
              {timeline.length === 0 && (
                <p className="spd-tl-empty">Nessuna attività registrata</p>
              )}
              {timeline.map((item, i) => (
                <div key={i} className={`spd-tl-item spd-tl-${item.type}`}>
                  {i < timeline.length - 1 && <div className="spd-tl-line" />}
                  <div className="spd-tl-dot">{item.icon}</div>
                  <div className="spd-tl-content">
                    <span className="spd-tl-label">{item.label}</span>
                    <span className="spd-tl-date">{formatDateShort(item.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </motion.div>
  );
};

export default SellerProjectDetailPage;
