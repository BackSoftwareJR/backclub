import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import { amministrazioneGuideSections } from '../../data/supportData';
import './AmministrazioneProvvigioniPage.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] as const, delay },
});

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
};

const AmministrazioneProvvigioniPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <div className="amministrazione-provvigioni-page">
      {/* Decorative background */}
      <div className="ammin-hero-bg" aria-hidden>
        <div className="ammin-hero-orb ammin-hero-orb-1" />
        <div className="ammin-hero-orb ammin-hero-orb-2" />
        <div className="ammin-hero-grid" />
      </div>

      {/* Back link */}
      <motion.div className="ammin-back-wrap" {...fadeUp(0)}>
        <button
          type="button"
          className="ammin-back-btn"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Torna a Supporto"
        >
          <ArrowLeft size={20} aria-hidden />
          <span>Supporto</span>
        </button>
      </motion.div>

      {/* Hero */}
      <motion.header className="ammin-hero" {...fadeUp(0.06)}>
        <div className="ammin-hero-inner">
          <motion.div className="ammin-hero-icon-wrap" {...fadeUp(0.1)}>
            <Wallet className="ammin-hero-icon" size={40} strokeWidth={1.5} />
          </motion.div>
          <motion.h1 className="ammin-hero-title" {...fadeUp(0.15)}>
            Amministrazione &amp; Provvigioni
          </motion.h1>
          <motion.p className="ammin-hero-subtitle" {...fadeUp(0.2)}>
            Pagamenti, fatture, calcolo fee e storico bonifici. Tutto quello che ti serve per gestire le tue provvigioni.
          </motion.p>
        </div>
      </motion.header>

      {/* Commission badge card */}
      <motion.section className="ammin-commission-card seller-card" {...fadeUp(0.22)}>
        <div className="ammin-commission-card-accent" aria-hidden />
        <div className="ammin-commission-content">
          <div className="ammin-commission-header">
            <Percent className="ammin-commission-icon" size={24} strokeWidth={2} />
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
      </motion.section>

      {/* Guide sections */}
      <section className="ammin-guide">
        <motion.h2 className="ammin-guide-heading" {...fadeUp(0.28)}>
          <FileText size={20} aria-hidden />
          Come funzionano le commissioni
        </motion.h2>
        <motion.div
          className="ammin-guide-list"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {amministrazioneGuideSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <motion.div
                key={section.id}
                className="ammin-guide-item seller-card"
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                variants={staggerItem}
              >
                <button
                  type="button"
                  className={`ammin-guide-trigger ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="ammin-guide-trigger-text">{section.title}</span>
                  {isExpanded ? (
                    <ChevronUp size={20} className="ammin-guide-chevron" aria-hidden />
                  ) : (
                    <ChevronDown size={20} className="ammin-guide-chevron" aria-hidden />
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
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Visual summary strip */}
      <motion.section
        className="ammin-summary-strip"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="ammin-summary-item" variants={staggerItem}>
          <div className="ammin-summary-icon-wrap ammin-summary-icon-pending">
            <Clock size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">In attesa</span>
        </motion.div>
        <motion.div className="ammin-summary-item" variants={staggerItem}>
          <div className="ammin-summary-icon-wrap ammin-summary-icon-ready">
            <CircleDollarSign size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">Prelevabile</span>
        </motion.div>
        <motion.div className="ammin-summary-item" variants={staggerItem}>
          <div className="ammin-summary-icon-wrap ammin-summary-icon-done">
            <CheckCircle2 size={20} aria-hidden />
          </div>
          <span className="ammin-summary-label">Riscossa</span>
        </motion.div>
      </motion.section>

      {/* CTA */}
      <motion.section className="ammin-cta" {...fadeUp(0.4)}>
        <button
          type="button"
          className="ammin-cta-btn"
          onClick={handleGoToCommissions}
        >
          <Wallet size={20} aria-hidden />
          <span>Vai a Commissioni</span>
          <ArrowRight size={18} aria-hidden />
        </button>
      </motion.section>
    </div>
  );
};

export default AmministrazioneProvvigioniPage;
