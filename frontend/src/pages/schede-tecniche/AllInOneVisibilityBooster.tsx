import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Video, MapPin, Target, Check, TrendingUp, Play, Users, BarChart3, Film, Monitor, Megaphone, Building2 } from 'lucide-react';
import './AllInOneVisibilityBooster.css';

const AllInOneVisibilityBooster: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], ['0%', '30%']);

  return (
    <div className="visibility-landing-page">
      {/* Hero Section */}
      <section ref={heroRef} className="visibility-hero">
        <motion.div 
          style={{ opacity, y }}
          className="visibility-hero-overlay"
        />
        <div className="visibility-hero-video-container">
          <video
            className="visibility-hero-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={import.meta.env.DEV ? '/images/visibility/video-hero.mp4' : '/frontend/dist/images/visibility/video-hero.mp4'} type="video/mp4" />
          </video>
          <div className="visibility-hero-video-overlay" />
        </div>
        <div className="visibility-hero-content">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="visibility-hero-title"
          >
            Hai posti liberi? Troviamo le famiglie che ti stanno cercando. Subito.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="visibility-hero-subtitle"
          >
            Il sistema "All-in-One" che combina Video Emozionali e Pubblicità Locale per portarti contatti qualificati in meno di 30 giorni.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="visibility-cta-primary"
          >
            Voglio riempire la mia struttura
            <ArrowRight size={20} />
          </motion.button>
        </div>
      </section>

      {/* Triad Strategy Section */}
      <TriadStrategySection />

      {/* Video Power Section */}
      <VideoPowerSection />

      {/* Local Domination Section */}
      <LocalDominationSection />

      {/* What's Included Section */}
      <WhatsIncludedSection />

      {/* Social Proof / ROI Section */}
      <SocialProofSection />

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
};

