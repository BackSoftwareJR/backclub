import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { supportTicketsApi } from '../../api/supportTickets';
import './SellerSupportNewTicketPage.css';

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const SellerSupportNewTicketPage: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [recipientType, setRecipientType] = useState<'admin' | 'tecnico'>('admin');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Scrivi la tua richiesta.');
      return;
    }
    setSubmitting(true);
    try {
      await supportTicketsApi.createTicket({
        recipient_type: recipientType,
        message: trimmed,
      });
      navigate('/seller/supporto', { state: { ticketCreated: true } });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || 'Impossibile inviare la segnalazione. Riprova più tardi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`seller-support-new-ticket-page ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <header className="support-new-ticket-header">
        <button
          type="button"
          className="support-new-ticket-back"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
          <span>Supporto</span>
        </button>
        <h1 className="support-new-ticket-title">Apri Segnalazione</h1>
      </header>

      <main className="support-new-ticket-main">
        <motion.form
          onSubmit={handleSubmit}
          className="support-new-ticket-form"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Segmented control — destinatario */}
          <motion.div className="support-new-ticket-field" variants={itemVariants}>
            <label className="support-new-ticket-label">Destinatario</label>
            <div className="support-new-ticket-segment" role="group" aria-label="Seleziona destinatario">
              <button
                type="button"
                className={`support-new-ticket-segment-btn ${recipientType === 'admin' ? 'active' : ''}`}
                onClick={() => setRecipientType('admin')}
              >
                Amministrazione
              </button>
              <button
                type="button"
                className={`support-new-ticket-segment-btn ${recipientType === 'tecnico' ? 'active' : ''}`}
                onClick={() => setRecipientType('tecnico')}
              >
                Tecnico
              </button>
            </div>
          </motion.div>

          {/* Messaggio */}
          <motion.div className="support-new-ticket-field" variants={itemVariants}>
            <label htmlFor="message" className="support-new-ticket-label">
              Descrivi il problema o la richiesta
            </label>
            <textarea
              id="message"
              className="support-new-ticket-textarea"
              placeholder="Più dettagli fornisci, prima risolviamo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              required
            />
          </motion.div>

          {/* Allegati */}
          <motion.div className="support-new-ticket-field" variants={itemVariants}>
            <label className="support-new-ticket-label">Allegati <span className="support-label-optional">(opzionale)</span></label>
            <label className="support-new-ticket-upload-area">
              <Paperclip size={18} />
              <span>Seleziona file</span>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            {attachments.length > 0 && (
              <div className="support-new-ticket-attachments">
                {attachments.map((file, index) => (
                  <div key={index} className="support-new-ticket-attachment-item">
                    <Paperclip size={14} />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="support-new-ticket-attachment-remove"
                      onClick={() => removeAttachment(index)}
                      aria-label={`Rimuovi ${file.name}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              className="support-new-ticket-error"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            className="support-new-ticket-submit"
            disabled={submitting || !message.trim()}
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <span className="support-new-ticket-spinner" />
            ) : (
              <Send size={18} />
            )}
            <span>{submitting ? 'Invio in corso...' : 'Invia segnalazione'}</span>
          </motion.button>
        </motion.form>
      </main>
    </div>
  );
};

export default SellerSupportNewTicketPage;
