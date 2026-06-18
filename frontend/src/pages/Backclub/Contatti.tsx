import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/backclub.css';

const Contatti: React.FC = () => {
  return (
    <section className="backclub-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const }}
        className="backclub-container-center"
      >
        <h1 className="backclub-h1 backclub-serif" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Contatti
        </h1>
        <p
          className="backclub-text backclub-text-large"
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            maxWidth: '700px',
            margin: '0 auto 2rem'
          }}
        >
          Scrivi a{' '}
          <a
            href="mailto:info@backclub.it"
            className="backclub-email-link"
            style={{
              color: 'var(--backclub-accent)',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            info@backclub.it
          </a>
          {' '}per raccontarci la tua storia, la tua richiesta o come pensi di contribuire 
          all'ecosistema Backclub. Siamo qui per ascoltarti.
        </p>
        <p
          className="backclub-text"
          style={{
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto'
          }}
        >
          Non siamo una piattaforma aperta a tutti. Ogni messaggio viene letto e valutato 
          con attenzione. Se la tua richiesta rispecchia i nostri valori, ti contatteremo 
          personalmente.
        </p>
      </motion.div>
    </section>
  );
};

export default Contatti;