// Triad Strategy Section
const TriadStrategySection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const steps = [
    {
      number: "01",
      icon: Film,
      title: "Lo Storytelling (Il Video)",
      description: "Non facciamo un video aziendale noioso. Creiamo un mini-documentario che fa piangere di gioia i familiari. L'emozione vende.",
      color: "#f59e0b",
    },
    {
      number: "02",
      icon: Monitor,
      title: "La Trappola (La Landing Page)",
      description: "Non mandiamo traffico sulla Home Page generica. Creiamo una pagina dedicata solo a convertire il visitatore in una chiamata.",
      color: "#10b981",
    },
    {
      number: "03",
      icon: Target,
      title: "Il Radar (Le Ads Locali)",
      description: "Mostriamo il video solo a figli/nipoti nel raggio di 10km dalla tua struttura. Zero budget sprecato.",
      color: "#2563eb",
    },
  ];

  return (
    <section ref={sectionRef} className="visibility-triad">
      <div className="visibility-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="visibility-section-title"
        >
          Come funziona: La strategia "Bait → Hook → Catch"
        </motion.h2>
        
        <div className="visibility-triad-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="visibility-triad-card"
              >
                <div className="visibility-triad-number" style={{ color: step.color }}>
                  {step.number}
                </div>
                <div className="visibility-triad-icon" style={{ backgroundColor: `${step.color}15`, color: step.color }}>
                  <Icon size={32} />
                </div>
                <h3 className="visibility-triad-title">{step.title}</h3>
                <p className="visibility-triad-description">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="visibility-triad-arrow">
                    <ArrowRight size={24} style={{ color: step.color }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Video Power Section
const VideoPowerSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="visibility-video-power">
      <div className="visibility-container">
        <div className="visibility-video-power-content">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="visibility-video-power-text"
          >
            <h2 className="visibility-section-title">
              Un minuto di video vale più di mille parole
            </h2>
            <p className="visibility-editorial-text">
              Le famiglie non leggono. <strong>Guardano</strong>. Mostra loro il sorriso dei tuoi ospiti e la cura del tuo staff. Noi portiamo la troupe, la regia e il drone. Tu devi solo sorridere.
            </p>
            <div className="visibility-feature-list">
              <div className="visibility-feature-item">
                <Check size={20} className="visibility-feature-icon" />
                <span>Troupe Video Professionale</span>
              </div>
              <div className="visibility-feature-item">
                <Check size={20} className="visibility-feature-icon" />
                <span>Regia e Montaggio Emozionale</span>
              </div>
              <div className="visibility-feature-item">
                <Check size={20} className="visibility-feature-icon" />
                <span>Riprese con Drone</span>
              </div>
              <div className="visibility-feature-item">
                <Check size={20} className="visibility-feature-icon" />
                <span>1 Video Hero + 3 Short per Social</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="visibility-video-player-mockup"
          >
            <div className="visibility-video-player-frame">
              <div className="visibility-video-player-screen">
                <div className="visibility-video-placeholder">
                  <Play size={64} className="visibility-video-play-icon" />
                  <span className="visibility-video-placeholder-text">Video Emozionale</span>
                </div>
              </div>
              <div className="visibility-video-player-controls">
                <div className="visibility-video-player-button" />
                <div className="visibility-video-player-speaker" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Local Domination Section
const LocalDominationSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="visibility-local-domination">
      <div className="visibility-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="visibility-local-content"
        >
          <div className="visibility-local-text">
            <h2 className="visibility-section-title">
              Diventa la prima scelta nel tuo quartiere
            </h2>
            <p className="visibility-editorial-text">
              Usiamo il <strong>Geotargeting avanzato</strong> di Meta e Google per intercettare chi cerca "RSA vicino a me" in questo momento.
            </p>
            <div className="visibility-local-stats">
              <div className="visibility-stat-card">
                <MapPin size={24} className="visibility-stat-icon" />
                <div>
                  <div className="visibility-stat-value">10 km</div>
                  <div className="visibility-stat-label">Raggio di targeting</div>
                </div>
              </div>
              <div className="visibility-stat-card">
                <Target size={24} className="visibility-stat-icon" />
                <div>
                  <div className="visibility-stat-value">Zero</div>
                  <div className="visibility-stat-label">Budget sprecato</div>
                </div>
              </div>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="visibility-map-visualization"
          >
            <div className="visibility-map-container">
              <div className="visibility-map-center">
                <Building2 size={32} className="visibility-map-center-icon" />
                <span className="visibility-map-center-label">La Tua Struttura</span>
              </div>
              <div className="visibility-map-pulse-ring ring-1" />
              <div className="visibility-map-pulse-ring ring-2" />
              <div className="visibility-map-pulse-ring ring-3" />
              <div className="visibility-map-targets">
                <div className="visibility-map-target target-1">
                  <Users size={16} />
                </div>
                <div className="visibility-map-target target-2">
                  <Users size={16} />
                </div>
                <div className="visibility-map-target target-3">
                  <Users size={16} />
                </div>
                <div className="visibility-map-target target-4">
                  <Users size={16} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// What's Included Section
const WhatsIncludedSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const items = [
    {
      icon: Video,
      title: "Troupe Video Professionale",
      description: "1 Giornata di riprese",
      color: "#f59e0b",
    },
    {
      icon: Film,
      title: "Montaggio Storytelling Emozionale",
      description: "1 Video Hero + 3 Short per social",
      color: "#10b981",
    },
    {
      icon: Monitor,
      title: "Creazione Landing Page",
      description: "Pagina 'Acchiappa-Contatti' dedicata",
      color: "#2563eb",
    },
    {
      icon: Megaphone,
      title: "Setup Campagne Ads",
      description: "Google & Meta Ads configurati",
      color: "#8b5cf6",
    },
    {
      icon: BarChart3,
      title: "Report Mensile",
      description: "Analisi dei contatti ricevuti",
      color: "#ec4899",
    },
  ];

  return (
    <section ref={sectionRef} className="visibility-whats-included">
      <div className="visibility-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="visibility-section-title"
        >
          Cosa include il Pacchetto All-in-One
        </motion.h2>
        
        <div className="visibility-included-grid">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="visibility-included-card"
              >
                <div className="visibility-included-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  <Icon size={28} />
                </div>
                <h3 className="visibility-included-title">{item.title}</h3>
                <p className="visibility-included-description">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Social Proof / ROI Section
const SocialProofSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="visibility-social-proof">
      <div className="visibility-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="visibility-social-proof-content"
        >
          <div className="visibility-roi-metric">
            <TrendingUp size={48} className="visibility-roi-icon" />
            <div className="visibility-roi-value">300%</div>
            <p className="visibility-roi-text">
              Le strutture che usano il video ricevono il <strong>300% di richieste in più</strong> rispetto a quelle che si affidano solo al passaparola.
            </p>
          </div>
          
          <div className="visibility-testimonial">
            <div className="visibility-testimonial-quote">
              <p className="visibility-testimonial-text">
                "In due settimane abbiamo coperto i 3 posti letto liberi che avevamo da mesi. Il video ha fatto la differenza: le famiglie ci chiamavano già emozionate."
              </p>
              <div className="visibility-testimonial-author">
                <div className="visibility-testimonial-avatar">
                  <Users size={24} />
                </div>
                <div>
                  <div className="visibility-testimonial-name">Direttore Struttura</div>
                  <div className="visibility-testimonial-role">Casa di Riposo, Piemonte</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Final CTA Section
const FinalCTASection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section ref={sectionRef} className="visibility-final-cta">
      <div className="visibility-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="visibility-final-cta-content"
        >
          <h2 className="visibility-final-cta-title">
            Smetti di aspettare il passaparola
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="visibility-cta-primary visibility-cta-primary-large"
          >
            Attiva il Pacchetto All-in-One
            <ArrowRight size={24} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default AllInOneVisibilityBooster;
