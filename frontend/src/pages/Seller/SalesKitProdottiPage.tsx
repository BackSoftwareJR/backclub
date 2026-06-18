import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  FileText,
  Play,
  ExternalLink,
  Package,
  MessageCircle,
  Target,
  Download,
  Calendar,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  salesKitVideos,
  salesKitGuideSections,
  salesKitResources,
  type SalesKitVideo,
  type SalesKitResource,
} from '../../data/supportData';
import './SalesKitProdottiPage.css';

type VideoFilter = 'all' | 'formazione' | 'prodotto' | 'vendita';

const FILTER_LABELS: Record<VideoFilter, string> = {
  all: 'Tutti',
  formazione: 'Formazione',
  prodotto: 'Prodotto',
  vendita: 'Vendita',
};

const resourceTypeIcon = (type: string) => {
  switch (type) {
    case 'brochure': return <FileText size={20} aria-hidden />;
    case 'scheda': return <Package size={20} aria-hidden />;
    case 'script': return <MessageCircle size={20} aria-hidden />;
    case 'pdf': return <Download size={20} aria-hidden />;
    default: return <FileText size={20} aria-hidden />;
  }
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

const SalesKitProdottiPage: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<VideoFilter>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['sales-listini', 'sales-presentare', 'sales-prima-chiamata'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenVideo = (video: SalesKitVideo) => {
    if (video.url && video.url !== '#') {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenResource = (res: SalesKitResource) => {
    const url = res.url || res.downloadUrl;
    if (url && url !== '#') {
      if (url === '/seller/listini') {
        navigate('/seller/listini');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleGoToListini = () => {
    navigate('/seller/listini');
  };

  const filteredVideos =
    activeFilter === 'all'
      ? salesKitVideos
      : salesKitVideos.filter((v) => v.type === activeFilter);

  const themeClass = resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light';

  return (
    <div
      className={`sales-kit-prodotti-page ${themeClass}`}
      data-mobile={isMobile}
    >
      {/* Back link */}
      <div className="skp-back-wrap">
        <button
          type="button"
          className="skp-back-btn"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Torna a Supporto"
        >
          <ArrowLeft size={20} aria-hidden />
          <span>Supporto</span>
        </button>
      </div>

      {/* Decorative background */}
      <div className="skp-hero-bg" aria-hidden>
        <div className="skp-hero-orb skp-hero-orb-1" />
        <div className="skp-hero-orb skp-hero-orb-2" />
        <div className="skp-hero-grid" />
      </div>

      {/* Hero */}
      <header className="skp-hero">
        <div className="skp-hero-inner">
          <motion.div
            className="skp-hero-icon-wrap"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <Briefcase className="skp-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </motion.div>

          <motion.div
            className="skp-hero-badge"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.12 }}
          >
            <Calendar size={12} aria-hidden />
            <span>Aggiornato a Giugno 2026</span>
          </motion.div>

          <motion.h1
            className="skp-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
          >
            Sales Kit & Prodotti
          </motion.h1>

          <motion.p
            className="skp-hero-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
          >
            Listini, brochure, schede tecniche, video e script di vendita. Tutto il materiale per
            presentare i servizi al cliente.
          </motion.p>
        </div>
      </header>

      {/* Video consigliati */}
      <section className="skp-section">
        <h2 className="skp-section-heading">
          <Play size={22} aria-hidden />
          Video consigliati
        </h2>

        {/* Category filter pills */}
        <div className="skp-filter-pills" role="group" aria-label="Filtra per categoria">
          {(Object.keys(FILTER_LABELS) as VideoFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`skp-filter-pill${activeFilter === filter ? ' active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={activeFilter}
            className="skp-video-list"
            role="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {filteredVideos.map((video) => (
              <motion.li key={video.id} className="skp-video-item" variants={itemVariants}>
                <button
                  type="button"
                  className="skp-video-card"
                  onClick={() => handleOpenVideo(video)}
                  disabled={!video.url || video.url === '#'}
                  title={video.url && video.url !== '#' ? 'Apri video' : 'Presto in arrivo'}
                >
                  <div className="skp-video-info">
                    <span className="skp-video-title">{video.title}</span>
                    <span className="skp-video-desc">{video.description}</span>
                    <div className="skp-video-meta">
                      {video.duration && (
                        <span className="skp-video-duration">{video.duration}</span>
                      )}
                      {video.type && (
                        <span className={`skp-video-type type-${video.type}`}>{video.type}</span>
                      )}
                      {(!video.url || video.url === '#') && (
                        <span className="skp-video-soon">Presto in arrivo</span>
                      )}
                    </div>
                  </div>
                  {video.url && video.url !== '#' ? (
                    <ExternalLink size={18} className="skp-video-link-icon" aria-hidden />
                  ) : (
                    <span className="skp-video-soon-badge">Presto in arrivo</span>
                  )}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </section>

      {/* Guide approfondite */}
      <section className="skp-section">
        <h2 className="skp-section-heading">
          <FileText size={22} aria-hidden />
          Guide approfondite
        </h2>
        <motion.div
          className="skp-guide-list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {salesKitGuideSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <motion.div
                key={section.id}
                className="skp-guide-item"
                variants={itemVariants}
              >
                <button
                  type="button"
                  className={`skp-guide-trigger${isExpanded ? ' expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="skp-guide-trigger-text">{section.title}</span>
                  {isExpanded ? (
                    <ChevronUp size={22} className="skp-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={22} className="skp-guide-chevron" aria-hidden />
                  )}
                </button>
                <div
                  className={`skp-guide-body${isExpanded ? ' expanded' : ''}`}
                  data-expanded={isExpanded}
                >
                  <div className="skp-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Materiali e risorse */}
      <section className="skp-section">
        <h2 className="skp-section-heading">
          <Package size={22} aria-hidden />
          Materiali e risorse
        </h2>
        <motion.ul
          className="skp-resource-grid"
          role="list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {salesKitResources.map((res) => {
            const hasLink =
              (res.url || res.downloadUrl) && (res.url || res.downloadUrl) !== '#';
            const isListini = res.url === '/seller/listini';
            const hasDownload = !!res.downloadUrl && res.downloadUrl !== '#';
            return (
              <motion.li key={res.id} className="skp-resource-card" variants={itemVariants}>
                <div className="skp-resource-icon-wrap">
                  {resourceTypeIcon(res.type)}
                </div>
                <div className="skp-resource-info">
                  <span className="skp-resource-title">{res.title}</span>
                  <span className="skp-resource-desc">{res.description}</span>
                </div>
                {hasLink ? (
                  <button
                    type="button"
                    className="skp-resource-btn"
                    onClick={() => handleOpenResource(res)}
                  >
                    {hasDownload && <Download size={14} aria-hidden />}
                    <span>{isListini ? 'Vai ai Listini' : hasDownload ? 'Scarica' : 'Apri'}</span>
                  </button>
                ) : (
                  <span className="skp-resource-soon">Presto in arrivo</span>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      </section>

      {/* Summary strip */}
      <motion.section
        className="skp-summary-strip"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="skp-summary-item">
          <div className="skp-summary-icon-wrap skp-summary-icon-listini">
            <Package size={20} aria-hidden />
          </div>
          <span className="skp-summary-label">Listini</span>
        </div>
        <div className="skp-summary-item">
          <div className="skp-summary-icon-wrap skp-summary-icon-presenta">
            <MessageCircle size={20} aria-hidden />
          </div>
          <span className="skp-summary-label">Presenta</span>
        </div>
        <div className="skp-summary-item">
          <div className="skp-summary-icon-wrap skp-summary-icon-preventivo">
            <Target size={20} aria-hidden />
          </div>
          <span className="skp-summary-label">Preventivo</span>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="skp-cta"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36 }}
      >
        <button type="button" className="skp-cta-btn" onClick={handleGoToListini}>
          <Briefcase size={22} aria-hidden />
          <span>Vai ai Listini</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </motion.section>
    </div>
  );
};

export default SalesKitProdottiPage;
