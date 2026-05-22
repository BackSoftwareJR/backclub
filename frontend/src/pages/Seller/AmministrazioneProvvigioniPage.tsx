import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Percent,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  FileText,
  CircleDollarSign,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import { amministrazioneGuideSections } from '../../data/supportData';
import './AmministrazioneProvvigioniPage.css';

const AmministrazioneProvvigioniPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['intro-commissione', 'come-si-calcolano', 'crediti-presunti-attesa-disponibili'])
  );
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user?.seller_id) {
      sellerCommissionsApi
        .getContracts()
        .then((res: { data?: { data?: unknown[]; summary?: { commission_rate?: number } } }) => {
          const inner = res?.data;
          const summary =
            inner && typeof inner === 'object' && 'summary' in inner
              ? (inner as { summary?: { commission_rate?: number } }).summary
              : undefined;
          if (summary?.commission_rate != null) {
            setCommissionRate(Number(summary.commission_rate));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingRate(false));
    } else {
      setLoadingRate(false);
    }
  }, [user?.seller_id]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGoToCommissions = () => {
    navigate('/seller/commissioni');
  };

  const themeClass = resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light';

  return (
    <div
      className={`amministrazione-provvigioni-page ${themeClass}`}
      data-mobile={isMobile}
    >
      {/* Back link (mobile-friendly) */}
      <div className="ammin-back-wrap">
        <button
          type="button"
          className="ammin-back-btn"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Torna a Supporto"
        >
          <ArrowLeft size={20} aria-hidden />
          <span>Supporto</span>
        </button>
      </div>

      {/* Decorative background elements */}
      <div className="ammin-hero-bg" aria-hidden>
        <div className="ammin-hero-orb ammin-hero-orb-1" />
        <div className="ammin-hero-orb ammin-hero-orb-2" />
        <div className="ammin-hero-grid" />
      </div>

      {/* Hero */}
      <header className="ammin-hero">
        <div className="ammin-hero-inner">
          <div className="ammin-hero-icon-wrap">
            <Wallet className="ammin-hero-icon" size={isMobile ? 40 : 48} strokeWidth={1.5} />
          </div>
          <h1 className="ammin-hero-title">Amministrazione & Provvigioni</h1>
          <p className="ammin-hero-subtitle">
            Pagamenti, fatture, calcolo fee e storico bonifici. Tutto quello che ti serve per gestire le tue provvigioni.
          </p>
        </div>
      </header>

      {/* Commission badge card */}
      <section className="ammin-commission-card ammin-anim-in">
        <div className="ammin-commission-card-glow" aria-hidden />
        <div className="ammin-commission-content">
          <div className="ammin-commission-header">
            <Percent className="ammin-commission-icon" size={28} strokeWidth={2} />
            <span className="ammin-commission-label">La tua commissione</span>
          </div>
          {loadingRate ? (
            <div className="ammin-commission-value-wrap">
              <span className="ammin-commission-value ammin-skeleton" />
            </div>
          ) : commissionRate != null ? (
            <div className="ammin-commission-value-wrap">
              <span className="ammin-commission-value">{commissionRate}%</span>
            </div>
          ) : (
            <p className="ammin-commission-fallback">Consulta la sezione Commissioni</p>
          )}
          <p className="ammin-commission-note">
            La percentuale è quella associata al tuo profilo venditore.
          </p>
        </div>
      </section>

      {/* Guide sections */}
      <section className="ammin-guide">
        <h2 className="ammin-guide-heading ammin-anim-in">
          <FileText size={22} aria-hidden />
          Come funzionano le commissioni
        </h2>
        <div className="ammin-guide-list">
          {amministrazioneGuideSections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <div
                key={section.id}
                className="ammin-guide-item ammin-anim-in"
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <button
                  type="button"
                  className={`ammin-guide-trigger ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="ammin-guide-trigger-text">{section.title}</span>
                  {isExpanded ? (
                    <ChevronUp size={22} className="ammin-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={22} className="ammin-guide-chevron" aria-hidden />
                  )}
                </button>
                <div
                  className={`ammin-guide-body ${isExpanded ? 'expanded' : ''}`}
                  data-expanded={isExpanded}
                >
                  <div className="ammin-guide-body-inner">
                    <p>{section.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual summary strip (icons + short labels) */}
      <section className="ammin-summary-strip ammin-anim-in">
        <div className="ammin-summary-item">
          <div className="ammin-summary-icon-wrap ammin-summary-icon-pending">
            <Clock size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">In attesa</span>
        </div>
        <div className="ammin-summary-item">
          <div className="ammin-summary-icon-wrap ammin-summary-icon-ready">
            <CircleDollarSign size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">Prelevabile</span>
        </div>
        <div className="ammin-summary-item">
          <div className="ammin-summary-icon-wrap ammin-summary-icon-done">
            <CheckCircle2 size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">Riscossa</span>
        </div>
      </section>

      {/* CTA */}
      <section className="ammin-cta ammin-anim-in">
        <button
          type="button"
          className="ammin-cta-btn"
          onClick={handleGoToCommissions}
        >
          <Wallet size={22} aria-hidden />
          <span>Vai a Commissioni</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </section>
    </div>
  );
};

export default AmministrazioneProvvigioniPage;
