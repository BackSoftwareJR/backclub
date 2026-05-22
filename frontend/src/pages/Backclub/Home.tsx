import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/backclub.css';

const Home: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const yDecorative1 = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const yDecorative2 = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);

  return (
    <>
      {/* Hero Section */}
      <section ref={heroRef} className="backclub-hero">
        <div className="backclub-container-center" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ opacity }}
          >
            <h1 className="backclub-h1 backclub-serif" style={{ textAlign: 'center' }}>
              Coltiviamo la sintonia digitale.
            </h1>
            <p
              className="backclub-text backclub-text-large"
              style={{
                textAlign: 'center',
                marginBottom: '3rem',
                maxWidth: '700px',
                margin: '0 auto 3rem'
              }}
            >
              Dove i migliori talenti incontrano imprenditori visionari. 
              Un ecosistema esclusivo per progetti unici, curati con dedizione sartoriale.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login">
                <motion.button
                  className="backclub-button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  Accedi
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Elementi decorativi di sfondo con parallasse */}
        <motion.div
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(44, 95, 93, 0.08) 0%, transparent 70%)',
            y: yDecorative1,
            zIndex: 0
          }}
        />
        <motion.div
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '8%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201, 169, 97, 0.06) 0%, transparent 70%)',
            y: yDecorative2,
            zIndex: 0
          }}
        />
      </section>

      {/* Sezione "La Velocità del Cambiamento" */}
      <section className="backclub-section">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          className="backclub-container-center"
        >
          <h2 className="backclub-h2 backclub-serif" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            La Velocità del Cambiamento
          </h2>
          <p
            className="backclub-text backclub-text-large"
            style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}
          >
            La tecnologia corre veloce. Le tendenze si susseguono. I framework nascono e muoiono 
            nel giro di mesi. In questo vortice di innovazione continua, è facile perdere di vista 
            ciò che davvero conta: la qualità delle connessioni umane.
          </p>
          <p
            className="backclub-text"
            style={{
              textAlign: 'center'
            }}
          >
            In Backclub, ci prendiamo il tempo necessario. Non per essere lenti, ma per essere 
            precisi. Perché un progetto digitale di valore non nasce dalla fretta, ma dalla 
            sintonia tra chi lo concepisce e chi lo realizza. Dalla cura artigianale che trasforma 
            un'idea in un'opera.
          </p>

        </motion.div>
      </section>
    </>
  );
};

export default Home;

