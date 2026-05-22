import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { tecnicoCrmGuideSections } from '../../data/supportData';
import './TecnicoCrmPage.css';

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
          <div className="tech-hero-icon-wrap">
            <Laptop className="tech-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </div>
          <h1 className="tech-hero-title">Tecnico & CRM</h1>
          <p className="tech-hero-subtitle">
            Problemi di login, bug del sito e guide all’uso del CRM. Per segnalare un problema usa Apri Segnalazione.
          </p>
        </div>
      </header>

      {/* CTA Apri Segnalazione – in evidenza */}
      <section className="tech-cta-segnalazione tech-anim-in">
        <button
          type="button"
          className="tech-cta-segnalazione-btn"
          onClick={handleApriSegnalazione}
          aria-label="Apri Segnalazione"
        >
          <Ticket size={24} aria-hidden />
          <span>Apri Segnalazione</span>
          <ArrowRight size={20} aria-hidden />
        </button>
        <p className="tech-cta-segnalazione-note">
          Segnala bug, problemi di accesso o malfunzionamenti. Il team tecnico ti risponderà.
        </p>
      </section>

      {/* Guide */}
      <section className="tech-section tech-anim-in">
        <h2 className="tech-section-heading">
          <Laptop size={22} aria-hidden />
          Guide
        </h2>
        <div className="tech-guide-list">
          {tecnicoCrmGuideSections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div
                key={section.id}
                className="tech-guide-item tech-anim-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  type="button"
                  className={`tech-guide-trigger ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="tech-guide-trigger-text">{section.title}</span>
                  {isExpanded ? (
                    <ChevronUp size={22} className="tech-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={22} className="tech-guide-chevron" aria-hidden />
                  )}
                </button>
                <div className={`tech-guide-body ${isExpanded ? 'expanded' : ''}`} data-expanded={isExpanded}>
                  <div className="tech-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Summary strip */}
      <section className="tech-summary-strip tech-anim-in">
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
      </section>

      {/* CTA Apri Segnalazione – ripetuto in fondo */}
      <section className="tech-cta tech-anim-in">
        <button type="button" className="tech-cta-btn" onClick={handleApriSegnalazione}>
          <Ticket size={22} aria-hidden />
          <span>Apri Segnalazione</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </section>
    </div>
  );
};

export default TecnicoCrmPage;
