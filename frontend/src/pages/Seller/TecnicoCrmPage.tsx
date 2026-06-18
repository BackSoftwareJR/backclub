import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  LogIn,
  LayoutDashboard,
  Ticket,
  Bug,
  CheckCircle2,
  Globe,
  MonitorSmartphone,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { tecnicoCrmGuideSections } from '../../data/supportData';
import './TecnicoCrmPage.css';

/* ── System info panel ────────────────────────────────────────────────── */
interface InfoItem {
  label: string;
  value: string;
  status?: 'ok' | 'warning' | 'info';
}

const SYSTEM_INFO: InfoItem[] = [
  { label: 'Piattaforma', value: 'BackClub CRM', status: 'ok' },
  { label: 'Stato sistema', value: 'Operativo', status: 'ok' },
  { label: 'Browser consigliati', value: 'Chrome · Firefox · Safari · Edge', status: 'info' },
  { label: 'Dispositivi', value: 'Desktop, tablet e mobile', status: 'info' },
  { label: 'Segnalazioni', value: 'Via ticket in-app', status: 'info' },
  { label: 'Supporto tecnico', value: 'Lun – Ven, orario ufficio', status: 'ok' },
];

/* ── Guide badge type ────────────────────────────────────────────────── */
type GuideBadge = 'info' | 'warning' | 'success' | 'default';

const GUIDE_BADGES: Record<string, GuideBadge> = {
  'tech-login': 'warning',
  'tech-crm-panoramica': 'info',
  'tech-crm-preventivi-contratti': 'success',
  'tech-crm-commissioni-listini': 'success',
  'tech-segnalazione': 'warning',
  'tech-browser-dispositivi': 'info',
  'tech-contatti-supporto': 'info',
};

const GUIDE_BADGE_LABELS: Record<GuideBadge, string> = {
  info: 'Guida',
  warning: 'Importante',
  success: 'Disponibile',
  default: 'Info',
};

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

const TecnicoCrmPage: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tech-login', 'tech-segnalazione', 'tech-contatti-supporto'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApriSegnalazione = () => {
    navigate('/seller/supporto/nuovo-ticket');
  };

  const themeClass = resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light';

  return (
    <div
      className={`tecnico-crm-page ${themeClass}`}
      data-mobile={isMobile}
    >
      {/* Back link */}
      <div className="tech-back-wrap">
        <button
          type="button"
          className="tech-back-btn"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Torna a Supporto"
        >
          <ArrowLeft size={20} aria-hidden />
          <span>Supporto</span>
        </button>
      </div>

      {/* Decorative background */}
      <div className="tech-hero-bg" aria-hidden>
        <div className="tech-hero-orb tech-hero-orb-1" />
        <div className="tech-hero-orb tech-hero-orb-2" />
        <div className="tech-hero-grid" />
      </div>

      {/* Hero */}
      <header className="tech-hero">
        <div className="tech-hero-inner">
          <motion.div
            className="tech-hero-icon-wrap"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <Laptop className="tech-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            className="tech-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            Tecnico & CRM
          </motion.h1>

          <motion.p
            className="tech-hero-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            Problemi di login, bug del sito e guide all&apos;uso del CRM. Per segnalare un problema
            usa Apri Segnalazione.
          </motion.p>
        </div>
      </header>

      {/* CTA Apri Segnalazione – in evidenza */}
      <motion.section
        className="tech-cta-segnalazione"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
      >
        <button
          type="button"
          className="tech-cta-segnalazione-btn"
          onClick={handleApriSegnalazione}
          aria-label="Apri Segnalazione"
        >
          <Ticket size={22} aria-hidden />
          <span>Apri Segnalazione</span>
          <ArrowRight size={18} aria-hidden />
        </button>
        <p className="tech-cta-segnalazione-note">
          Segnala bug, problemi di accesso o malfunzionamenti. Il team tecnico ti risponderà.
        </p>
      </motion.section>

      {/* Sistema info – two-column grid ─────────────────────────────────── */}
      <section className="tech-section">
        <h2 className="tech-section-heading">
          <MonitorSmartphone size={22} aria-hidden />
          Informazioni sistema
        </h2>
        <motion.div
          className="tech-info-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {SYSTEM_INFO.map((item) => (
            <motion.div key={item.label} className="tech-info-item" variants={itemVariants}>
              <span className="tech-info-label">{item.label}</span>
              <div className="tech-info-value-row">
                {item.status === 'ok' && (
                  <CheckCircle2 size={14} className="tech-info-status-icon tech-status-ok" aria-hidden />
                )}
                {item.status === 'warning' && (
                  <AlertCircle size={14} className="tech-info-status-icon tech-status-warning" aria-hidden />
                )}
                {item.status === 'info' && (
                  <Globe size={14} className="tech-info-status-icon tech-status-info" aria-hidden />
                )}
                <span className="tech-info-value">{item.value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Guide ────────────────────────────────────────────────────────────── */}
      <section className="tech-section">
        <h2 className="tech-section-heading">
          <HelpCircle size={22} aria-hidden />
          Guide
        </h2>
        <motion.div
          className="tech-guide-list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {tecnicoCrmGuideSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const badgeType: GuideBadge = GUIDE_BADGES[section.id] ?? 'default';
            return (
              <motion.div
                key={section.id}
                className="tech-guide-item"
                variants={itemVariants}
              >
                <button
                  type="button"
                  className={`tech-guide-trigger${isExpanded ? ' expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="tech-guide-trigger-text">{section.title}</span>
                  <span className={`tech-guide-badge tech-guide-badge--${badgeType}`}>
                    {GUIDE_BADGE_LABELS[badgeType]}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={20} className="tech-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={20} className="tech-guide-chevron" aria-hidden />
                  )}
                </button>
                <div
                  className={`tech-guide-body${isExpanded ? ' expanded' : ''}`}
                  data-expanded={isExpanded}
                >
                  <div className="tech-guide-body-inner">
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
        className="tech-summary-strip"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="tech-summary-item">
          <div className="tech-summary-icon-wrap tech-summary-icon-login">
            <LogIn size={20} aria-hidden />
          </div>
          <span className="tech-summary-label">Accesso</span>
        </div>
        <div className="tech-summary-item">
          <div className="tech-summary-icon-wrap tech-summary-icon-crm">
            <LayoutDashboard size={20} aria-hidden />
          </div>
          <span className="tech-summary-label">CRM</span>
        </div>
        <div className="tech-summary-item">
          <div className="tech-summary-icon-wrap tech-summary-icon-bug">
            <Bug size={20} aria-hidden />
          </div>
          <span className="tech-summary-label">Bug</span>
        </div>
        <div className="tech-summary-item">
          <div className="tech-summary-icon-wrap tech-summary-icon-ticket">
            <Ticket size={20} aria-hidden />
          </div>
          <span className="tech-summary-label">Segnalazione</span>
        </div>
      </motion.section>

      {/* CTA Apri Segnalazione – ripetuto in fondo */}
      <motion.section
        className="tech-cta"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36 }}
      >
        <button type="button" className="tech-cta-btn" onClick={handleApriSegnalazione}>
          <Ticket size={22} aria-hidden />
          <span>Apri Segnalazione</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </motion.section>
    </div>
  );
};

export default TecnicoCrmPage;
