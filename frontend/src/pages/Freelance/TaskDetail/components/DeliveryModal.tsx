import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { filesUploaded: boolean; satisfaction: number; feedback: string }) => Promise<void>;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [filesUploaded, setFilesUploaded] = useState(false);
  const [satisfaction, setSatisfaction] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filesUploaded) {
      alert('Conferma di aver caricato tutti i file richiesti');
      return;
    }
    if (satisfaction === 0) {
      alert('Seleziona una valutazione della lavorazione');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ filesUploaded, satisfaction, feedback });
      setFilesUploaded(false);
      setSatisfaction(0);
      setFeedback('');
      onClose();
    } catch (err) {
      console.error('Error submitting delivery:', err);
      alert('Errore durante la consegna. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const satisfactionEmojis = ['😠', '😐', '😊', '😃', '🤩'];
  const satisfactionLabels = ['Molto insoddisfatto', 'Insoddisfatto', 'Neutro', 'Soddisfatto', 'Molto soddisfatto'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="delivery-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="delivery-modal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delivery-modal-handle" aria-hidden="true" />
            <div className="delivery-modal-header">
              <h2 className="delivery-modal-title">Consegna Lavoro</h2>
              <button className="delivery-modal-close" onClick={onClose} type="button" aria-label="Chiudi">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="delivery-modal-content">
              <div className="delivery-modal-step">
                <label className="delivery-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filesUploaded}
                    onChange={(e) => setFilesUploaded(e.target.checked)}
                    className="delivery-modal-checkbox"
                  />
                  <span>Hai caricato tutti i file richiesti?</span>
                </label>
              </div>
              <div className="delivery-modal-step">
                <label className="delivery-modal-label">Come valuti questa lavorazione?</label>
                <div className="delivery-modal-satisfaction">
                  {satisfactionEmojis.map((emoji, index) => {
                    const rating = index + 1;
                    return (
                      <button
                        key={rating}
                        type="button"
                        className={`delivery-modal-satisfaction-btn${satisfaction === rating ? ' active' : ''}`}
                        onClick={() => setSatisfaction(rating)}
                      >
                        <span className="delivery-modal-emoji">{emoji}</span>
                        <span className="delivery-modal-satisfaction-label">{satisfactionLabels[index]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="delivery-modal-step">
                <label className="delivery-modal-label">Vuoi lasciare una nota o un suggerimento? (Opzionale)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="delivery-modal-textarea"
                  placeholder="Scrivi qui eventuali note o suggerimenti..."
                  rows={4}
                />
              </div>
              <div className="delivery-modal-actions">
                <button type="button" onClick={onClose} className="delivery-modal-btn delivery-modal-btn-secondary" disabled={submitting}>
                  Annulla
                </button>
                <button type="submit" className="delivery-modal-btn delivery-modal-btn-primary" disabled={submitting}>
                  {submitting ? 'Invio in corso...' : 'Conferma e Invia in Revisione'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeliveryModal;
