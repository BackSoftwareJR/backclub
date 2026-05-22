import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const SalesKitProdottiPage: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
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
          <div className="skp-hero-icon-wrap">
            <Briefcase className="skp-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </div>
          <h1 className="skp-hero-title">Sales Kit & Prodotti</h1>
          <p className="skp-hero-subtitle">
            Listini, brochure, schede tecniche, video e script di vendita. Tutto il materiale per presentare i servizi al cliente.
          </p>
        </div>
      </header>

      {/* Video consigliati */}
      <section className="skp-section skp-anim-in">
        <h2 className="skp-section-heading">
          <Play size={22} aria-hidden />
          Video consigliati
        </h2>
        <ul className="skp-video-list" role="list">
          {salesKitVideos.map((video, index) => (
            <li key={video.id} className="skp-video-item skp-anim-in" style={{ animationDelay: `${index * 0.05}s` }}>
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
                    {video.duration && <span className="skp-video-duration">{video.duration}</span>}
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
            </li>
          ))}
        </ul>
      </section>

      {/* Guide approfondite */}
      <section className="skp-section skp-anim-in">
        <h2 className="skp-section-heading">
          <FileText size={22} aria-hidden />
          Guide approfondite
        </h2>
        <div className="skp-guide-list">
          {salesKitGuideSections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div
                key={section.id}
                className={`skp-guide-item skp-anim-in`}
                style={{ animationDelay: `${0.1 + index * 0.04}s` }}
              >
                <button
                  type="button"
                  className={`skp-guide-trigger ${isExpanded ? 'expanded' : ''}`}
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
                <div className={`skp-guide-body ${isExpanded ? 'expanded' : ''}`} data-expanded={isExpanded}>
                  <div className="skp-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Materiali e risorse */}
      <section className="skp-section skp-anim-in">
        <h2 className="skp-section-heading">
          <Package size={22} aria-hidden />
          Materiali e risorse
        </h2>
        <ul className="skp-resource-list" role="list">
          {salesKitResources.map((res) => {
            const hasLink = (res.url || res.downloadUrl) && (res.url || res.downloadUrl) !== '#';
            const isListini = res.url === '/seller/listini';
            return (
              <li key={res.id} className="skp-resource-item">
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
                    {isListini ? 'Vai ai Listini' : res.downloadUrl ? 'Scarica' : 'Apri'}
                  </button>
                ) : (
                  <span className="skp-resource-soon">Presto in arrivo</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Summary strip */}
      <section className="skp-summary-strip skp-anim-in">
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
      </section>

      {/* CTA */}
      <section className="skp-cta skp-anim-in">
        <button type="button" className="skp-cta-btn" onClick={handleGoToListini}>
          <Briefcase size={22} aria-hidden />
          <span>Vai ai Listini</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </section>
    </div>
  );
};

export default SalesKitProdottiPage;
