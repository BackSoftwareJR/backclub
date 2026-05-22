import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Shield, Zap, Search, Palette, Code, Rocket, Building2, BarChart3, TrendingUp, RefreshCw, Phone, MessageCircle, MapPin, Check, X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import './RestylingStruttureAccoglienza.css';

const RestylingStruttureAccoglienza: React.FC = () => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], ['0%', '30%']);

  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, percentage)));
    };

    const handleGlobalMouseUp = () => setIsDragging(false);

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, percentage)));
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="restyling-landing-page">
      {/* Hero Section */}
      <section ref={heroRef} className="restyling-hero">
        <motion.div 
          style={{ opacity, y }}
          className="restyling-hero-overlay"
        />
        <div className="restyling-hero-content">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="restyling-hero-title"
          >
            Il tuo sito web racconta la qualità della tua accoglienza?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="restyling-hero-subtitle"
          >
            Trasformiamo la tua presenza online da una vecchia vetrina statica a un portale moderno che trasmette fiducia, cura e sicurezza ai familiari.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="restyling-cta-primary"
          >
            Scopri di più
            <ArrowRight size={20} />
          </motion.button>
        </div>
      </section>

      {/* Before & After Slider */}
      <BeforeAfterSlider
        sliderPosition={sliderPosition}
        setSliderPosition={setSliderPosition}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        sliderRef={sliderRef}
        handleMouseMove={handleMouseMove}
        handleMouseDown={handleMouseDown}
        handleMouseUp={handleMouseUp}
        handleTouchMove={handleTouchMove}
      />

      {/* Pain Points vs Solutions */}
      <PainPointsSection />

      {/* Educational Modules - Sales Playbook */}
      <ConceptModule />
      <TechBattleModule />
      <DataIntelligenceModule />
      <SEOModule />
      <RenewalsModule />

      {/* Tech Stack */}
      <TechStackSection />

      {/* Projects Showcase */}
      <ProjectsShowcaseSection />

      {/* Process Timeline */}
      <ProcessSection />

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
};

