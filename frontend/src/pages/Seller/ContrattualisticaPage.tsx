import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  PenTool,
  FileCheck,
  ClipboardList,
  Download,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  FileSignature,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { contrattualisticaGuideSections, POLICY_DRIVE_URL } from '../../data/supportData';
import './ContrattualisticaPage.css';

/* ── Static document cards ────────────────────────────────────────────── */
interface DocCard {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'archived';
  downloadUrl?: string;
}

const KEY_DOCUMENTS: DocCard[] = [
  {
    id: 'doc-privacy',
    title: 'Informativa Privacy & Consenso',
    description: 'Da far firmare al cliente prima di inviare qualsiasi preventivo (GDPR).',
    status: 'active',
    downloadUrl: POLICY_DRIVE_URL,
  },
  {
    id: 'doc-termini',
    title: 'Termini di Servizio',
    description: 'Condizioni standard incluse automaticamente in ogni contratto.',
    status: 'active',
  },
  {
    id: 'doc-modulo-ordine',
    title: 'Modulo d\'Ordine',
    description: 'Documento contrattuale generato dalla piattaforma al momento dell\'accettazione.',
    status: 'active',
  },
  {
    id: 'doc-policy-drive',
    title: 'Policy & Documenti su Drive',
    description: 'Cartella Google Drive aggiornata con tutte le policy aziendali.',
    status: 'active',
    downloadUrl: POLICY_DRIVE_URL,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const ContrattualisticaPage: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['contr-privacy-gdpr', 'contr-policy-drive', 'contr-preventivo', 'contr-firma', 'contr-richiesta-contratto'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGoToPreventivi = () => {
    navigate('/seller/preventivi');
  };

  const handleOpenDoc = (url?: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const themeClass = resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light';

  return (
    <div
      className={`contrattualistica-page ${themeClass}`}
      data-mobile={isMobile}
    >
      {/* Back link */}
      <div className="contr-back-wrap">
        <button
          type="button"
          className="contr-back-btn"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Torna a Supporto"
        >
          <ArrowLeft size={20} aria-hidden />
          <span>Supporto</span>
        </button>
      </div>

      {/* Decorative background */}
      <div className="contr-hero-bg" aria-hidden>
        <div className="contr-hero-orb contr-hero-orb-1" />
        <div className="contr-hero-orb contr-hero-orb-2" />
        <div className="contr-hero-grid" />
      </div>

      {/* Hero */}
      <header className="contr-hero">
        <div className="contr-hero-inner">
          <motion.div
            className="contr-hero-icon-wrap"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <FileText className="contr-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            className="contr-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            Contrattualistica
          </motion.h1>

          <motion.p
            className="contr-hero-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            Moduli d&apos;ordine, termini di servizio e firme digitali. Tutto quello che ti serve per
            preventivi e contratti.
          </motion.p>
        </div>
      </header>

      {/* Documenti chiave – card grid */}
      <section className="contr-section">
        <h2 className="contr-section-heading">
          <FolderOpen size={22} aria-hidden />
          Documenti chiave
        </h2>
        <motion.div
          className="contr-doc-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {KEY_DOCUMENTS.map((doc) => (
            <motion.div key={doc.id} className="contr-doc-card" variants={itemVariants}>
              <div className="contr-doc-card-header">
                <div className="contr-doc-icon">
                  <FileSignature size={22} aria-hidden />
                </div>
                <span className={`contr-doc-status contr-doc-status--${doc.status}`}>
                  {doc.status === 'active' ? 'Attivo' : 'Archiviato'}
                </span>
              </div>
              <p className="contr-doc-title">{doc.title}</p>
              <p className="contr-doc-desc">{doc.description}</p>
              {doc.downloadUrl ? (
                <button
                  type="button"
                  className="contr-doc-btn"
                  onClick={() => handleOpenDoc(doc.downloadUrl)}
                >
                  <ExternalLink size={14} aria-hidden />
                  <span>Apri su Drive</span>
                </button>
              ) : (
                <button type="button" className="contr-doc-btn contr-doc-btn--outline" disabled>
                  <Download size={14} aria-hidden />
                  <span>In piattaforma</span>
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Google Drive card */}
      <section className="contr-section">
        <motion.div
          className="contr-drive-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <div className="contr-drive-card-left">
            <div className="contr-drive-icon">
              <ShieldCheck size={26} aria-hidden />
            </div>
            <div>
              <p className="contr-drive-title">Policy clienti — Google Drive</p>
              <p className="contr-drive-desc">
                Cartella condivisa con tutte le policy aggiornate: informativa privacy, consenso GDPR,
                termini. Sempre sincronizzata.
              </p>
            </div>
          </div>
          <a
            href={POLICY_DRIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="contr-drive-btn"
          >
            <ExternalLink size={16} aria-hidden />
            <span>Apri cartella</span>
          </a>
        </motion.div>
      </section>

      {/* Guide */}
      <section className="contr-section">
        <h2 className="contr-section-heading">
          <FileText size={22} aria-hidden />
          Guide
        </h2>
        <motion.div
          className="contr-guide-list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {contrattualisticaGuideSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <motion.div
                key={section.id}
                className="contr-guide-item"
                variants={itemVariants}
              >
                <button
                  type="button"
                  className={`contr-guide-trigger${isExpanded ? ' expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="contr-guide-trigger-text">{section.title}</span>
                  {isExpanded ? (
                    <ChevronUp size={22} className="contr-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={22} className="contr-guide-chevron" aria-hidden />
                  )}
                </button>
                <div
                  className={`contr-guide-body${isExpanded ? ' expanded' : ''}`}
                  data-expanded={isExpanded}
                >
                  <div className="contr-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Summary strip */}
      <motion.section
        className="contr-summary-strip"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="contr-summary-item">
          <div className="contr-summary-icon-wrap contr-summary-icon-preventivo">
            <FileText size={20} aria-hidden />
          </div>
          <span className="contr-summary-label">Preventivo</span>
        </div>
        <div className="contr-summary-item">
          <div className="contr-summary-icon-wrap contr-summary-icon-firma">
            <PenTool size={20} aria-hidden />
          </div>
          <span className="contr-summary-label">Firma</span>
        </div>
        <div className="contr-summary-item">
          <div className="contr-summary-icon-wrap contr-summary-icon-contratto">
            <FileCheck size={20} aria-hidden />
          </div>
          <span className="contr-summary-label">Contratto</span>
        </div>
        <div className="contr-summary-item">
          <div className="contr-summary-icon-wrap contr-summary-icon-moduli">
            <ClipboardList size={20} aria-hidden />
          </div>
          <span className="contr-summary-label">Moduli</span>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="contr-cta"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36 }}
      >
        <button type="button" className="contr-cta-btn" onClick={handleGoToPreventivi}>
          <FileText size={22} aria-hidden />
          <span>Vai a Preventivi</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </motion.section>
    </div>
  );
};

export default ContrattualisticaPage;
