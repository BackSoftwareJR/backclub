import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Briefcase, Play, ChevronDown, ChevronUp, ExternalLink, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  salesKitVideos,
  salesKitGuideSections,
  salesKitResources,
  type SalesKitVideo,
  type SalesKitResource,
} from '../../data/supportData';
import './SalesKitModal.css';

interface SalesKitModalProps {
  onClose: () => void;
  themeClass?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
};

const transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

const SalesKitModal: React.FC<SalesKitModalProps> = ({ onClose, themeClass = 'theme-light' }) => {
  const navigate = useNavigate();
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set(['sales-listini', 'sales-presentare']));

  const toggleGuide = (id: string) => {
    setExpandedGuides((prev) => {
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
      if (res.downloadUrl) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        if (url === '/seller/listini') {
          onClose();
          navigate('/seller/listini');
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  const handleGoToListini = () => {
    onClose();
    navigate('/seller/listini');
  };

  return (
    <AnimatePresence>
      <motion.div
        className="support-modal-overlay sales-kit-modal-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transition}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-kit-modal-title"
      >
        <motion.div
          className={`support-modal-content sales-kit-modal-content ${themeClass}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="support-modal-header sales-kit-modal-header">
            <div className="support-modal-title-section">
              <Briefcase className="support-modal-icon sales-kit-modal-icon" size={28} />
              <h2 id="sales-kit-modal-title">Sales Kit & Prodotti</h2>
            </div>
            <button type="button" className="support-modal-close" onClick={onClose} aria-label="Chiudi">
              <X size={20} />
            </button>
          </div>

          <div className="support-modal-body sales-kit-modal-body">
            <p className="sales-kit-intro">
              Listini, brochure, schede tecniche, video e script di vendita. Qui trovi tutto il materiale per presentare
              i servizi al cliente e per collegare la proposta ai listini prezzi.
            </p>

            {/* Video consigliati */}
            <section className="sales-kit-section">
              <h3 className="sales-kit-section-title">
                <Play size={14} aria-hidden />
                Video consigliati
              </h3>
              <ul className="sales-kit-video-list" role="list">
                {salesKitVideos.map((video) => (
                  <li key={video.id} className="sales-kit-video-item">
                    <button
                      type="button"
                      className="sales-kit-video-card"
                      onClick={() => handleOpenVideo(video)}
                      disabled={!video.url || video.url === '#'}
                      title={video.url && video.url !== '#' ? 'Apri video' : 'Prossimamente'}
                    >
                      <div className="sales-kit-video-info">
                        <span className="sales-kit-video-title">{video.title}</span>
                        <span className="sales-kit-video-desc">{video.description}</span>
                        <div className="sales-kit-video-meta">
                          {video.duration && <span className="sales-kit-video-duration">{video.duration}</span>}
                          {video.type && (
                            <span className={`sales-kit-video-type type-${video.type}`}>{video.type}</span>
                          )}
                        </div>
                      </div>
                      {video.url && video.url !== '#' && (
                        <ExternalLink size={16} className="sales-kit-video-link-icon" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Guide e spiegazioni */}
            <section className="sales-kit-section">
              <h3 className="sales-kit-section-title">
                <FileText size={14} aria-hidden />
                Guide e spiegazioni
              </h3>
              <div className="sales-kit-guide-list">
                {salesKitGuideSections.map((section) => {
                  const isExpanded = expandedGuides.has(section.id);
                  return (
                    <div key={section.id} className="sales-kit-guide-item">
                      <button
                        type="button"
                        className="sales-kit-guide-title"
                        onClick={() => toggleGuide(section.id)}
                        aria-expanded={isExpanded}
                      >
                        <span>{section.title}</span>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isExpanded && (
                        <div className="sales-kit-guide-content">
                          <p>{section.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Materiali e risorse */}
            <section className="sales-kit-section">
              <h3 className="sales-kit-section-title">
                <Download size={14} aria-hidden />
                Materiali e risorse
              </h3>
              <ul className="sales-kit-resource-list" role="list">
                {salesKitResources.map((res) => {
                  const hasLink = (res.url || res.downloadUrl) && (res.url || res.downloadUrl) !== '#';
                  const isListini = res.url === '/seller/listini';
                  return (
                    <li key={res.id} className="sales-kit-resource-item">
                      <div className="sales-kit-resource-info">
                        <span className="sales-kit-resource-title">{res.title}</span>
                        <span className="sales-kit-resource-desc">{res.description}</span>
                      </div>
                      {hasLink && (
                        <button
                          type="button"
                          className="sales-kit-resource-btn"
                          onClick={() => handleOpenResource(res)}
                        >
                          {isListini ? 'Vai ai Listini' : res.downloadUrl ? 'Scarica' : 'Apri'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* CTA Listini */}
            <div className="sales-kit-cta">
              <button type="button" className="sales-kit-cta-btn" onClick={handleGoToListini}>
                <Briefcase size={18} />
                Vai ai Listini
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SalesKitModal;