// Before & After Slider Component
interface BeforeAfterSliderProps {
  sliderPosition: number;
  setSliderPosition: (pos: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  sliderRef: React.RefObject<HTMLDivElement | null>;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseDown: () => void;
  handleMouseUp: () => void;
  handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  sliderPosition,
  sliderRef,
  handleMouseMove,
  handleMouseDown,
  handleMouseUp,
  handleTouchMove,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section ref={sectionRef} className="restyling-before-after">
      <div className="restyling-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-section-title"
        >
          Guarda la differenza che il design può fare nella percezione della tua struttura
        </motion.h2>
        
        <motion.div
          ref={sliderRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="restyling-slider-container"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Before Image */}
          <div className="restyling-slider-before">
            <div 
              className="restyling-slider-image restyling-slider-image-before"
              style={{
                backgroundImage: `url(${import.meta.env.DEV ? '/images/Restiling%20sito%20case%20fam/prima.webp' : '/frontend/dist/images/Restiling%20sito%20case%20fam/prima.webp'})`,
              }}
            >
              <div className="restyling-slider-label restyling-slider-label-before">
                La Vecchia Vetrina
              </div>
            </div>
          </div>

          {/* After Image */}
          <div 
            className="restyling-slider-after"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <div 
              className="restyling-slider-image restyling-slider-image-after"
              style={{
                backgroundImage: `url(${import.meta.env.DEV ? '/images/Restiling%20sito%20case%20fam/dopo.webp' : '/frontend/dist/images/Restiling%20sito%20case%20fam/dopo.webp'})`,
              }}
            >
              <div className="restyling-slider-label restyling-slider-label-after">
                La Nuova Esperienza
              </div>
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="restyling-slider-handle"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="restyling-slider-handle-line" />
            <div className="restyling-slider-handle-circle">
              <ArrowRight size={16} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Pain Points Section
const PainPointsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const points = [
    {
      problem: "Sito lento e non ottimizzato per cellulari",
      solution: "Tecnologia React 18+: Velocità istantanea su ogni dispositivo",
      icon: Zap,
    },
    {
      problem: "Foto scure e testi illeggibili",
      solution: "Design Luminoso e Accessibile: Pensato per trasmettere serenità",
      icon: Palette,
    },
    {
      problem: "Non ti trovano su Google",
      solution: "SEO Avanzata: Struttura tecnica ottimizzata per le ricerche locali",
      icon: Search,
    },
  ];

  return (
    <section ref={sectionRef} className="restyling-pain-points">
      <div className="restyling-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-section-title"
        >
          Problemi che risolviamo
        </motion.h2>
        
        <div className="restyling-pain-points-grid">
          {points.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="restyling-pain-point-card"
              >
                <div className="restyling-pain-point-icon">
                  <Icon size={32} />
                </div>
                <div className="restyling-pain-point-content">
                  <h3 className="restyling-pain-point-problem">{point.problem}</h3>
                  <p className="restyling-pain-point-solution">{point.solution}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Tech Stack Section
const TechStackSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const techItems = [
    {
      title: "React 18 & Next.js",
      description: "La stessa tecnologia usata da Netflix e Airbnb per garantire stabilità e futuro",
      icon: Code,
    },
    {
      title: "Sicurezza Totale",
      description: "Protocolli HTTPS avanzati per proteggere i dati sensibili",
      icon: Shield,
    },
    {
      title: "Indicizzazione Rapida",
      description: "Codice pulito che Google ama scansionare",
      icon: Rocket,
    },
  ];

  return (
    <section ref={sectionRef} className="restyling-tech-stack">
      <div className="restyling-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-section-title"
        >
          Tecnologia all'avanguardia
        </motion.h2>
        
        <div className="restyling-tech-grid">
          {techItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="restyling-tech-card"
              >
                <div className="restyling-tech-icon">
                  <Icon size={40} />
                </div>
                <h3 className="restyling-tech-title">{item.title}</h3>
                <p className="restyling-tech-description">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Process Timeline Section
const ProcessSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const steps = [
    {
      number: "01",
      title: "Audit",
      description: "Analizziamo il tuo sito attuale",
    },
    {
      number: "02",
      title: "Design",
      description: "Progettiamo la nuova identità luminosa",
    },
    {
      number: "03",
      title: "Sviluppo",
      description: "Programmazione su misura senza template pesanti",
    },
    {
      number: "04",
      title: "Lancio",
      description: "Messa online e indicizzazione",
    },
  ];

  return (
    <section ref={sectionRef} className="restyling-process">
      <div className="restyling-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-section-title"
        >
          Il nostro processo
        </motion.h2>
        
        <div className="restyling-process-timeline">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="restyling-process-step"
            >
              <div className="restyling-process-number">{step.number}</div>
              <div className="restyling-process-content">
                <h3 className="restyling-process-title">{step.title}</h3>
                <p className="restyling-process-description">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="restyling-process-connector" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Final CTA Section
const FinalCTASection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section ref={sectionRef} className="restyling-final-cta">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="restyling-final-cta-content"
        >
          <h2 className="restyling-final-cta-title">
            Pronto a rassicurare le famiglie ancor prima che varchino la tua porta?
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="restyling-cta-primary restyling-cta-primary-large"
          >
            Inizia il Restyling
            <ArrowRight size={24} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

// Module 1: The Concept
const ConceptModule: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="restyling-educational-module">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-editorial-content"
        >
          <div className="restyling-module-header">
            <Building2 size={32} className="restyling-module-icon" />
            <h2 className="restyling-module-title">Cos'è questo servizio? (Il Concetto)</h2>
          </div>
          
          <div className="restyling-module-body">
            <div className="restyling-highlight-quote">
              <p className="restyling-quote-text">
                Non vendiamo semplici "siti web". Vendiamo <strong>Fiducia</strong>.
              </p>
            </div>
            
            <p className="restyling-editorial-text">
              Per una Casa Famiglia, il sito è la <strong>Reception Digitale</strong>. È il primo contatto che un familiare ha con la struttura. Se è vecchio, lento o disordinato, il familiare pensa che anche la struttura sia così.
            </p>
            
            <p className="restyling-editorial-text">
              Noi costruiamo un portale che trasmette <strong>pulizia, cura e sicurezza</strong>. Ogni elemento visivo, ogni animazione, ogni interazione è pensata per rassicurare. Perché quando si tratta di scegliere dove lasciare un proprio caro, la prima impressione conta più di qualsiasi brochure.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Module 2: Tech Battle
const TechBattleModule: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="restyling-educational-module restyling-module-alt">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-editorial-content"
        >
          <div className="restyling-module-header">
            <Code size={32} className="restyling-module-icon" />
            <h2 className="restyling-module-title">Perché NON usiamo WordPress? (Argomentazione di Vendita)</h2>
          </div>
          
          <div className="restyling-comparison-grid">
            {/* CMS Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="restyling-comparison-card restyling-comparison-cms"
            >
              <div className="restyling-comparison-header">
                <h3 className="restyling-comparison-title">CMS (WordPress/Wix)</h3>
                <span className="restyling-comparison-badge restyling-badge-negative">Limitato</span>
              </div>
              <div className="restyling-comparison-content">
                <p className="restyling-comparison-analogy">
                  <strong>Spiegalo così:</strong> È come una casa in affitto arredata.
                </p>
                <ul className="restyling-comparison-list">
                  <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> Costa poco subito</li>
                  <li><X size={16} className="restyling-list-icon restyling-list-icon-x" /> È pesante e lenta</li>
                  <li><X size={16} className="restyling-list-icon restyling-list-icon-x" /> Si rompe spesso (plugin da aggiornare)</li>
                  <li><X size={16} className="restyling-list-icon restyling-list-icon-x" /> È facile da hackerare</li>
                  <li><X size={16} className="restyling-list-icon restyling-list-icon-x" /> È uguale a tutte le altre</li>
                </ul>
              </div>
            </motion.div>

            {/* Custom Code Side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="restyling-comparison-card restyling-comparison-custom"
            >
              <div className="restyling-comparison-header">
                <h3 className="restyling-comparison-title">Custom Code (React/Next.js)</h3>
                <span className="restyling-comparison-badge restyling-badge-positive">Superiore</span>
              </div>
              <div className="restyling-comparison-content">
                <p className="restyling-comparison-analogy">
                  <strong>Spiegalo così:</strong> È una Villa costruita su misura dall'architetto.
                </p>
                <ul className="restyling-comparison-list">
                  <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Velocità:</strong> Si apre in 0.5 secondi (Google ama questo)</li>
                  <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Sicurezza:</strong> È blindato, niente database esposti agli hacker</li>
                  <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Design:</strong> Nessun vincolo, facciamo esattamente quello che serve per emozionare</li>
                  <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Futuro:</strong> Tecnologia moderna, non diventa obsoleta</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Module 3: Data Intelligence
const DataIntelligenceModule: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const metrics = [
    {
      icon: Phone,
      title: "Click-to-Call",
      description: "Quanti hanno premuto il tasto 'Chiama'?",
      insight: "Lead caldo",
      color: "#10b981",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Quanti hanno preferito la chat?",
      insight: "Lead timido",
      color: "#2563eb",
    },
    {
      icon: MapPin,
      title: "Mappa",
      description: "Quanti hanno chiesto le indicazioni stradali?",
      insight: "Visita fisica imminente",
      color: "#f59e0b",
    },
  ];

  return (
    <section ref={sectionRef} className="restyling-educational-module">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-editorial-content"
        >
          <div className="restyling-module-header">
            <BarChart3 size={32} className="restyling-module-icon" />
            <h2 className="restyling-module-title">Le Statistiche che contano (Non solo visite)</h2>
          </div>
          
          <div className="restyling-module-body">
            <p className="restyling-editorial-text">
              Non guardiamo solo "quanti entrano". Misuriamo l'<strong>intenzione</strong>.
            </p>
            
            <div className="restyling-metrics-grid">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                    className="restyling-metric-card"
                  >
                    <div className="restyling-metric-icon" style={{ backgroundColor: `${metric.color}15`, color: metric.color }}>
                      <Icon size={24} />
                    </div>
                    <h3 className="restyling-metric-title">{metric.title}</h3>
                    <p className="restyling-metric-description">{metric.description}</p>
                    <div className="restyling-metric-insight">
                      <TrendingUp size={14} />
                      <span>{metric.insight}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="restyling-sales-pitch-box">
              <p className="restyling-sales-pitch-text">
                <strong>Sales Pitch:</strong> "Signor Cliente, a fine mese non le diamo numeri a caso, le diciamo quante persone hanno cercato di contattarla."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Module 4: SEO & Visibility
const SEOModule: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="restyling-educational-module restyling-module-alt">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-editorial-content"
        >
          <div className="restyling-module-header">
            <Search size={32} className="restyling-module-icon" />
            <h2 className="restyling-module-title">L'Indicizzazione (SEO) spiegata semplice</h2>
          </div>
          
          <div className="restyling-module-body">
            <p className="restyling-editorial-text">
              Avere il sito più bello del mondo è inutile se è nel <strong>deserto</strong>.
            </p>
            
            <div className="restyling-info-box">
              <h3 className="restyling-info-box-title">Google Local Optimization</h3>
              <p className="restyling-editorial-text">
                Quando qualcuno cerca <em>"Casa riposo [Città]"</em>, noi lavoriamo per far apparire la tua struttura <strong>prima delle altre</strong> grazie a:
              </p>
              <ul className="restyling-feature-list">
                <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Velocità:</strong> Google premia i siti che si caricano in meno di 1 secondo</li>
                <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Struttura dei dati:</strong> Codice pulito che Google capisce al volo</li>
                <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Mobile-first:</strong> Ottimizzato per chi cerca da smartphone</li>
                <li><Check size={16} className="restyling-list-icon restyling-list-icon-check" /> <strong>Schema markup:</strong> Dati strutturati che WordPress spesso sbaglia</li>
              </ul>
            </div>
            
            <p className="restyling-editorial-text">
              Il nostro codice è ottimizzato per <strong>Google Local</strong>. Non è magia, è ingegneria: ogni elemento è pensato per essere scansionato, indicizzato e posizionato correttamente.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Module 5: Renewals
const RenewalsModule: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="restyling-educational-module">
      <div className="restyling-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-editorial-content"
        >
          <div className="restyling-module-header">
            <RefreshCw size={32} className="restyling-module-icon" />
            <h2 className="restyling-module-title">Il Valore del Rinnovo (Non è solo hosting)</h2>
          </div>
          
          <div className="restyling-module-body">
            <p className="restyling-editorial-text">
              Perché pagare ogni anno? Non è solo per tenere il sito acceso.
            </p>
            
            <div className="restyling-renewal-benefits">
              <div className="restyling-renewal-benefit">
                <div className="restyling-renewal-benefit-icon">
                  <Shield size={24} />
                </div>
                <div className="restyling-renewal-benefit-content">
                  <h3 className="restyling-renewal-benefit-title">Manutenzione Attiva</h3>
                  <p className="restyling-editorial-text">
                    Se Google cambia le regole, noi aggiorniamo il codice. Non ti ritrovi con un sito che Google penalizza perché non è più conforme.
                  </p>
                </div>
              </div>
              
              <div className="restyling-renewal-benefit">
                <div className="restyling-renewal-benefit-icon">
                  <Zap size={24} />
                </div>
                <div className="restyling-renewal-benefit-content">
                  <h3 className="restyling-renewal-benefit-title">Sicurezza</h3>
                  <p className="restyling-editorial-text">
                    Monitoraggio costante contro attacchi. Aggiornamenti di sicurezza automatici. Il tuo sito è protetto 24/7.
                  </p>
                </div>
              </div>
              
              <div className="restyling-renewal-benefit">
                <div className="restyling-renewal-benefit-icon">
                  <BarChart3 size={24} />
                </div>
                <div className="restyling-renewal-benefit-content">
                  <h3 className="restyling-renewal-benefit-title">Reportistica</h3>
                  <p className="restyling-editorial-text">
                    Invio mensile dei dati sulle performance. Non solo "quanti visitatori", ma "quanti hanno chiamato, chattato, richiesto informazioni".
                  </p>
                </div>
              </div>
            </div>
            
            <div className="restyling-highlight-box">
              <p className="restyling-highlight-text">
                <strong>Il rinnovo non è un costo, è un investimento</strong> per mantenere il tuo vantaggio competitivo nel tempo.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Projects Showcase Section
const ProjectsShowcaseSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const projects = [
    {
      title: "Casa di Riposo San Giuseppe",
      location: "Torino, Piemonte",
      description: "Trasformazione completa da sito statico a portale moderno con focus su accessibilità e fiducia",
      imageUrl: null, // Placeholder - da aggiungere
      link: "#", // Link da configurare
    },
    {
      title: "Residenza Villa Serena",
      location: "Milano, Lombardia",
      description: "Restyling con design luminoso e sistema di prenotazione visite online integrato",
      imageUrl: null, // Placeholder - da aggiungere
      link: "#", // Link da configurare
    },
    {
      title: "Casa Famiglia Arcobaleno",
      location: "Roma, Lazio",
      description: "Sito completamente riprogettato con focus su storytelling e testimonianze familiari",
      imageUrl: null, // Placeholder - da aggiungere
      link: "#", // Link da configurare
    },
  ];

  return (
    <section ref={sectionRef} className="restyling-projects-showcase">
      <div className="restyling-container">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="restyling-section-title"
        >
          Alcuni progetti d'esempio
        </motion.h2>
        
        <div className="restyling-projects-grid">
          {projects.map((project, index) => (
            <motion.a
              key={index}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="restyling-project-card"
            >
              <div className="restyling-project-image-container">
                {project.imageUrl ? (
                  <img 
                    src={project.imageUrl} 
                    alt={project.title}
                    className="restyling-project-image"
                  />
                ) : (
                  <div className="restyling-project-placeholder">
                    <ImageIcon size={48} className="restyling-project-placeholder-icon" />
                    <span className="restyling-project-placeholder-text">Immagine Progetto</span>
                  </div>
                )}
              </div>
              <div className="restyling-project-content">
                <h3 className="restyling-project-title">{project.title}</h3>
                <p className="restyling-project-location">{project.location}</p>
                <p className="restyling-project-description">{project.description}</p>
                <div className="restyling-project-link">
                  <span>Vedi progetto</span>
                  <ExternalLink size={16} />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RestylingStruttureAccoglienza;
