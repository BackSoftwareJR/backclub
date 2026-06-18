import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/backclub.css';

const Filosofia: React.FC = () => {
  return (
    <section className="backclub-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const }}
        className="backclub-container-center"
      >
        <h1 className="backclub-h1 backclub-serif" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          Non semplici connessioni, ma radici comuni.
        </h1>

        <div style={{ marginBottom: '4rem' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="backclub-text backclub-text-large"
            style={{ marginBottom: '2rem', textAlign: 'center' }}
          >
            Come ogni progetto digitale ha bisogno della giusta sintonia umana, 
            così ogni collaborazione richiede terreno fertile. Non basta trovare 
            competenze tecniche. Serve trovare armonia.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="backclub-text"
            style={{ marginBottom: '2rem', textAlign: 'center' }}
          >
            Backclub nasce dall'esperienza di Backsoftware.it, ma eleva il concetto 
            di lavoro. Non siamo una piattaforma. Siamo un ecosistema curato, dove 
            ogni progetto è trattato come un'opera unica, e ogni collaborazione come 
            una relazione da coltivare.
          </motion.p>
        </div>

        {/* Elemento grafico chiave: evoluzione da idea a progetto */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] as const }}
          style={{
            margin: '4rem auto',
            maxWidth: '900px',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '500px',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <img
              src="/frontend/dist/images/AdobeStock_395560837.jpeg"
              alt="Evoluzione da idea a progetto: crescita e sviluppo digitale"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(44, 95, 93, 0.15) 0%, transparent 50%, rgba(201, 169, 97, 0.15) 100%)',
              }}
            />
          </div>
        </motion.div>

        {/* Sezione "Lavoratori in sintonia" */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const }}
          style={{ marginTop: '6rem' }}
        >
          <h2 className="backclub-h2 backclub-serif" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Lavoratori in sintonia
          </h2>
          <p
            className="backclub-text"
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            Non cerchiamo solo competenze. Cerchiamo persone che condividano 
            la nostra filosofia: la qualità nasce dalla dedizione, non dalla velocità. 
            Artigiani digitali che sanno che ogni riga di codice, ogni pixel, ogni 
            interazione ha un peso.
          </p>
        </motion.div>

        {/* Sezione "Massima qualità" */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, delay: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
          style={{ marginTop: '4rem' }}
        >
          <h2 className="backclub-h2 backclub-serif" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Massima qualità
          </h2>
          <p
            className="backclub-text"
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            Ogni progetto in Backclub è selezionato con cura. Non accettiamo 
            qualsiasi richiesta. Accettiamo solo quelle che hanno il potenziale 
            per diventare qualcosa di straordinario. Perché il nostro tempo, 
            come quello dei nostri artigiani, è prezioso.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Filosofia;

