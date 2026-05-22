import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  PenTool,
  FileCheck,
  ClipboardList,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { contrattualisticaGuideSections } from '../../data/supportData';
import './ContrattualisticaPage.css';

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
          <div className="contr-hero-icon-wrap">
            <FileText className="contr-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </div>
          <h1 className="contr-hero-title">Contrattualistica</h1>
          <p className="contr-hero-subtitle">
            Moduli d’ordine, termini di servizio e firme digitali. Tutto quello che ti serve per preventivi e contratti.
          </p>
        </div>
      </header>

      {/* Guide */}
      <section className="contr-section contr-anim-in">
        <h2 className="contr-section-heading">
          <FileText size={22} aria-hidden />
          Guide
        </h2>
        <div className="contr-guide-list">
          {contrattualisticaGuideSections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div
                key={section.id}
                className="contr-guide-item contr-anim-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  type="button"
                  className={`contr-guide-trigger ${isExpanded ? 'expanded' : ''}`}
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
                <div className={`contr-guide-body ${isExpanded ? 'expanded' : ''}`} data-expanded={isExpanded}>
                  <div className="contr-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Summary strip */}
      <section className="contr-summary-strip contr-anim-in">
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
      </section>

      {/* CTA */}
      <section className="contr-cta contr-anim-in">
        <button type="button" className="contr-cta-btn" onClick={handleGoToPreventivi}>
          <FileText size={22} aria-hidden />
          <span>Vai a Preventivi</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </section>
    </div>
  );
};

export default ContrattualisticaPage;
